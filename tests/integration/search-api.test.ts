import { test, describe, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import Fastify, { FastifyInstance } from 'fastify';
import prisma from '../../src/config/database';

// Mock do Redis para não precisar de Redis rodando nos testes
jest.mock('../../src/config/redis', () => ({
  __esModule: true,
  default: {
    status: 'ready',
    on: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  },
}));

// Mock da queue para não precisar de BullMQ rodando
jest.mock('../../src/queue/scraperQueue', () => ({
  __esModule: true,
  default: {
    add: jest.fn().mockResolvedValue({ id: 'mock-job-id', data: {} }),
    getWaitingCount: jest.fn().mockResolvedValue(0),
    getActiveCount: jest.fn().mockResolvedValue(0),
    getCompletedCount: jest.fn().mockResolvedValue(0),
    getFailedCount: jest.fn().mockResolvedValue(0),
    getDelayedCount: jest.fn().mockResolvedValue(0),
  },
}));

describe('Search API - Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Criar aplicação Fastify para testes
    app = Fastify({ logger: false });

    // Importar as rotas do server (apenas as rotas, não iniciar o servidor)
    const scraperQueue = (await import('../../src/queue/scraperQueue')).default;

    // Health check endpoint
    app.get('/health', async () => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        phase: 'TEST',
      };
    });

    // Queue status endpoint
    app.get('/api/queue/status', async () => {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        scraperQueue.getWaitingCount(),
        scraperQueue.getActiveCount(),
        scraperQueue.getCompletedCount(),
        scraperQueue.getFailedCount(),
        scraperQueue.getDelayedCount(),
      ]);

      return {
        queue: 'scraper-queue',
        counts: { waiting, active, completed, failed, delayed },
      };
    });

    // Endpoint de busca FTS (copiado do server.ts)
    app.get<{
      Querystring: {
        q?: string;
        uf?: string;
        cidade?: string;
        page?: string;
        limit?: string;
      };
    }>('/api/search', async (request, reply) => {
      try {
        const searchTerm = request.query.q?.trim() || '';
        const uf = request.query.uf?.trim().toUpperCase() || '';
        const cidade = request.query.cidade?.trim() || '';
        const page = Math.max(1, parseInt(request.query.page || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(request.query.limit || '20', 10)));
        const offset = (page - 1) * limit;

        if (!searchTerm && !uf && !cidade) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Informe pelo menos um critério de busca: q, uf ou cidade',
          });
        }

        let whereConditions: string[] = [];
        let params: any[] = [];
        let paramIndex = 1;

        if (searchTerm) {
          whereConditions.push(
            `(
              similarity(produto, $${paramIndex}) > 0.3 OR
              similarity(item, $${paramIndex}) > 0.3 OR
              similarity(cidade, $${paramIndex}) > 0.3 OR
              produto ILIKE $${paramIndex + 1} OR
              item ILIKE $${paramIndex + 1}
            )`
          );
          params.push(searchTerm, `%${searchTerm}%`);
          paramIndex += 2;
        }

        if (uf) {
          whereConditions.push(`uf = $${paramIndex}`);
          params.push(uf);
          paramIndex++;
        }

        if (cidade) {
          whereConditions.push(
            `(similarity(cidade, $${paramIndex}) > 0.5 OR cidade ILIKE $${paramIndex + 1})`
          );
          params.push(cidade, `%${cidade}%`);
          paramIndex += 2;
        }

        const whereClause = whereConditions.length > 0
          ? `WHERE ${whereConditions.join(' AND ')}`
          : '';

        const orderBy = searchTerm
          ? `ORDER BY 
              GREATEST(
                similarity(produto, $1),
                similarity(item, $1),
                similarity(cidade, $1)
              ) DESC,
              data_extracao DESC`
          : `ORDER BY data_extracao DESC`;

        const query = `
          SELECT 
            id,
            produto,
            item,
            unidade,
            uf,
            cidade,
            valor_minimo,
            valor_medio,
            valor_maximo,
            caminho_referencia,
            data_extracao,
            ${searchTerm ? `
            GREATEST(
              similarity(produto, $1),
              similarity(item, $1),
              similarity(cidade, $1)
            ) as relevancia` : '1.0 as relevancia'}
          FROM itens_orcamentarios
          ${whereClause}
          ${orderBy}
          LIMIT $${paramIndex}
          OFFSET $${paramIndex + 1}
        `;

        params.push(limit, offset);

        const countQuery = `
          SELECT COUNT(*) as total
          FROM itens_orcamentarios
          ${whereClause}
        `;

        const countParams = params.slice(0, params.length - 2);

        const [results, countResult] = await Promise.all([
          prisma.$queryRawUnsafe<any[]>(query, ...params),
          prisma.$queryRawUnsafe<[{ total: bigint }]>(countQuery, ...countParams),
        ]);

        const total = Number(countResult[0].total);
        const totalPages = Math.ceil(total / limit);

        const items = results.map((item) => ({
          ...item,
          valor_minimo: Number(item.valor_minimo),
          valor_medio: Number(item.valor_medio),
          valor_maximo: Number(item.valor_maximo),
          relevancia: Number(item.relevancia),
        }));

        return {
          success: true,
          data: items,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
          filters: {
            searchTerm: searchTerm || null,
            uf: uf || null,
            cidade: cidade || null,
          },
        };
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Erro ao realizar busca',
        });
      }
    });

    // Test endpoint
    app.post('/api/test/enqueue', async () => {
      try {
        const job = await scraperQueue.add('test-scraper', {
          produtoId: 'TESTE-001',
          produtoNome: 'Produto de Teste',
        });

        return {
          success: true,
          message: 'Job enfileirado',
          jobId: job.id,
          data: job.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        };
      }
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Limpar a tabela antes de cada teste
    await prisma.itemOrcamentario.deleteMany({});
  });

  describe('GET /health', () => {
    test('deve retornar status ok', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/queue/status', () => {
    test('deve retornar status da fila', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/queue/status',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('queue', 'scraper-queue');
      expect(body).toHaveProperty('counts');
      expect(body.counts).toHaveProperty('waiting');
      expect(body.counts).toHaveProperty('active');
    });
  });

  describe('POST /api/test/enqueue', () => {
    test('deve enfileirar job de teste com sucesso', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/test/enqueue',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body).toHaveProperty('jobId');
      expect(body.message).toBe('Job enfileirado');
    });
  });

  describe('GET /api/search - Validações', () => {
    test('deve retornar 400 quando não informar nenhum critério', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/search',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Bad Request');
      expect(body.message).toContain('pelo menos um critério');
    });

    test('deve aceitar apenas query string q', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/search?q=teste',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    test('deve aceitar apenas filtro uf', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/search?uf=SP',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    test('deve aceitar apenas filtro cidade', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/search?cidade=Paulo',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  describe('GET /api/search - Busca Textual (FTS)', () => {
    beforeEach(async () => {
      // Criar dados de teste
      await prisma.itemOrcamentario.createMany({
        data: [
          {
            produto: 'Mouse Óptico',
            item: 'Mouse óptico USB 1000 DPI',
            unidade: 'UN',
            uf: 'SP',
            cidade: 'São Paulo',
            valor_minimo: 15.00,
            valor_medio: 25.00,
            valor_maximo: 35.00,
          },
          {
            produto: 'Mouse Sem Fio',
            item: 'Mouse wireless 2.4GHz',
            unidade: 'UN',
            uf: 'RJ',
            cidade: 'Rio de Janeiro',
            valor_minimo: 30.00,
            valor_medio: 50.00,
            valor_maximo: 70.00,
          },
          {
            produto: 'Teclado Mecânico',
            item: 'Teclado mecânico RGB',
            unidade: 'UN',
            uf: 'SP',
            cidade: 'Campinas',
            valor_minimo: 200.00,
            valor_medio: 350.00,
            valor_maximo: 500.00,
          },
          {
            produto: 'Monitor LED',
            item: 'Monitor LED 24 polegadas Full HD',
            unidade: 'UN',
            uf: 'MG',
            cidade: 'Belo Horizonte',
            valor_minimo: 500.00,
            valor_medio: 700.00,
            valor_maximo: 900.00,
          },
        ],
      });
    });

    test('deve encontrar itens por busca exata no produto', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/search?q=Mouse',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(2);
      expect(body.data[0].produto).toContain('Mouse');
    });

    test('deve encontrar itens por busca parcial (ILIKE)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/search?q=USB',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });

    test('deve buscar no campo item também', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/search?q=wireless',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.data[0].item).toContain('wireless');
    });

    test('deve buscar no campo cidade', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/search?q=Campinas',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.data[0].cidade).toBe('Campinas');
    });

    test('deve ordenar por relevância (similarity score)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/search?q=Mouse',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      // Verificar que tem campo relevancia e está ordenado DESC
      const relevancia = body.data.map((item: any) => item.relevancia);
      expect(relevancia[0]).toBeGreaterThanOrEqual(relevancia[1] || 0);
    });

    test('deve retornar array vazio quando nada encontrado', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/search?q=xyzabc123notfound',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
      expect(body.pagination.total).toBe(0);
    });
  });

  describe('GET /api/search - Filtros Geográficos', () => {
    beforeEach(async () => {
      await prisma.itemOrcamentario.createMany({
        data: [
          {
            produto: 'Produto A',
            item: 'Item A',
            unidade: 'UN',
            uf: 'SP',
            cidade: 'São Paulo',
            valor_minimo: 10.00,
            valor_medio: 20.00,
            valor_maximo: 30.00,
          },
          {
            produto: 'Produto B',
            item: 'Item B',
            unidade: 'UN',
            uf: 'SP',
            cidade: 'Campinas',
            valor_minimo: 15.00,
            valor_medio: 25.00,
            valor_maximo: 35.00,
          },
          {
            produto: 'Produto C',
            item: 'Item C',
            unidade: 'UN',
            uf: 'RJ',
            cidade: 'Rio de Janeiro',
            valor_minimo: 20.00,
            valor_medio: 30.00,
            valor_maximo: 40.00,
          },
        ],
      });
    });

    test('deve filtrar por UF', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/search?uf=SP',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(2);
      body.data.forEach((item: any) => {
        expect(item.uf).toBe('SP');
      });
    });

    test('deve converter UF para uppercase automaticamente', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/search?uf=sp',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.filters.uf).toBe('SP');
    });

    test('deve filtrar por cidade (busca fuzzy)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/search?cidade=Paulo',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });

    test('deve combinar filtros: q + uf', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/search?q=Produto&uf=SP',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(2);
      body.data.forEach((item: any) => {
        expect(item.uf).toBe('SP');
      });
    });

    test('deve combinar filtros: q + uf + cidade', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/search?q=Produto&uf=SP&cidade=Paulo',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(1);
      expect(body.data[0].cidade).toBe('São Paulo');
    });
  });

  describe('GET /api/search - Paginação', () => {
    beforeEach(async () => {
      // Criar 25 itens para testar paginação
      const items = Array.from({ length: 25 }, (_, i) => ({
        produto: `Produto ${i + 1}`,
        item: `Item ${i + 1}`,
        unidade: 'UN',
        uf: 'SP',
        cidade: 'São Paulo',
        valor_minimo: 10.00 + i,
        valor_medio: 20.00 + i,
        valor_maximo: 30.00 + i,
      }));

      await prisma.itemOrcamentario.createMany({ data: items });
    });

    test('deve retornar primeira página com 20 itens por padrão', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/search?uf=SP',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(20);
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(20);
      expect(body.pagination.total).toBe(25);
      expect(body.pagination.totalPages).toBe(2);
      expect(body.pagination.hasNext).toBe(true);
      expect(body.pagination.hasPrev).toBe(false);
    });

    test('deve retornar página 2 com os itens restantes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/search?uf=SP&page=2',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(5);
      expect(body.pagination.page).toBe(2);
      expect(body.pagination.hasNext).toBe(false);
      expect(body.pagination.hasPrev).toBe(true);
    });

    test('deve respeitar o limite customizado', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/search?uf=SP&limit=5',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.length).toBe(5);
      expect(body.pagination.limit).toBe(5);
      expect(body.pagination.totalPages).toBe(5);
    });

    test('deve limitar o máximo a 100 itens', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/search?uf=SP&limit=200',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.pagination.limit).toBe(100);
    });

    test('deve corrigir página inválida para 1', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/search?uf=SP&page=0',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.pagination.page).toBe(1);
    });

    test('deve corrigir limite inválido para 1', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/search?uf=SP&limit=0',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.pagination.limit).toBe(1);
    });
  });

  describe('GET /api/search - Conversão de Tipos', () => {
    beforeEach(async () => {
      await prisma.itemOrcamentario.create({
        data: {
          produto: 'Teste Decimal',
          item: 'Item para testar Decimal',
          unidade: 'UN',
          uf: 'SP',
          cidade: 'São Paulo',
          valor_minimo: 10.99,
          valor_medio: 20.50,
          valor_maximo: 30.75,
        },
      });
    });

    test('deve converter Decimal para number corretamente', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/search?q=Decimal',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(1);

      const item = body.data[0];
      expect(typeof item.valor_minimo).toBe('number');
      expect(typeof item.valor_medio).toBe('number');
      expect(typeof item.valor_maximo).toBe('number');
      expect(item.valor_minimo).toBe(10.99);
      expect(item.valor_medio).toBe(20.50);
      expect(item.valor_maximo).toBe(30.75);
    });

    test('deve converter relevancia para number', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/search?q=Teste',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(typeof body.data[0].relevancia).toBe('number');
    });
  });

  describe('GET /api/search - Campos de Retorno', () => {
    beforeEach(async () => {
      await prisma.itemOrcamentario.create({
        data: {
          produto: 'Produto Teste',
          item: 'Item Teste',
          unidade: 'UN',
          uf: 'SP',
          cidade: 'São Paulo',
          valor_minimo: 10.00,
          valor_medio: 20.00,
          valor_maximo: 30.00,
          caminho_referencia: 'http://exemplo.com/ref',
        },
      });
    });

    test('deve retornar todos os campos necessários', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/search?q=Teste',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.length).toBe(1);

      const item = body.data[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('produto');
      expect(item).toHaveProperty('item');
      expect(item).toHaveProperty('unidade');
      expect(item).toHaveProperty('uf');
      expect(item).toHaveProperty('cidade');
      expect(item).toHaveProperty('valor_minimo');
      expect(item).toHaveProperty('valor_medio');
      expect(item).toHaveProperty('valor_maximo');
      expect(item).toHaveProperty('caminho_referencia');
      expect(item).toHaveProperty('data_extracao');
      expect(item).toHaveProperty('relevancia');
    });

    test('deve incluir filtros aplicados no response', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/search?q=Teste&uf=SP&cidade=Paulo',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.filters).toEqual({
        searchTerm: 'Teste',
        uf: 'SP',
        cidade: 'Paulo',
      });
    });
  });
});
