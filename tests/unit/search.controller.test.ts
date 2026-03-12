import { FastifyReply, FastifyRequest } from 'fastify';
import { SearchController } from '../../src/controllers/search.controller';
import searchService from '../../src/services/search.service';
import { SearchQuery, SearchResponse } from '../../src/types/search.types';

jest.mock('../../src/services/search.service');

describe('SearchController', () => {
  let controller: SearchController;
  let mockRequest: Partial<FastifyRequest<{ Querystring: SearchQuery }>>;
  let mockReply: Partial<FastifyReply>;
  const mockService = searchService as jest.Mocked<typeof searchService>;

  beforeEach(() => {
    controller = new SearchController();
    mockRequest = {
      query: {},
    };
    mockReply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('should call searchService and return results with 200 status', async () => {
      const mockSearchResponse: SearchResponse = {
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
        filters: {
          searchTerm: 'test',
          uf: null,
          cidade: null,
        },
      };

      mockRequest.query = { q: 'test' };
      mockService.search.mockResolvedValue(mockSearchResponse);

      await controller.search(
        mockRequest as FastifyRequest<{ Querystring: SearchQuery }>,
        mockReply as FastifyReply
      );

      expect(mockService.search).toHaveBeenCalledWith({ q: 'test' });
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith(mockSearchResponse);
    });

    it('should pass all query parameters to service', async () => {
      const query: SearchQuery = {
        q: 'produto',
        uf: 'SP',
        cidade: 'São Paulo',
        page: '2',
        limit: '50',
      };

      const mockSearchResponse: SearchResponse = {
        success: true,
        data: [],
        pagination: {
          page: 2,
          limit: 50,
          total: 100,
          totalPages: 2,
          hasNext: false,
          hasPrev: true,
        },
        filters: {
          searchTerm: 'produto',
          uf: 'SP',
          cidade: 'São Paulo',
        },
      };

      mockRequest.query = query;
      mockService.search.mockResolvedValue(mockSearchResponse);

      await controller.search(
        mockRequest as FastifyRequest<{ Querystring: SearchQuery }>,
        mockReply as FastifyReply
      );

      expect(mockService.search).toHaveBeenCalledWith(query);
      expect(mockReply.code).toHaveBeenCalledWith(200);
    });

    it('should propagate service errors', async () => {
      mockRequest.query = {};
      const serviceError = new Error('Service error');
      mockService.search.mockRejectedValue(serviceError);

      await expect(
        controller.search(
          mockRequest as FastifyRequest<{ Querystring: SearchQuery }>,
          mockReply as FastifyReply
        )
      ).rejects.toThrow('Service error');

      expect(mockService.search).toHaveBeenCalled();
    });
  });
});
