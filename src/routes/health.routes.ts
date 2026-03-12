import { FastifyInstance } from 'fastify';

/**
 * Health check routes
 */
export default async function healthRoutes(fastify: FastifyInstance) {
  /**
   * GET /health
   * Retorna o status de saúde da aplicação
   */
  fastify.get('/health', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            phase: { type: 'string' },
          },
        },
      },
      tags: ['Health'],
      description: 'Verifica o status de saúde da aplicação',
      summary: 'Health check',
    },
  }, async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      phase: 'FASE 4 - API REST e Busca FTS Implementada',
    };
  });
}
