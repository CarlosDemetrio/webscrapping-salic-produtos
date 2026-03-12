import Fastify, { FastifyInstance } from 'fastify';
import { Queue } from 'bullmq';
import { ScraperJobData } from '../../src/queue/scraperQueue';
import redisConfig from '../../src/config/redis';

describe('Server API - Real Queue Tests', () => {
  let app: FastifyInstance;
  let testQueue: Queue<ScraperJobData>;

  beforeAll(async () => {
    // Criar fila real para testes
    testQueue = new Queue<ScraperJobData>('test-server-queue', {
      connection: redisConfig,
    });

    app = Fastify({ logger: false });

    // Implementar rotas (simulando o server.ts)
    app.get('/health', async () => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        phase: 'FASE 2 - Queue Architecture (BullMQ + Redis) ✅'
      };
    });

    app.get('/api/queue/status', async () => {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        testQueue.getWaitingCount(),
        testQueue.getActiveCount(),
        testQueue.getCompletedCount(),
        testQueue.getFailedCount(),
        testQueue.getDelayedCount(),
      ]);

      return {
        queue: 'test-server-queue',
        counts: {
          waiting,
          active,
          completed,
          failed,
          delayed,
          total: waiting + active + completed + failed + delayed,
        },
        timestamp: new Date().toISOString(),
      };
    });

    await app.ready();
  });

  afterEach(async () => {
    // Limpar fila após cada teste
    if (testQueue) {
      await testQueue.obliterate({ force: true });
    }
  });

  afterAll(async () => {
    if (testQueue) {
      await testQueue.close();
    }
    if (app) {
      await app.close();
    }
  });

  describe('GET /health', () => {
    it('deve retornar status ok com estrutura correta', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);

      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('status');
      expect(payload).toHaveProperty('timestamp');
      expect(payload).toHaveProperty('phase');
      expect(payload.status).toBe('ok');
      expect(payload.phase).toContain('FASE 2');
    });

    it('deve retornar timestamp válido em formato ISO', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      const payload = JSON.parse(response.payload);
      const timestamp = new Date(payload.timestamp);

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });
  });

  describe('GET /api/queue/status - Real Queue Data', () => {
    it('deve retornar contadores zerados quando fila está vazia', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/queue/status',
      });

      expect(response.statusCode).toBe(200);

      const payload = JSON.parse(response.payload);
      expect(payload.queue).toBe('test-server-queue');
      expect(payload.counts.waiting).toBe(0);
      expect(payload.counts.active).toBe(0);
      expect(payload.counts.total).toBe(0);
    });

    it('deve retornar contagem correta de jobs waiting', async () => {
      // Adicionar 3 jobs na fila
      await testQueue.add('job1', { produtoId: '1', produtoNome: 'P1' });
      await testQueue.add('job2', { produtoId: '2', produtoNome: 'P2' });
      await testQueue.add('job3', { produtoId: '3', produtoNome: 'P3' });

      const response = await app.inject({
        method: 'GET',
        url: '/api/queue/status',
      });

      const payload = JSON.parse(response.payload);
      expect(payload.counts.waiting).toBe(3);
      expect(payload.counts.total).toBeGreaterThanOrEqual(3);
    });

    it('deve retornar tipos corretos para todos os contadores', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/queue/status',
      });

      const payload = JSON.parse(response.payload);

      expect(typeof payload.counts.waiting).toBe('number');
      expect(typeof payload.counts.active).toBe('number');
      expect(typeof payload.counts.completed).toBe('number');
      expect(typeof payload.counts.failed).toBe('number');
      expect(typeof payload.counts.delayed).toBe('number');
      expect(typeof payload.counts.total).toBe('number');
    });

    it('deve calcular total corretamente', async () => {
      await testQueue.add('job1', { produtoId: '1', produtoNome: 'P1' });
      await testQueue.add('job2', { produtoId: '2', produtoNome: 'P2' });

      const response = await app.inject({
        method: 'GET',
        url: '/api/queue/status',
      });

      const payload = JSON.parse(response.payload);
      const { waiting, active, completed, failed, delayed, total } = payload.counts;

      expect(total).toBe(waiting + active + completed + failed + delayed);
    });
  });
});
