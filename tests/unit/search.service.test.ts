import { SearchService } from '../../src/services/search.service';
import itemRepository from '../../src/repositories/item.repository';
import { ValidationError } from '../../src/errors/AppError';
import {SearchFilters, SearchQuery} from '../../src/types/search.types';

// Mock do repository
jest.mock('../../src/repositories/item.repository', () => ({
  __esModule: true,
  default: {
    searchItems: jest.fn(),
    countItems: jest.fn(),
  },
}));

describe('SearchService', () => {
  let service: SearchService;
  const mockRepository = itemRepository as jest.Mocked<typeof itemRepository>;

  beforeEach(() => {
    service = new SearchService();
    jest.clearAllMocks();
  });

  const mockSearchResults = [
    {
      id: '1',
      produto: 'Produto 1',
      item: 'Item 1',
      unidade: 'UN',
      uf: 'SP',
      cidade: 'São Paulo',
      valor_minimo: 100,
      valor_medio: 150,
      valor_maximo: 200,
      caminho_referencia: '/ref/1',
      data_extracao: new Date('2024-01-01'),
      relevancia: 0.9,
    },
    {
      id: '2',
      produto: 'Produto 2',
      item: 'Item 2',
      unidade: 'KG',
      uf: 'RJ',
      cidade: 'Rio de Janeiro',
      valor_minimo: 50,
      valor_medio: 75,
      valor_maximo: 100,
      caminho_referencia: '/ref/2',
      data_extracao: new Date('2024-01-02'),
      relevancia: 0.8,
    },
  ];

  describe('search', () => {
    it('should search with search term', async () => {
      mockRepository.searchItems.mockResolvedValue(mockSearchResults);
      mockRepository.countItems.mockResolvedValue(2);

      const query: SearchQuery = { q: 'teste' };
      const result = await service.search(query);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSearchResults);
      expect(result.filters.searchTerm).toBe('teste');
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);

      // Verifica se chamou o repository com os filtros corretos
      const callArgs = mockRepository.searchItems.mock.calls[0][0];
      expect(callArgs.searchTerm).toBe('teste');
      expect(callArgs.uf).toBe('');
      expect(callArgs.page).toBe(1);
      expect(callArgs.limit).toBe(20);
      expect(callArgs.offset).toBe(0);
    });

    it('should search with UF filter', async () => {
      mockRepository.searchItems.mockResolvedValue([mockSearchResults[0]]);
      mockRepository.countItems.mockResolvedValue(1);

      const query: SearchQuery = { uf: 'sp' };
      const result = await service.search(query);

      expect(result.success).toBe(true);
      expect(result.filters.uf).toBe('SP'); // Verifica uppercase
      expect(mockRepository.searchItems.mock.calls[0][0].uf).toBe('SP');
    });

    it('should search with cidade filter', async () => {
      mockRepository.searchItems.mockResolvedValue([mockSearchResults[0]]);
      mockRepository.countItems.mockResolvedValue(1);

      const query: SearchQuery = { cidade: 'São Paulo' };
      const result = await service.search(query);

      expect(result.filters.cidade).toBe('São Paulo');
    });

    it('should search with all filters', async () => {
      mockRepository.searchItems.mockResolvedValue(mockSearchResults);
      mockRepository.countItems.mockResolvedValue(2);

      const query: SearchQuery = { q: 'produto', uf: 'SP', cidade: 'São Paulo' };
      const result = await service.search(query);

      expect(result.filters.searchTerm).toBe('produto');
      expect(result.filters.uf).toBe('SP');
      expect(result.filters.cidade).toBe('São Paulo');
    });

    it('should throw ValidationError when no search criteria provided', async () => {
      await expect(service.search({})).rejects.toThrow(ValidationError);
      await expect(service.search({})).rejects.toThrow(
        'Informe pelo menos um critério de busca: q, uf ou cidade'
      );
    });

    it('should trim whitespace from search parameters', async () => {
      mockRepository.searchItems.mockResolvedValue([]);
      mockRepository.countItems.mockResolvedValue(0);

      await service.search({ q: '  teste  ', uf: '  sp  ', cidade: '  São Paulo  ' });

      const callArgs = mockRepository.searchItems.mock.calls[0][0];
      expect(callArgs.searchTerm).toBe('teste');
      expect(callArgs.uf).toBe('SP');
      expect(callArgs.cidade).toBe('São Paulo');
    });

    it('should handle pagination correctly', async () => {
      mockRepository.searchItems.mockResolvedValue(mockSearchResults);
      mockRepository.countItems.mockResolvedValue(100);

      const result = await service.search({ q: 'teste', page: '3', limit: '10' });

      expect(result.pagination.page).toBe(3);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(100);
      expect(result.pagination.totalPages).toBe(10);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(true);

      const callArgs = mockRepository.searchItems.mock.calls[0][0];
      expect(callArgs.offset).toBe(20); // (page - 1) * limit
    });

    it('should limit page size to maximum of 100', async () => {
      mockRepository.searchItems.mockResolvedValue([]);
      mockRepository.countItems.mockResolvedValue(0);

      await service.search({ q: 'teste', limit: '500' });

      expect(mockRepository.searchItems.mock.calls[0][0].limit).toBe(100);
    });

    it('should enforce minimum values for page and limit', async () => {
      mockRepository.searchItems.mockResolvedValue([]);
      mockRepository.countItems.mockResolvedValue(0);

      await service.search({ q: 'teste', page: '0', limit: '0' });

      const callArgs = mockRepository.searchItems.mock.calls[0][0];
      expect(callArgs.page).toBe(1);
      expect(callArgs.limit).toBe(1);
    });

    it('should handle invalid pagination parameters', async () => {
      mockRepository.searchItems.mockResolvedValue([]);
      mockRepository.countItems.mockResolvedValue(0);

      await service.search({ q: 'teste', page: 'invalid', limit: 'invalid' });

      const callArgs = mockRepository.searchItems.mock.calls[0][0];
      expect(callArgs.page).toBe(1); // default
      expect(callArgs.limit).toBe(20); // default
    });

    it('should calculate pagination metadata correctly', async () => {
      mockRepository.searchItems.mockResolvedValue([]);
      mockRepository.countItems.mockResolvedValue(20);

      // Última página
      const lastPage = await service.search({ q: 'teste', page: '2', limit: '10' });
      expect(lastPage.pagination.hasNext).toBe(false);
      expect(lastPage.pagination.hasPrev).toBe(true);

      // Primeira página
      mockRepository.searchItems.mockResolvedValue([]);
      mockRepository.countItems.mockResolvedValue(20);
      const firstPage = await service.search({ q: 'teste', page: '1', limit: '10' });
      expect(firstPage.pagination.hasNext).toBe(true);
      expect(firstPage.pagination.hasPrev).toBe(false);
    });

    it('should handle empty results', async () => {
      mockRepository.searchItems.mockResolvedValue([]);
      mockRepository.countItems.mockResolvedValue(0);

      const result = await service.search({ q: 'nonexistent' });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('should return null for missing filters in response', async () => {
      mockRepository.searchItems.mockResolvedValue([]);
      mockRepository.countItems.mockResolvedValue(0);

      const result = await service.search({ q: 'teste' });

      expect(result.filters.searchTerm).toBe('teste');
      expect(result.filters.uf).toBeNull();
      expect(result.filters.cidade).toBeNull();
    });
  });

  describe('validateSearchCriteria', () => {
    it('should not throw when any criteria is provided', () => {
      const validFilters: SearchFilters[] = [
        { searchTerm: 'test', uf: '', cidade: '', page: 1, limit: 20, offset: 0 },
        { searchTerm: '', uf: 'SP', cidade: '', page: 1, limit: 20, offset: 0 },
        { searchTerm: '', uf: '', cidade: 'São Paulo', page: 1, limit: 20, offset: 0 },
      ];

      validFilters.forEach(filters => {
        expect(() => service.validateSearchCriteria(filters)).not.toThrow();
      });
    });

    it('should throw when no criteria is provided', () => {
      const filters: SearchFilters = {
        searchTerm: '',
        uf: '',
        cidade: '',
        page: 1,
        limit: 20,
        offset: 0,
      };

      expect(() => service.validateSearchCriteria(filters)).toThrow(ValidationError);
    });
  });

  describe('error handling', () => {
    it('should propagate repository errors', async () => {
      mockRepository.searchItems.mockRejectedValue(new Error('Database error'));
      mockRepository.countItems.mockResolvedValue(0);

      await expect(service.search({ q: 'teste' })).rejects.toThrow('Database error');
    });
  });
});
