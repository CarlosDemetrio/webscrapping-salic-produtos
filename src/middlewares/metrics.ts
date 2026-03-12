import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import metricsService from '../services/metrics.service';

export async function registerMetrics(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', async (request: FastifyRequest) => {
    request.startTime = Date.now();
  });

  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const duration = (Date.now() - (request.startTime || Date.now())) / 1000;
    const route = request.routeOptions?.url || request.url;

    metricsService.httpRequestDuration.observe(
      {
        method: request.method,
        route,
        status_code: reply.statusCode,
      },
      duration
    );

    metricsService.httpRequestTotal.inc({
      method: request.method,
      route,
      status_code: reply.statusCode,
    });
  });
}

declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
  }
}
