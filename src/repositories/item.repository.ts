import prisma from '../config/database';
import { SearchFilters, SearchResult } from '../types/search.types';

/**
 * Repository para acesso aos dados de ItemOrcamentario
 * Segue o padrão Repository para isolar lógica de acesso a dados
 */
export class ItemRepository {
  /**
   * Busca itens usando Full Text Search com pg_trgm
   */
  async searchItems(filters: SearchFilters): Promise<SearchResult[]> {
    const { searchTerm, uf, cidade, limit, offset } = filters;

    const { whereClause, params } = this.buildWhereClause(searchTerm, uf, cidade);
    const orderBy = this.buildOrderBy(searchTerm);

    const query = `
      SELECT 
        id,
        produto,
        item,
        unidade,
        uf,
        cidade,
        valor_minimo,
        valor_medio,
        valor_maximo,
        caminho_referencia,
        data_extracao,
        ${searchTerm ? `
        GREATEST(
          similarity(produto, $1),
          similarity(item, $1),
          similarity(cidade, $1)
        ) as relevancia` : '1.0 as relevancia'}
      FROM itens_orcamentarios
      ${whereClause}
      ${orderBy}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;

    const queryParams = [...params, limit, offset];
    const results = await prisma.$queryRawUnsafe<any[]>(query, ...queryParams);

    return this.mapResults(results);
  }

  /**
   * Conta o total de itens que correspondem aos filtros
   */
  async countItems(filters: SearchFilters): Promise<number> {
    const { searchTerm, uf, cidade } = filters;
    const { whereClause, params } = this.buildWhereClause(searchTerm, uf, cidade);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM itens_orcamentarios
      ${whereClause}
    `;

    const result = await prisma.$queryRawUnsafe<[{ total: bigint }]>(
      countQuery,
      ...params
    );

    return Number(result[0].total);
  }

  /**
   * Constrói a cláusula WHERE dinamicamente baseada nos filtros
   */
  private buildWhereClause(
    searchTerm: string,
    uf: string,
    cidade: string
  ): { whereClause: string; params: any[] } {
    const whereConditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Busca textual usando similarity (trigramas)
    if (searchTerm) {
      whereConditions.push(
        `(
          similarity(produto, $${paramIndex}) > 0.3 OR
          similarity(item, $${paramIndex}) > 0.3 OR
          similarity(cidade, $${paramIndex}) > 0.3 OR
          produto ILIKE $${paramIndex + 1} OR
          item ILIKE $${paramIndex + 1}
        )`
      );
      params.push(searchTerm, `%${searchTerm}%`);
      paramIndex += 2;
    }

    // Filtro por UF (exato)
    if (uf) {
      whereConditions.push(`uf = $${paramIndex}`);
      params.push(uf);
      paramIndex++;
    }

    // Filtro por cidade (similarity ou ILIKE)
    if (cidade) {
      whereConditions.push(
        `(similarity(cidade, $${paramIndex}) > 0.5 OR cidade ILIKE $${paramIndex + 1})`
      );
      params.push(cidade, `%${cidade}%`);
      paramIndex += 2;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    return { whereClause, params };
  }

  /**
   * Constrói a cláusula ORDER BY
   */
  private buildOrderBy(searchTerm: string): string {
    if (searchTerm) {
      return `ORDER BY 
        GREATEST(
          similarity(produto, $1),
          similarity(item, $1),
          similarity(cidade, $1)
        ) DESC,
        data_extracao DESC`;
    }
    return `ORDER BY data_extracao DESC`;
  }

  /**
   * Mapeia os resultados do banco para o tipo SearchResult
   */
  private mapResults(results: any[]): SearchResult[] {
    return results.map((item) => ({
      ...item,
      valor_minimo: Number(item.valor_minimo),
      valor_medio: Number(item.valor_medio),
      valor_maximo: Number(item.valor_maximo),
      relevancia: Number(item.relevancia),
    }));
  }
}

export default new ItemRepository();
