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

  /**
   * POST /api/scraper/trigger
   * Dispara o scraping completo de todos os produtos (protegido por API Key)
   */
  fastify.post('/api/scraper/trigger', {
    schema: {
      tags: ['Queue'],
      description: 'Dispara o scraping completo de todos os 53 produtos (requer X-API-Key)',
      summary: 'Trigger scraping completo',
      headers: {
        type: 'object',
        properties: {
          'x-api-key': { type: 'string', description: 'Secret key para autorização' }
        },
        required: ['x-api-key']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            batchId: { type: 'string' },
            timestamp: { type: 'string' },
            totalProdutos: { type: 'number' },
            jobsEnfileirados: { type: 'array' },
            tempoSegundos: { type: 'number' },
          }
        }
      }
    },
    ...enqueueRateLimit,
  }, queueController.triggerScraping.bind(queueController));

  /**
   * GET /api/scraper/batch/:batchId
   * Obtém o status de um batch específico
   */
  fastify.get('/api/scraper/batch/:batchId', {
    schema: {
      tags: ['Queue'],
      description: 'Consulta o progresso de um batch de scraping',
      summary: 'Status do batch',
      params: {
        type: 'object',
        properties: {
          batchId: { type: 'string', description: 'ID do batch' }
        },
        required: ['batchId']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            batchId: { type: 'string' },
            status: { type: 'object' },
            jobs: { type: 'object' },
            timestamp: { type: 'string' },
          }
        }
      }
    },
  }, queueController.getBatchStatus.bind(queueController));
}
