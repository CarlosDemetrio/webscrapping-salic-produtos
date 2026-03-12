import { ItemRepository } from '../../src/repositories/item.repository';
import prisma from '../../src/config/database';
import { SearchFilters, SearchResult } from '../../src/types/search.types';

jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: {
    $queryRawUnsafe: jest.fn(),
  },
}));

describe('ItemRepository', () => {
  let repository: ItemRepository;
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    repository = new ItemRepository();
    jest.clearAllMocks();
  });

  const mockResults: SearchResult[] = [
    {
      id: '1',
      produto: 'Produto Teste',
      item: 'Item Teste',
      unidade: 'UN',
      uf: 'SP',
      cidade: 'São Paulo',
      valor_minimo: 100,
      valor_medio: 150,
      valor_maximo: 200,
      caminho_referencia: '/path/to/ref',
      data_extracao: new Date('2024-01-01'),
      relevancia: 0.8,
    },
  ];

  describe('searchItems', () => {
    it('should build query with search term and use similarity', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue(mockResults);

      const filters: SearchFilters = {
        searchTerm: 'teste',
        uf: '',
        cidade: '',
        page: 1,
        limit: 10,
        offset: 0,
      };

      const result = await repository.searchItems(filters);

      expect(result).toEqual(mockResults);

      // Verifica se a query foi construída corretamente
      const query = mockPrisma.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(query).toContain('similarity(produto, $1)');
      expect(query).toContain('similarity(item, $1)');
      expect(query).toContain('ILIKE');
      expect(query).toContain('ORDER BY');
      expect(query).toContain('GREATEST');

      // Verifica os parâmetros
      const params = mockPrisma.$queryRawUnsafe.mock.calls[0].slice(1);
      expect(params[0]).toBe('teste');
      expect(params[1]).toBe('%teste%');
    });

    it('should build query with UF filter', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue(mockResults);

      const filters: SearchFilters = {
        searchTerm: '',
        uf: 'SP',
        cidade: '',
        page: 1,
        limit: 10,
        offset: 0,
      };

      await repository.searchItems(filters);

      const query = mockPrisma.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(query).toContain('WHERE');
      expect(query).toContain('uf = $');

      const params = mockPrisma.$queryRawUnsafe.mock.calls[0].slice(1);
      expect(params).toContain('SP');
    });

    it('should build query with cidade filter using similarity', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue(mockResults);

      const filters: SearchFilters = {
        searchTerm: '',
        uf: '',
        cidade: 'São Paulo',
        page: 1,
        limit: 10,
        offset: 0,
      };

      await repository.searchItems(filters);

      const query = mockPrisma.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(query).toContain('similarity(cidade,');
      expect(query).toContain('cidade ILIKE');
    });

    it('should combine multiple filters with AND', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue(mockResults);

      const filters: SearchFilters = {
        searchTerm: 'teste',
        uf: 'SP',
        cidade: 'São Paulo',
        page: 1,
        limit: 20,
        offset: 10,
      };

      await repository.searchItems(filters);

      const query = mockPrisma.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(query).toContain('WHERE');
      expect(query).toContain('AND');
      expect(query).toContain('similarity(produto,');
      expect(query).toContain('uf = $');
      expect(query).toContain('similarity(cidade,');
    });

    it('should not include WHERE clause when no filters', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue(mockResults);

      const filters: SearchFilters = {
        searchTerm: '',
        uf: '',
        cidade: '',
        page: 1,
        limit: 10,
        offset: 0,
      };

      await repository.searchItems(filters);

      const query = mockPrisma.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(query).not.toContain('WHERE');
      expect(query).toContain('ORDER BY data_extracao DESC');
    });

    it('should apply limit and offset', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue(mockResults);

      const filters: SearchFilters = {
        searchTerm: 'teste',
        uf: '',
        cidade: '',
        page: 1,
        limit: 25,
        offset: 50,
      };

      await repository.searchItems(filters);

      const query = mockPrisma.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(query).toContain('LIMIT');
      expect(query).toContain('OFFSET');

      const params = mockPrisma.$queryRawUnsafe.mock.calls[0].slice(1);
      expect(params[params.length - 2]).toBe(25); // limit
      expect(params[params.length - 1]).toBe(50); // offset
    });

    it('should convert string numbers to actual numbers', async () => {
      const mockWithStrings = [{
        ...mockResults[0],
        valor_minimo: '100.50',
        valor_medio: '150.75',
        valor_maximo: '200.99',
        relevancia: '0.85',
      }];

      mockPrisma.$queryRawUnsafe.mockResolvedValue(mockWithStrings);

      const filters: SearchFilters = {
        searchTerm: 'teste',
        uf: '',
        cidade: '',
        page: 1,
        limit: 10,
        offset: 0,
      };

      const result = await repository.searchItems(filters);

      expect(typeof result[0].valor_minimo).toBe('number');
      expect(typeof result[0].valor_medio).toBe('number');
      expect(typeof result[0].valor_maximo).toBe('number');
      expect(typeof result[0].relevancia).toBe('number');
      expect(result[0].valor_minimo).toBe(100.50);
    });
  });

  describe('countItems', () => {
    it('should build count query with same WHERE conditions', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ total: BigInt(42) }]);

      const filters: SearchFilters = {
        searchTerm: 'teste',
        uf: 'SP',
        cidade: '',
        page: 1,
        limit: 10,
        offset: 0,
      };

      const count = await repository.countItems(filters);

      expect(count).toBe(42);

      const query = mockPrisma.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(query).toContain('COUNT(*)');
      expect(query).toContain('similarity(produto,');
      expect(query).toContain('uf = $');
    });

    it('should convert BigInt to number', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ total: BigInt(9999999999) }]);

      const filters: SearchFilters = {
        searchTerm: 'teste',
        uf: '',
        cidade: '',
        page: 1,
        limit: 10,
        offset: 0,
      };

      const count = await repository.countItems(filters);

      expect(typeof count).toBe('number');
      expect(count).toBe(9999999999);
    });
  });
});
