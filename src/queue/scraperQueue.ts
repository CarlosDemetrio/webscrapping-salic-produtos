import { Queue } from 'bullmq';
import redisConfig from '../config/redis';

// Interface para os dados do Job
export interface ScraperJobData {
  produtoId: string;
  produtoNome: string;
  tentativas?: number;
}

// Criação da fila de scraping
export const scraperQueue = new Queue<ScraperJobData>('scraper-queue', {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3, // Número de tentativas em caso de falha
    backoff: {
      type: 'exponential', // Backoff exponencial
      delay: 5000, // Delay inicial de 5 segundos
    },
    removeOnComplete: {
      count: 100, // Manter últimos 100 jobs completados
      age: 24 * 3600, // Manter por 24 horas
    },
    removeOnFail: {
      count: 200, // Manter últimos 200 jobs falhados
      age: 7 * 24 * 3600, // Manter por 7 dias
    },
  },
});

// Event listeners para monitoramento
scraperQueue.on('error', (err) => {
  console.error('Erro na fila:', err);
});

console.log(' Fila de scraping criada: scraper-queue');

export default scraperQueue;
