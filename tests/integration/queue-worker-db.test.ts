import { Queue, Worker, Job } from 'bullmq';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { ScraperJobData } from '../../src/queue/scraperQueue';

describe('Queue + Worker + Database Integration', () => {
  let postgresContainer: StartedPostgreSqlContainer;
  let redisContainer: StartedTestContainer;
  let prisma: PrismaClient;
  let queue: Queue<ScraperJobData>;
  let worker: Worker<ScraperJobData>;
  let redisConfig: any;

  beforeAll(async () => {
    console.log('🐳 Iniciando containers para teste de integração...');

    // Iniciar PostgreSQL
    postgresContainer = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .start();

    // Iniciar Redis
    redisContainer = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .start();

    const databaseUrl = `postgresql://${postgresContainer.getUsername()}:${postgresContainer.getPassword()}@${postgresContainer.getHost()}:${postgresContainer.getPort()}/${postgresContainer.getDatabase()}?schema=public`;

    redisConfig = {
      host: redisContainer.getHost(),
      port: redisContainer.getMappedPort(6379),
      maxRetriesPerRequest: null,
    };

    console.log('✅ Containers iniciados');

    // Aplicar migrations
    process.env.DATABASE_URL = databaseUrl;
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'pipe',
    });

    // Criar cliente Prisma
    prisma = new PrismaClient({
      datasources: {
        db: { url: databaseUrl },
      },
    });

    await prisma.$connect();

    // Criar fila
    queue = new Queue<ScraperJobData>('integration-test-queue', {
      connection: redisConfig,
    });

    console.log('✅ Setup de integração completo');
  }, 120000);

  afterAll(async () => {
    if (worker) {
      await worker.close();
    }
    if (queue) {
      await queue.close();
    }
    if (prisma) {
      await prisma.$disconnect();
    }
    if (redisContainer) {
      await redisContainer.stop();
    }
    if (postgresContainer) {
      await postgresContainer.stop();
    }
    console.log('🛑 Containers parados');
  }, 60000);

  beforeEach(async () => {
    // Limpar dados
    await prisma.itemOrcamentario.deleteMany();
    await queue.obliterate({ force: true });
  });

  it('deve processar job e persistir dados no banco', async () => {
    return new Promise<void>((resolve, reject) => {
      // Criar worker que persiste no banco
      worker = new Worker<ScraperJobData>(
        'integration-test-queue',
        async (job: Job<ScraperJobData>) => {
          const { produtoNome } = job.data;

          // Simular extração de dados
          const itensExtraidos = [
            {
              produto: produtoNome,
              item: 'Item extraído do scraper',
              unidade: 'UN',
              uf: 'SP',
              cidade: 'São Paulo',
              valor_minimo: 10,
              valor_medio: 15,
              valor_maximo: 20,
              caminho_referencia: 'http://example.com',
            },
          ];

          // Persistir no banco
          await prisma.itemOrcamentario.create({
            data: itensExtraidos[0],
          });

          return { success: true, itensCount: itensExtraidos.length };
        },
        {
          connection: redisConfig,
          concurrency: 1,
        }
      );

      worker.on('completed', async (_job) => {
        try {
          // Verificar se foi persistido
          const items = await prisma.itemOrcamentario.findMany({
            where: { produto: 'Produto Integração' },
          });

          expect(items).toHaveLength(1);
          expect(items[0].item).toBe('Item extraído do scraper');
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      worker.on('failed', (_job, err) => {
        reject(err);
      });

      // Adicionar job
      queue.add('integration-test', {
        produtoId: '1',
        produtoNome: 'Produto Integração',
      });
    });
  }, 30000);

  it('deve fazer upsert quando item já existe', async () => {
    return new Promise<void>((resolve, reject) => {
      let jobsProcessed = 0;

      worker = new Worker<ScraperJobData>(
        'integration-test-queue',
        async (_job: Job<ScraperJobData>) => {
          const uniqueKey = {
            produto: 'Produto Upsert',
            item: 'Item Upsert',
            uf: 'SP',
            cidade: 'São Paulo',
          };

          // Upsert
          await prisma.itemOrcamentario.upsert({
            where: {
              unique_item_location: uniqueKey,
            },
            update: {
              valor_minimo: 200,
              valor_medio: 250,
              valor_maximo: 300,
              data_extracao: new Date(),
            },
            create: {
              ...uniqueKey,
              unidade: 'UN',
              valor_minimo: 100,
              valor_medio: 150,
              valor_maximo: 200,
            },
          });

          return { success: true };
        },
        {
          connection: redisConfig,
          concurrency: 1,
        }
      );

      worker.on('completed', async (_job) => {
        jobsProcessed++;

        if (jobsProcessed === 2) {
          try {
            // Verificar que só existe 1 item (foi feito update, não insert)
            const items = await prisma.itemOrcamentario.findMany({
              where: {
                produto: 'Produto Upsert',
              },
            });

            expect(items).toHaveLength(1);
            expect(items[0].valor_minimo.toNumber()).toBe(200); // Valor atualizado
            resolve();
          } catch (error) {
            reject(error);
          }
        }
      });

      worker.on('failed', (_job, err) => {
        reject(err);
      });

      // Adicionar 2 jobs com mesmo produto
      queue.add('upsert1', { produtoId: '1', produtoNome: 'P1' });

      setTimeout(() => {
        queue.add('upsert2', { produtoId: '1', produtoNome: 'P1' });
      }, 1000);
    });
  }, 30000);

  it('deve processar múltiplos jobs em paralelo', async () => {
    return new Promise<void>((resolve, reject) => {
      const processedProducts = new Set<string>();
      const totalJobs = 5;

      worker = new Worker<ScraperJobData>(
        'integration-test-queue',
        async (job: Job<ScraperJobData>) => {
          const { produtoId, produtoNome } = job.data;

          // Criar item no banco
          await prisma.itemOrcamentario.create({
            data: {
              produto: produtoNome,
              item: `Item do ${produtoNome}`,
              unidade: 'UN',
              uf: 'SP',
              cidade: `Cidade ${produtoId}`,
              valor_minimo: 10,
              valor_medio: 15,
              valor_maximo: 20,
            },
          });

          return { success: true };
        },
        {
          connection: redisConfig,
          concurrency: 3, // Concorrência de 3
        }
      );

      worker.on('completed', async (job) => {
        processedProducts.add(job.data.produtoNome);

        if (processedProducts.size === totalJobs) {
          try {
            const items = await prisma.itemOrcamentario.count();
            expect(items).toBe(totalJobs);
            resolve();
          } catch (error) {
            reject(error);
          }
        }
      });

      worker.on('failed', (_job, err) => {
        reject(err);
      });

      // Adicionar múltiplos jobs
      for (let i = 1; i <= totalJobs; i++) {
        queue.add(`job${i}`, {
          produtoId: `${i}`,
          produtoNome: `Produto ${i}`,
        });
      }
    });
  }, 30000);
});
