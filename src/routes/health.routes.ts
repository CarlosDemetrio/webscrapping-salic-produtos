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
            status: { type: 'string', example: 'ok' },
            timestamp: { type: 'string', format: 'date-time', example: '2026-03-12T10:30:00.000Z' },
            phase: { type: 'string', example: 'FASE 4 - API REST e Busca FTS Implementada' },
          },
        },
      },
      tags: ['Health'],
      description: 'Verifica o status de saúde da aplicação e retorna informações sobre a fase atual de implementação',
      summary: 'Health check da aplicação',
    },
  }, async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      phase: 'FASE 4 - API REST e Busca FTS Implementada',
    };
  });
}
