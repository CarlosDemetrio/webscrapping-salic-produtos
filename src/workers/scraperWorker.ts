import { Worker, Job } from 'bullmq';
import redisConfig from '../config/redis';
import { ScraperJobData } from '../queue/scraperQueue';
import prisma from '../config/database';
import { Decimal } from '@prisma/client/runtime/library';

// Interface para os dados extraídos do scraper
interface ItemExtraido {
  produto: string;
  item: string;
  unidade: string;
  uf: string;
  cidade: string;
  valor_minimo: number;
  valor_medio: number;
  valor_maximo: number;
  caminho_referencia?: string;
}

// Configuração de concorrência - quantos jobs simultâneos o worker pode processar
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '3', 10);

// Função placeholder para o scraper (você colará seu código Selenium/Puppeteer aqui)
async function executarScraperSelenium(
  produtoId: string,
  produtoNome: string
): Promise<ItemExtraido[]> {
  console.log(` [PLACEHOLDER] Iniciando scraping para: ${produtoNome} (ID: ${produtoId})`);

  // AQUI VOCÊ COLARÁ SEU CÓDIGO DO SELENIUM/PUPPETEER
  // Exemplo de retorno esperado:
  // return [
  //   {
  //     produto: 'Nome do Produto',
  //     item: 'Descrição do item',
  //     unidade: 'UN',
  //     uf: 'SP',
  //     cidade: 'São Paulo',
  //     valor_minimo: 10.50,
  //     valor_medio: 15.00,
  //     valor_maximo: 20.00,
  //     caminho_referencia: 'http://...',
  //   }
  // ];

  // Simulação de delay (remover quando implementar)
  await new Promise(resolve => setTimeout(resolve, 2000));

  return []; // Retornar array vazio por enquanto
}

/**
 * Função para fazer Upsert massivo dos itens extraídos
 * Atualiza se o item já existe (baseado na constraint unique_item_location)
 * ou cria um novo registro se não existir
 */
async function upsertItensOrcamentarios(itens: ItemExtraido[]): Promise<number> {
  if (itens.length === 0) {
    console.log('   Nenhum item para persistir');
    return 0;
  }

  console.log(`   Iniciando upsert de ${itens.length} itens no banco de dados...`);

  let sucessos = 0;
  let erros = 0;

  // Processar em lotes para melhor performance
  const BATCH_SIZE = 50;

  for (let i = 0; i < itens.length; i += BATCH_SIZE) {
    const lote = itens.slice(i, i + BATCH_SIZE);

    // Processar cada item do lote em paralelo
    const resultados = await Promise.allSettled(
      lote.map(async (item) => {
        try {
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
          return true;
        } catch (error) {
          console.error('   Erro ao fazer upsert do item:', error);
          throw error;
        }
      })
    );

    // Contar sucessos e erros
    resultados.forEach((result) => {
      if (result.status === 'fulfilled') {
        sucessos++;
      } else {
        erros++;
        console.error('   Item falhou:', result.reason);
      }
    });

    console.log(`   Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${sucessos}/${i + lote.length} itens processados`);
  }

  console.log(`   Upsert concluído: ${sucessos} sucessos, ${erros} erros`);
  return sucessos;
}

// Função de processamento do job
async function processScraperJob(job: Job<ScraperJobData>) {
  const { produtoId, produtoNome } = job.data;
  const startTime = Date.now();

  try {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(` Worker processando job ${job.id}: ${produtoNome}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Atualizar progresso: 10% - Iniciando
    await job.updateProgress(10);

    // PASSO 1: Executar o scraper
    console.log(` [1/3] Executando scraper...`);
    const itensExtraidos = await executarScraperSelenium(produtoId, produtoNome);
    console.log(` Extração concluída: ${itensExtraidos.length} itens encontrados`);

    // Atualizar progresso: 50% - Dados extraídos
    await job.updateProgress(50);

    // PASSO 2: Persistir no banco de dados (Upsert massivo)
    console.log(` [2/3] Persistindo dados no banco...`);
    const itensSalvos = await upsertItensOrcamentarios(itensExtraidos);

    // Atualizar progresso: 90% - Dados salvos
    await job.updateProgress(90);

    // PASSO 3: Finalização
    const tempoDecorrido = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(` [3/3] Job concluído com sucesso!`);
    console.log(` Tempo total: ${tempoDecorrido}s`);
    console.log(` Itens extraídos: ${itensExtraidos.length}`);
    console.log(` Itens salvos: ${itensSalvos}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Atualizar progresso: 100% - Concluído
    await job.updateProgress(100);

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
    console.error(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.error(` ERRO no job ${job.id} (${produtoNome})`);
    console.error(` Tempo até falha: ${tempoDecorrido}s`);
    console.error(` Erro:`, error);
    console.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Lançar erro para o BullMQ gerenciar retries
    // O BullMQ irá automaticamente retentar o job conforme configurado na queue
    throw error;
  }
}

// Criar o Worker
export const scraperWorker = new Worker<ScraperJobData>(
  'scraper-queue',
  processScraperJob,
  {
    connection: redisConfig,
    concurrency: CONCURRENCY, // Processar N jobs simultaneamente
    limiter: {
      max: 10, // Máximo de 10 jobs
      duration: 1000, // Por segundo
    },
  }
);

// Event listeners para monitoramento
scraperWorker.on('completed', (job) => {
  console.log(` Job ${job.id} completado: ${job.data.produtoNome}`);
});

scraperWorker.on('failed', (job, err) => {
  if (job) {
    console.error(`Job ${job.id} falhou após ${job.attemptsMade} tentativas:`, err.message);
  }
});

scraperWorker.on('error', (err) => {
  console.error('Erro no worker:', err);
});

scraperWorker.on('stalled', (jobId) => {
  console.warn(`Job ${jobId} está travado (stalled)`);
});

console.log(` Worker iniciado com concorrência: ${CONCURRENCY}`);

export default scraperWorker;
