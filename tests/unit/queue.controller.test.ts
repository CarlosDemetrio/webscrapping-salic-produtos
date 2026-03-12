import { FastifyReply, FastifyRequest } from 'fastify';
import { QueueController } from '../../src/controllers/queue.controller';
import queueService from '../../src/services/queue.service';

jest.mock('../../src/services/queue.service');

describe('QueueController', () => {
  let controller: QueueController;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  const mockService = queueService as jest.Mocked<typeof queueService>;

  beforeEach(() => {
    controller = new QueueController();
    mockRequest = {};
    mockReply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('getStatus', () => {
    it('should return queue statistics with 200 status', async () => {
      const mockStats = {
        queue: 'scraper-queue',
        counts: {
          waiting: 5,
          active: 2,
          completed: 100,
          failed: 3,
          delayed: 0,
          total: 110,
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      mockService.getQueueStats.mockResolvedValue(mockStats);

      await controller.getStatus(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockService.getQueueStats).toHaveBeenCalledTimes(1);
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith(mockStats);
    });

    it('should propagate service errors', async () => {
      const serviceError = new Error('Queue unavailable');
      mockService.getQueueStats.mockRejectedValue(serviceError);

      await expect(
        controller.getStatus(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply
        )
      ).rejects.toThrow('Queue unavailable');
    });
  });

  describe('enqueueTest', () => {
    it('should enqueue test job and return result with 200 status', async () => {
      const mockResult = {
        success: true,
        message: 'Job de teste enfileirado com sucesso',
        jobId: '12345',
        data: {
          produtoId: 'TESTE-001',
          produtoNome: 'Produto de Teste - Fase 3',
        },
      };

      mockService.enqueueTestJob.mockResolvedValue(mockResult);

      await controller.enqueueTest(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockService.enqueueTestJob).toHaveBeenCalledTimes(1);
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith(mockResult);
    });

    it('should propagate service errors', async () => {
      const serviceError = new Error('Failed to enqueue');
      mockService.enqueueTestJob.mockRejectedValue(serviceError);

      await expect(
        controller.enqueueTest(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply
        )
      ).rejects.toThrow('Failed to enqueue');
    });
  });
});
