import { Worker, Job } from 'bullmq';
import redisConfig from '../config/redis';
import { ScraperJobData } from '../queue/scraperQueue';

// Configuração de concorrência - quantos jobs simultâneos o worker pode processar
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '3', 10);

// Função placeholder para o scraper (você colará seu código Selenium/Puppeteer aqui)
async function executarScraperSelenium(produtoId: string, produtoNome: string) {
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

// Função de processamento do job
async function processScraperJob(job: Job<ScraperJobData>) {
  const { produtoId, produtoNome } = job.data;

  try {
    console.log(` Worker processando job ${job.id}: ${produtoNome}`);

    // Atualizar progresso: 10% - Iniciando
    await job.updateProgress(10);

    // Executar o scraper (placeholder por enquanto)
    const itensExtraidos = await executarScraperSelenium(produtoId, produtoNome);

    // Atualizar progresso: 70% - Dados extraídos
    await job.updateProgress(70);

    // TODO: FASE 3 - Aqui implementaremos o Upsert massivo no banco
    console.log(` Extração concluída: ${itensExtraidos.length} itens encontrados`);

    // Atualizar progresso: 100% - Concluído
    await job.updateProgress(100);

    return {
      success: true,
      produtoNome,
      itensCount: itensExtraidos.length,
    };
  } catch (error) {
    console.error(` Erro ao processar job ${job.id}:`, error);
    throw error; // Lançar erro para o BullMQ gerenciar retries
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
