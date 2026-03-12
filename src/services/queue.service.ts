import scraperQueue from '../queue/scraperQueue';

/**
 * Service para gerenciamento da fila de scraping
 */
export class QueueService {
  /**
   * Obtém estatísticas da fila
   */
  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      scraperQueue.getWaitingCount(),
      scraperQueue.getActiveCount(),
      scraperQueue.getCompletedCount(),
      scraperQueue.getFailedCount(),
      scraperQueue.getDelayedCount(),
    ]);

    return {
      queue: 'scraper-queue',
      counts: {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Enfileira um job de teste
   */
  async enqueueTestJob() {
    const job = await scraperQueue.add('test-scraper', {
      produtoId: 'TESTE-001',
      produtoNome: 'Produto de Teste - Fase 3',
    });

    return {
      success: true,
      message: 'Job de teste enfileirado com sucesso',
      jobId: job.id,
      data: job.data,
    };
  }
}

export default new QueueService();
