import { Queue } from 'bullmq';
import { ScraperJobData } from '../../src/queue/scraperQueue';
import redisConfig from '../../src/config/redis';

describe('Scraper Queue - Real Redis Tests', () => {
  let testQueue: Queue<ScraperJobData>;

  beforeAll(async () => {
    // Criar fila de teste usando configuração real
    testQueue = new Queue<ScraperJobData>('test-queue-unit', {
      connection: redisConfig,
    });
  });

  afterEach(async () => {
    // Limpar a fila após cada teste
    if (testQueue) {
      await testQueue.obliterate({ force: true });
    }
  });

  afterAll(async () => {
    if (testQueue) {
      await testQueue.close();
    }
  });

  describe('Configuração da Fila', () => {
    it('deve criar a fila com o nome correto', () => {
      expect(testQueue).toBeDefined();
      expect(testQueue.name).toBe('test-queue-unit');
    });

    it('deve ter conexão Redis configurada', () => {
      expect(testQueue.opts.connection).toBeDefined();
    });
  });

  describe('Interface ScraperJobData - Type Safety', () => {
    it('deve aceitar um job válido com todos os campos obrigatórios', () => {
      const jobData: ScraperJobData = {
        produtoId: '123',
        produtoNome: 'Produto Teste',
      };

      expect(jobData.produtoId).toBe('123');
      expect(jobData.produtoNome).toBe('Produto Teste');
    });

    it('deve aceitar campo opcional tentativas', () => {
      const jobData: ScraperJobData = {
        produtoId: '123',
        produtoNome: 'Produto Teste',
        tentativas: 3,
      };

      expect(jobData.tentativas).toBe(3);
    });
  });

  describe('Operações da Fila - Redis Real', () => {
    it('deve adicionar um job à fila e persistir no Redis', async () => {
      const jobData: ScraperJobData = {
        produtoId: '1',
        produtoNome: 'Teste Produto',
      };

      const job = await testQueue.add('test-job', jobData);

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.data).toEqual(jobData);
      expect(job.name).toBe('test-job');

      // Verificar se realmente está no Redis
      const waitingCount = await testQueue.getWaitingCount();
      expect(waitingCount).toBe(1);

      // Verificar se podemos recuperar o job
      const recoveredJob = await testQueue.getJob(job.id!);
      expect(recoveredJob).toBeDefined();
      expect(recoveredJob?.data.produtoId).toBe('1');
    });

    it('deve adicionar múltiplos jobs e contar corretamente', async () => {
      const jobs = await Promise.all([
        testQueue.add('job1', { produtoId: '1', produtoNome: 'Produto 1' }),
        testQueue.add('job2', { produtoId: '2', produtoNome: 'Produto 2' }),
        testQueue.add('job3', { produtoId: '3', produtoNome: 'Produto 3' }),
      ]);

      expect(jobs).toHaveLength(3);

      const waitingCount = await testQueue.getWaitingCount();
      expect(waitingCount).toBe(3);
    });

    it('deve remover um job específico da fila', async () => {
      const job = await testQueue.add('remove-test', {
        produtoId: '999',
        produtoNome: 'Produto para remover',
      });

      expect(job).toBeDefined();

      const waitingBefore = await testQueue.getWaitingCount();
      expect(waitingBefore).toBe(1);

      await job.remove();

      const waitingAfter = await testQueue.getWaitingCount();
      expect(waitingAfter).toBe(0);

      // Verificar que o job não existe mais
      const recovered = await testQueue.getJob(job.id!);
      expect(recovered).toBeUndefined();
    });

    it('deve configurar prioridade de jobs', async () => {
      const lowPriority = await testQueue.add('low', {
        produtoId: '1',
        produtoNome: 'Baixa Prioridade',
      }, { priority: 10 });

      const highPriority = await testQueue.add('high', {
        produtoId: '2',
        produtoNome: 'Alta Prioridade',
      }, { priority: 1 });

      expect(lowPriority.opts.priority).toBe(10);
      expect(highPriority.opts.priority).toBe(1);
    });

    it('deve configurar delay para jobs', async () => {
      await testQueue.add('delayed', {
        produtoId: '1',
        produtoNome: 'Job Atrasado',
      }, { delay: 5000 });

      const delayedCount = await testQueue.getDelayedCount();
      expect(delayedCount).toBe(1);

      const waitingCount = await testQueue.getWaitingCount();
      expect(waitingCount).toBe(0);
    });

    it('deve pausar e retomar a fila', async () => {
      // Adicionar jobs
      await testQueue.add('job1', { produtoId: '1', produtoNome: 'P1' });
      await testQueue.add('job2', { produtoId: '2', produtoNome: 'P2' });

      // Pausar fila
      await testQueue.pause();
      const isPaused = await testQueue.isPaused();
      expect(isPaused).toBe(true);

      // Retomar fila
      await testQueue.resume();
      const isResumed = !(await testQueue.isPaused());
      expect(isResumed).toBe(true);
    });
  });
});
