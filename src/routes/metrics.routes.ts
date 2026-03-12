import { FastifyInstance } from 'fastify';
import metricsService from '../services/metrics.service';

/**
 * Metrics and observability routes
 */
export default async function metricsRoutes(fastify: FastifyInstance) {
  /**
   * GET /metrics
   * Exporta métricas no formato Prometheus
   */
  fastify.get('/metrics', {
    schema: {
      response: {
        200: {
          type: 'string',
          description: 'Métricas no formato Prometheus',
        },
      },
      tags: ['Observability'],
      description: 'Exporta métricas da aplicação no formato Prometheus. Inclui métricas de HTTP requests, duração de requisições, status codes, cache hits/misses, database queries, scraper jobs e performance do sistema.',
      summary: 'Métricas Prometheus',
    },
  }, async (_request, reply) => {
    reply.type('text/plain');
    return metricsService.getMetrics();
  });
}
