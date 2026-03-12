import { FastifyInstance } from 'fastify';
import queueController from '../controllers/queue.controller';
import { queueStatusSchema, enqueueResponseSchema } from '../schemas/api.schemas';
import { enqueueRateLimit } from '../middlewares/security';

/**
 * Queue-related routes
 */
export default async function queueRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/queue/status
   * Retorna estatísticas da fila
   */
  fastify.get('/api/queue/status', {
    schema: {
      response: queueStatusSchema,
      tags: ['Queue'],
      description: 'Obtém estatísticas da fila de scraping',
      summary: 'Status da fila',
    },
  }, queueController.getStatus.bind(queueController));

  /**
   * POST /api/test/enqueue
   * Enfileira um job de teste
   */
  fastify.post('/api/test/enqueue', {
    schema: {
      response: enqueueResponseSchema,
      tags: ['Queue'],
      description: 'Enfileira um job de teste para verificar o sistema',
      summary: 'Job de teste',
    },
    ...enqueueRateLimit,
  }, queueController.enqueueTest.bind(queueController));
}
