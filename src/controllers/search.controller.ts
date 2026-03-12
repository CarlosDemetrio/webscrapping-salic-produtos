import { FastifyRequest, FastifyReply } from 'fastify';
import searchService from '../services/search.service';
import { SearchQuery } from '../types/search.types';

/**
 * Controller para endpoints de busca
 * Segue o padrão MVC/Controller para separar lógica de apresentação
 */
export class SearchController {
  /**
   * GET /api/search
   * Busca itens orçamentários com Full Text Search
   */
  async search(
    request: FastifyRequest<{ Querystring: SearchQuery }>,
    reply: FastifyReply
  ) {
    const result = await searchService.search(request.query);
    return reply.code(200).send(result);
  }
}

export default new SearchController();
