import { FastifyInstance } from 'fastify';
import healthRoutes from './health.routes';
import queueRoutes from './queue.routes';
import searchRoutes from './search.routes';

/**
 * Registra todas as rotas da aplicação
 */
export default async function routes(fastify: FastifyInstance) {
  await fastify.register(healthRoutes);
  await fastify.register(queueRoutes);
  await fastify.register(searchRoutes);
}
