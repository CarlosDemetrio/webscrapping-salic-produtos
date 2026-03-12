import itemRepository from '../repositories/item.repository';
import { SearchQuery, SearchResponse, SearchFilters, PaginationMeta } from '../types/search.types';
import { ValidationError } from '../errors/AppError';

/**
 * Service para lógica de negócio relacionada à busca
 * Segue o padrão Service Layer para isolar regras de negócio
 */
export class SearchService {
  private parseSearchQuery(query: SearchQuery): SearchFilters {
    const searchTerm = query.q?.trim() || '';
    const uf = query.uf?.trim().toUpperCase() || '';
    const cidade = query.cidade?.trim() || '';

    const parsedPage = parseInt(query.page || '1', 10);
    const page = isNaN(parsedPage) ? 1 : Math.max(1, parsedPage);

    const parsedLimit = parseInt(query.limit || '20', 10);
    const limit = isNaN(parsedLimit) ? 20 : Math.min(100, Math.max(1, parsedLimit));

    const offset = (page - 1) * limit;

    return {
      searchTerm,
      uf,
      cidade,
      page,
      limit,
      offset,
    };
  }

  validateSearchCriteria(filters: SearchFilters): void {
    const { searchTerm, uf, cidade } = filters;

    if (!searchTerm && !uf && !cidade) {
      throw new ValidationError('Informe pelo menos um critério de busca: q, uf ou cidade');
    }
  }

  private calculatePagination(
    page: number,
    limit: number,
    total: number
  ): PaginationMeta {
    const totalPages = Math.ceil(total / limit);

    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * Executa a busca de itens orçamentários
   */
  async search(query: SearchQuery): Promise<SearchResponse> {
    // Parse e validação
    const filters = this.parseSearchQuery(query);
    this.validateSearchCriteria(filters);

    // Buscar dados e contagem em paralelo
    const [items, total] = await Promise.all([
      itemRepository.searchItems(filters),
      itemRepository.countItems(filters),
    ]);

    // Calcular paginação
    const pagination = this.calculatePagination(filters.page, filters.limit, total);

    // Montar resposta
    return {
      success: true,
      data: items,
      pagination,
      filters: {
        searchTerm: filters.searchTerm || null,
        uf: filters.uf || null,
        cidade: filters.cidade || null,
      },
    };
  }
}

export default new SearchService();
