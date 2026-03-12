import { FastifyInstance } from 'fastify';
import searchController from '../controllers/search.controller';
import { searchQuerySchema, searchResponseSchema } from '../schemas/api.schemas';
import { searchRateLimit } from '../middlewares/security';

/**
 * Search-related routes
 */
export default async function searchRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/search
   * Busca itens orçamentários com Full Text Search
   *
   * Query params:
   * - q: termo de busca (opcional)
   * - uf: filtro por estado (opcional)
   * - cidade: filtro por cidade (opcional)
   * - page: número da página (padrão: 1)
   * - limit: itens por página (padrão: 20, max: 100)
   */
  fastify.get('/api/search', {
    schema: {
      ...searchQuerySchema,
      response: searchResponseSchema,
      tags: ['Search'],
      description: 'Busca itens orçamentários usando Full Text Search',
      summary: 'Buscar itens',
    },
    ...searchRateLimit,
  }, searchController.search.bind(searchController));
}
