import { QueueService } from '../../src/services/queue.service';
import scraperQueue from '../../src/queue/scraperQueue';

jest.mock('../../src/queue/scraperQueue');

describe('QueueService', () => {
  let service: QueueService;
  const mockQueue = scraperQueue as jest.Mocked<typeof scraperQueue>;

  beforeEach(() => {
    service = new QueueService();
    jest.clearAllMocks();
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      mockQueue.getWaitingCount.mockResolvedValue(5);
      mockQueue.getActiveCount.mockResolvedValue(2);
      mockQueue.getCompletedCount.mockResolvedValue(100);
      mockQueue.getFailedCount.mockResolvedValue(3);
      mockQueue.getDelayedCount.mockResolvedValue(1);

      const result = await service.getQueueStats();

      expect(result.queue).toBe('scraper-queue');
      expect(result.counts.waiting).toBe(5);
      expect(result.counts.active).toBe(2);
      expect(result.counts.completed).toBe(100);
      expect(result.counts.failed).toBe(3);
      expect(result.counts.delayed).toBe(1);
      expect(result.counts.total).toBe(111);
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
    });

    it('should call all queue count methods', async () => {
      mockQueue.getWaitingCount.mockResolvedValue(0);
      mockQueue.getActiveCount.mockResolvedValue(0);
      mockQueue.getCompletedCount.mockResolvedValue(0);
      mockQueue.getFailedCount.mockResolvedValue(0);
      mockQueue.getDelayedCount.mockResolvedValue(0);

      await service.getQueueStats();

      expect(mockQueue.getWaitingCount).toHaveBeenCalledTimes(1);
      expect(mockQueue.getActiveCount).toHaveBeenCalledTimes(1);
      expect(mockQueue.getCompletedCount).toHaveBeenCalledTimes(1);
      expect(mockQueue.getFailedCount).toHaveBeenCalledTimes(1);
      expect(mockQueue.getDelayedCount).toHaveBeenCalledTimes(1);
    });

    it('should handle empty queue', async () => {
      mockQueue.getWaitingCount.mockResolvedValue(0);
      mockQueue.getActiveCount.mockResolvedValue(0);
      mockQueue.getCompletedCount.mockResolvedValue(0);
      mockQueue.getFailedCount.mockResolvedValue(0);
      mockQueue.getDelayedCount.mockResolvedValue(0);

      const result = await service.getQueueStats();

      expect(result.counts.total).toBe(0);
    });
  });

  describe('enqueueTestJob', () => {
    it('should enqueue test job successfully', async () => {
      const mockJob = {
        id: '12345',
        data: {
          produtoId: 'TESTE-001',
          produtoNome: 'Produto de Teste - Fase 3',
        },
      };

      mockQueue.add.mockResolvedValue(mockJob as any);

      const result = await service.enqueueTestJob();

      expect(mockQueue.add).toHaveBeenCalledWith('test-scraper', {
        produtoId: 'TESTE-001',
        produtoNome: 'Produto de Teste - Fase 3',
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Job de teste enfileirado com sucesso');
      expect(result.jobId).toBe('12345');
      expect(result.data).toEqual(mockJob.data);
    });

    it('should return job id as string or number', async () => {
      const mockJob = {
        id: 67890,
        data: {
          produtoId: 'TESTE-001',
          produtoNome: 'Produto de Teste - Fase 3',
        },
      };

      mockQueue.add.mockResolvedValue(mockJob as any);

      const result = await service.enqueueTestJob();

      expect(result.jobId).toBe(67890);
    });
  });
});
