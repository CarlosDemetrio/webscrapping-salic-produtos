import { Worker, Job } from 'bullmq';
import redisConfig from '../config/redis';
import { ScraperJobData } from '../queue/scraperQueue';
import prisma from '../config/database';
import { Decimal } from '@prisma/client/runtime/library';
import { BrowserService } from '../scraper/services/browser.service';
import { ProdutoScraperService } from '../scraper/services/produto.scraper.service';
import { SCRAPER_CONFIG } from '../scraper/config/scraper.config';
import { ItemOrcamentarioDTO } from '../types/item.types';
import { ItemExtraido as ItemExtraidoScraper } from '../scraper/types/scraper.types';
import metricsService from '../services/metrics.service';
import cacheService from '../services/cache.service';

const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '3', 10);

class ItemMapper {
  static scraperToDTO(item: ItemExtraidoScraper, baseUrl: string): ItemOrcamentarioDTO {
    return {
      produto: item.produto,
      item: item.item,
      unidade: item.unidade,
      uf: item.uf,
      cidade: item.cidade,
      valor_minimo: item.minimo,
      valor_medio: item.medio,
      valor_maximo: item.maximo,
      caminho_referencia: baseUrl,
    };
  }

  static scraperListToDTO(itens: ItemExtraidoScraper[], baseUrl: string): ItemOrcamentarioDTO[] {
    return itens.map(item => this.scraperToDTO(item, baseUrl));
  }
}

async function executarScraperSelenium(
  produtoId: string,
  produtoNome: string
): Promise<ItemOrcamentarioDTO[]> {
  console.log(`[SCRAPER] Iniciando extracao para: ${produtoNome} (ID: ${produtoId})`);

  const browserService = new BrowserService();
  let driver;

  try {
    driver = await browserService.criarNavegador();
    console.log('[SCRAPER] Navegador iniciado');

    const produtoScraperService = new ProdutoScraperService(
      driver,
      SCRAPER_CONFIG.baseUrl
    );

    const itensExtraidos = await produtoScraperService.scrapeProduto({
      id: produtoId,
      nome: produtoNome,
    });

    console.log(`[SCRAPER] Extracao concluida: ${itensExtraidos.length} itens`);

    return ItemMapper.scraperListToDTO(itensExtraidos, SCRAPER_CONFIG.baseUrl);

  } catch (error) {
    console.error('[SCRAPER] Erro durante extracao:', error);
    throw error;
  } finally {
    if (driver) {
      try {
        await browserService.fecharNavegador(driver);
        console.log('[SCRAPER] Navegador fechado');
      } catch (closeError) {
        console.error('[SCRAPER] Erro ao fechar navegador:', closeError);
      }
    }
  }
}

async function upsertItensOrcamentarios(itens: ItemOrcamentarioDTO[]): Promise<number> {
  if (itens.length === 0) {
    console.log('Nenhum item para persistir');
    return 0;
  }

  console.log(`Iniciando upsert de ${itens.length} itens no banco de dados`);

  let sucessos = 0;
  let erros = 0;

  const BATCH_SIZE = 50;

  for (let i = 0; i < itens.length; i += BATCH_SIZE) {
    const lote = itens.slice(i, i + BATCH_SIZE);

    const resultados = await Promise.allSettled(
      lote.map(async (item) => {
        await prisma.itemOrcamentario.upsert({
          where: {
            unique_item_location: {
              produto: item.produto,
              item: item.item,
              uf: item.uf,
              cidade: item.cidade,
            },
          },
          update: {
            unidade: item.unidade,
            valor_minimo: new Decimal(item.valor_minimo),
            valor_medio: new Decimal(item.valor_medio),
            valor_maximo: new Decimal(item.valor_maximo),
            caminho_referencia: item.caminho_referencia,
            data_extracao: new Date(),
          },
          create: {
            produto: item.produto,
            item: item.item,
            unidade: item.unidade,
            uf: item.uf,
            cidade: item.cidade,
            valor_minimo: new Decimal(item.valor_minimo),
            valor_medio: new Decimal(item.valor_medio),
            valor_maximo: new Decimal(item.valor_maximo),
            caminho_referencia: item.caminho_referencia,
            data_extracao: new Date(),
          },
        });
      })
    );

    resultados.forEach((result) => {
      if (result.status === 'fulfilled') {
        sucessos++;
      } else {
        erros++;
        console.error('Item falhou:', result.reason);
      }
    });

    console.log(`Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${sucessos}/${i + lote.length} itens processados`);
  }

  console.log(`Upsert concluido: ${sucessos} sucessos, ${erros} erros`);
  return sucessos;
}

async function processScraperJob(job: Job<ScraperJobData>) {
  const { produtoId, produtoNome } = job.data;
  const startTime = Date.now();

  try {
    console.log(`Worker processando job ${job.id}: ${produtoNome}`);

    await job.updateProgress(10);

    console.log('[1/3] Executando scraper');
    const itensExtraidos = await executarScraperSelenium(produtoId, produtoNome);
    console.log(`Extracao concluida: ${itensExtraidos.length} itens encontrados`);

    await job.updateProgress(50);

    console.log('[2/3] Persistindo dados no banco');
    const itensSalvos = await upsertItensOrcamentarios(itensExtraidos);

    await job.updateProgress(90);

    const tempoDecorrido = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('[3/3] Job concluido com sucesso');
    console.log(`Tempo total: ${tempoDecorrido}s`);
    console.log(`Itens extraidos: ${itensExtraidos.length}`);
    console.log(`Itens salvos: ${itensSalvos}`);

    await job.updateProgress(100);

    metricsService.scraperJobsTotal.inc({ status: 'completed' });
    metricsService.scraperJobDuration.observe(
      { job_type: 'produto_scrape' },
      parseFloat(tempoDecorrido)
    );

    await cacheService.invalidateSearchCache();

    return {
      success: true,
      produtoId,
      produtoNome,
      itensExtraidos: itensExtraidos.length,
      itensSalvos,
      tempoSegundos: parseFloat(tempoDecorrido),
    };
  } catch (error) {
    const tempoDecorrido = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`ERRO no job ${job.id} (${produtoNome})`);
    console.error(`Tempo ate falha: ${tempoDecorrido}s`);
    console.error('Erro:', error);

    metricsService.scraperJobsTotal.inc({ status: 'failed' });
    metricsService.scraperJobsFailed.inc({
      error_type: error instanceof Error ? error.name : 'unknown'
    });

    throw error;
  }
}

export const scraperWorker = new Worker<ScraperJobData>(
  'scraper-queue',
  processScraperJob,
  {
    connection: redisConfig,
    concurrency: CONCURRENCY,
    limiter: {
      max: 10,
      duration: 1000,
    },
  }
);

scraperWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completado: ${job.data.produtoNome}`);
});

scraperWorker.on('failed', (job, err) => {
  if (job) {
    console.error(`Job ${job.id} falhou apos ${job.attemptsMade} tentativas:`, err.message);
  }
});

scraperWorker.on('error', (err) => {
  console.error('Erro no worker:', err);
});

scraperWorker.on('stalled', (jobId) => {
  console.warn(`Job ${jobId} esta travado (stalled)`);
});

console.log(`Worker iniciado com concorrencia: ${CONCURRENCY}`);

export default scraperWorker;
