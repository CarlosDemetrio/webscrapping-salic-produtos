/**
 * Tipos e interfaces para busca de itens orçamentários
 */

export interface SearchQuery {
  q?: string;
  uf?: string;
  cidade?: string;
  page?: string;
  limit?: string;
}

export interface SearchFilters {
  searchTerm: string;
  uf: string;
  cidade: string;
  page: number;
  limit: number;
  offset: number;
}

export interface SearchResult {
  id: string;
  produto: string;
  item: string;
  unidade: string;
  uf: string;
  cidade: string;
  valor_minimo: number;
  valor_medio: number;
  valor_maximo: number;
  caminho_referencia: string | null;
  data_extracao: Date;
  relevancia: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SearchResponse {
  success: boolean;
  data: SearchResult[];
  pagination: PaginationMeta;
  filters: {
    searchTerm: string | null;
    uf: string | null;
    cidade: string | null;
  };
}
