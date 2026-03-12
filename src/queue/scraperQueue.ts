import { Queue } from 'bullmq';
import redisConfig from '../config/redis';

export interface ScraperJobData {
  produtoId: string;
  produtoNome: string;
  tentativas?: number;
}

export const scraperQueue = new Queue<ScraperJobData>('scraper-queue', {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 100,
      age: 24 * 3600,
    },
    removeOnFail: {
      count: 200,
      age: 7 * 24 * 3600,
    },
  },
});

scraperQueue.on('error', (err) => {
  console.error('Erro na fila:', err);
});

export default scraperQueue;
