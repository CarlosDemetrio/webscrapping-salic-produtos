import { FastifyRequest, FastifyReply } from 'fastify';
import queueService from '../services/queue.service';

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
}

export default new QueueController();
