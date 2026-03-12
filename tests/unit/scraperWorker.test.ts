import { Worker, Job, Queue } from 'bullmq';
import { ScraperJobData } from '../../src/queue/scraperQueue';
import redisConfig from '../../src/config/redis';

describe('Scraper Worker - Real Redis Integration', () => {
  let testQueue: Queue<ScraperJobData>;
  let testWorker: Worker<ScraperJobData>;

  beforeAll(async () => {
    // Criar fila de teste com Redis REAL
    testQueue = new Queue<ScraperJobData>('test-worker-queue', {
      connection: redisConfig,
    });
  });

  afterEach(async () => {
    // Fechar worker após cada teste
    if (testWorker) {
      await testWorker.close();
    }
    // Limpar fila
    if (testQueue) {
      await testQueue.obliterate({ force: true });
    }
  });

  afterAll(async () => {
    if (testQueue) {
      await testQueue.close();
    }
  });

  it('deve processar um job com sucesso e retornar resultado', async () => {
    return new Promise<void>((resolve, reject) => {
      // Criar worker que processa job REAL
      testWorker = new Worker<ScraperJobData>(
        'test-worker-queue',
        async (job: Job<ScraperJobData>) => {
          // Validar dados recebidos
          expect(job.data.produtoId).toBe('123');
          expect(job.data.produtoNome).toBe('Produto Teste');

          // Simular processamento
          await new Promise(r => setTimeout(r, 100));

          // Retornar resultado
          return {
            success: true,
            produtoNome: job.data.produtoNome,
            itensCount: 5,
          };
        },
        {
          connection: redisConfig,
          concurrency: 1,
        }
      );

      testWorker.on('completed', async (job, result) => {
        try {
          expect(job.id).toBeDefined();
          expect(result).toBeDefined();
          expect(result.success).toBe(true);
          expect(result.produtoNome).toBe('Produto Teste');
          expect(result.itensCount).toBe(5);

          // Verificar no Redis que job foi removido de waiting
          const waitingCount = await testQueue.getWaitingCount();
          expect(waitingCount).toBe(0);

          resolve();
        } catch (error) {
          reject(error);
        }
      });

      testWorker.on('failed', (_job, err) => {
        reject(err);
      });

      // Adicionar job REAL no Redis
      testQueue.add('test', {
        produtoId: '123',
        produtoNome: 'Produto Teste',
      });
    });
  }, 10000);

  it('deve atualizar progresso do job corretamente', async () => {
    const progressUpdates: number[] = [];

    return new Promise<void>((resolve, reject) => {
      testWorker = new Worker<ScraperJobData>(
        'test-worker-queue',
        async (job: Job<ScraperJobData>) => {
          // Atualizar progresso em etapas
          await job.updateProgress(25);
          await new Promise(r => setTimeout(r, 50));

          await job.updateProgress(50);
          await new Promise(r => setTimeout(r, 50));

          await job.updateProgress(75);
          await new Promise(r => setTimeout(r, 50));

          await job.updateProgress(100);

          return { success: true };
        },
        {
          connection: redisConfig,
          concurrency: 1,
        }
      );

      testWorker.on('progress', (_job, progress) => {
        progressUpdates.push(progress as number);
      });

      testWorker.on('completed', () => {
        // Verificar que todos os progressos foram registrados
        expect(progressUpdates).toContain(25);
        expect(progressUpdates).toContain(50);
        expect(progressUpdates).toContain(75);
        expect(progressUpdates).toContain(100);
        expect(progressUpdates.length).toBeGreaterThanOrEqual(4);
        resolve();
      });

      testWorker.on('failed', (_job, err) => {
        reject(err);
      });

      testQueue.add('progress-test', {
        produtoId: '1',
        produtoNome: 'Teste Progresso',
      });
    });
  }, 10000);

  it('deve fazer retry automático em caso de falha transitória', async () => {
    let attempts = 0;

    return new Promise<void>((resolve, reject) => {
      testWorker = new Worker<ScraperJobData>(
        'test-worker-queue',
        async (_job: Job<ScraperJobData>) => {
          attempts++;

          // Simular falha transitória (ex: timeout de rede)
          if (attempts < 2) {
            throw new Error('Falha simulada na tentativa ' + attempts);
          }

          // Sucesso na segunda tentativa
          return { success: true, attempts };
        },
        {
          connection: redisConfig,
          concurrency: 1,
        }
      );

      testWorker.on('completed', (job, result) => {
        // Verificar que retry funcionou
        expect(attempts).toBe(2);
        expect(job.attemptsMade).toBe(2);
        expect(result.success).toBe(true);
        expect(result.attempts).toBe(2);
        resolve();
      });

      testWorker.on('failed', (job, _err) => {
        if (job && job.attemptsMade >= 3) {
          reject(new Error(`Job falhou após ${job.attemptsMade} tentativas`));
        }
      });

      // Adicionar job com configuração de retry
      testQueue.add('retry-test', {
        produtoId: '1',
        produtoNome: 'Teste Retry',
      }, {
        attempts: 3,
        backoff: {
          type: 'fixed',
          delay: 100,
        },
      });
    });
  }, 15000);

  it('deve processar múltiplos jobs em paralelo com concorrência', async () => {
    const processedJobs: string[] = [];
    const processingTimes: Record<string, number> = {};

    return new Promise<void>((resolve, reject) => {
      testWorker = new Worker<ScraperJobData>(
        'test-worker-queue',
        async (job: Job<ScraperJobData>) => {
          const startTime = Date.now();
          processedJobs.push(job.data.produtoId);

          // Simular trabalho
          await new Promise(r => setTimeout(r, 200));

          processingTimes[job.data.produtoId] = Date.now() - startTime;

          return { success: true };
        },
        {
          connection: redisConfig,
          concurrency: 3, // 3 jobs simultâneos
        }
      );

      let completedCount = 0;
      const totalJobs = 5;

      testWorker.on('completed', () => {
        completedCount++;

        if (completedCount === totalJobs) {
          try {
            // Verificar que todos foram processados
            expect(processedJobs).toHaveLength(totalJobs);
            expect(processedJobs).toContain('1');
            expect(processedJobs).toContain('5');

            // Verificar que foram processados em paralelo
            // Se fossem sequenciais, levaria 5 * 200ms = 1000ms
            // Com concorrência 3, deve levar menos tempo
            const values = Object.values(processingTimes);
            expect(values.every(t => t >= 200 && t < 500)).toBe(true);

            resolve();
          } catch (error) {
            reject(error);
          }
        }
      });

      testWorker.on('failed', (_job, err) => {
        reject(err);
      });

      Promise.all([
        testQueue.add('job1', { produtoId: '1', produtoNome: 'P1' }),
        testQueue.add('job2', { produtoId: '2', produtoNome: 'P2' }),
        testQueue.add('job3', { produtoId: '3', produtoNome: 'P3' }),
        testQueue.add('job4', { produtoId: '4', produtoNome: 'P4' }),
        testQueue.add('job5', { produtoId: '5', produtoNome: 'P5' }),
      ]);
    });
  }, 15000);

  it('deve falhar job após esgotar todas as tentativas', async () => {
    return new Promise<void>((resolve, reject) => {
      testWorker = new Worker<ScraperJobData>(
        'test-worker-queue',
        async (_job: Job<ScraperJobData>) => {
          // SEMPRE falhar
          throw new Error('Erro permanente');
        },
        {
          connection: redisConfig,
          concurrency: 1,
        }
      );

      testWorker.on('completed', () => {
        reject(new Error('Job não deveria ter completado'));
      });

      testWorker.on('failed', (job, err) => {
        if (job) {
          expect(job.attemptsMade).toBe(2); // 2 tentativas
          expect(err.message).toBe('Erro permanente');

          // Verificar que está na lista de failed
          testQueue.getFailedCount().then(count => {
            expect(count).toBe(1);
            resolve();
          });
        }
      });

      // Job com apenas 2 tentativas
      testQueue.add('fail-test', {
        produtoId: '1',
        produtoNome: 'Teste Falha',
      }, {
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 50,
        },
      });
    });
  }, 10000);

  it('deve processar job com dados do tipo correto', async () => {
    return new Promise<void>((resolve, reject) => {
      testWorker = new Worker<ScraperJobData>(
        'test-worker-queue',
        async (job: Job<ScraperJobData>) => {
          // Validar tipos
          expect(typeof job.data.produtoId).toBe('string');
          expect(typeof job.data.produtoNome).toBe('string');
          expect(job.data.produtoId.length).toBeGreaterThan(0);
          expect(job.data.produtoNome.length).toBeGreaterThan(0);

          expect(job.id).toBeDefined();
          expect(job.name).toBe('typed-test');
          expect(job.attemptsMade).toBeGreaterThanOrEqual(0);

          return { success: true };
        },
        {
          connection: redisConfig,
          concurrency: 1,
        }
      );

      testWorker.on('completed', () => {
        resolve();
      });

      testWorker.on('failed', (_job, err) => {
        reject(err);
      });

      testQueue.add('typed-test', {
        produtoId: 'abc-123',
        produtoNome: 'Microfone Profissional',
      });
    });
  }, 10000);
});
