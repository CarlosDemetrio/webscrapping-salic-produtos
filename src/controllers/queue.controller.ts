import { FastifyRequest, FastifyReply } from 'fastify';
import queueService from '../services/queue.service';
import { AppError } from '../errors/AppError';

/**
 * Controller para endpoints da fila
 */
export class QueueController {
  /**
   * GET /api/queue/status
   * Retorna estatísticas da fila
   */
  async getStatus(_request: FastifyRequest, reply: FastifyReply) {
    const stats = await queueService.getQueueStats();
    return reply.code(200).send(stats);
  }

  /**
   * POST /api/test/enqueue
   * Enfileira um job de teste
   */
  async enqueueTest(_request: FastifyRequest, reply: FastifyReply) {
    const result = await queueService.enqueueTestJob();
    return reply.code(200).send(result);
  }

  /**
   * POST /api/scraper/trigger
   * Dispara o scraping completo de todos os produtos (protegido por secret key)
   */
  async triggerScraping(request: FastifyRequest, reply: FastifyReply) {
    // Validar secret key
    const secretKey = request.headers['x-api-key'] as string;
    const expectedKey = process.env.SCRAPER_SECRET_KEY;

    if (!expectedKey) {
      throw new AppError('SCRAPER_SECRET_KEY não configurada no servidor', 500);
    }

    if (!secretKey || secretKey !== expectedKey) {
      throw new AppError('Unauthorized: Invalid API Key', 401);
    }

    // Disparar o scraping
    const result = await queueService.triggerFullScraping('manual-api');
    return reply.code(200).send(result);
  }

  /**
   * GET /api/scraper/batch/:batchId
   * Obtém o status de um batch específico
   */
  async getBatchStatus(
    request: FastifyRequest<{ Params: { batchId: string } }>,
    reply: FastifyReply
  ) {
    const { batchId } = request.params;
    const status = await queueService.getBatchStatus(batchId);
    return reply.code(200).send(status);
  }
}

export default new QueueController();
