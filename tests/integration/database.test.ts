import { PrismaClient } from '@prisma/client';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'child_process';

describe('Database Integration Tests', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let databaseUrl: string;

  beforeAll(async () => {
    console.log('🐳 Iniciando container PostgreSQL para testes...');

    // Iniciar container PostgreSQL
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .start();

    // Construir URL de conexão
    databaseUrl = `postgresql://${container.getUsername()}:${container.getPassword()}@${container.getHost()}:${container.getPort()}/${container.getDatabase()}?schema=public`;

    console.log('✅ Container PostgreSQL iniciado');

    // Aplicar migrations
    console.log('📦 Aplicando migrations...');
    process.env.DATABASE_URL = databaseUrl;

    try {
      execSync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: databaseUrl },
        stdio: 'pipe',
      });
      console.log('✅ Migrations aplicadas');
    } catch (error) {
      console.error('❌ Erro ao aplicar migrations:', error);
      throw error;
    }

    // Criar cliente Prisma
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });

    await prisma.$connect();
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (container) {
      await container.stop();
      console.log('🛑 Container PostgreSQL parado');
    }
  });

  beforeEach(async () => {
    // Limpar dados antes de cada teste
    await prisma.itemOrcamentario.deleteMany();
  });

  describe('Modelo ItemOrcamentario', () => {
    it('deve criar um item orçamentário', async () => {
      const item = await prisma.itemOrcamentario.create({
        data: {
          produto: 'Produto Teste',
          item: 'Item Teste',
          unidade: 'UN',
          uf: 'SP',
          cidade: 'São Paulo',
          valor_minimo: 10.50,
          valor_medio: 15.00,
          valor_maximo: 20.00,
          caminho_referencia: 'http://example.com',
        },
      });

      expect(item).toBeDefined();
      expect(item.id).toBeDefined();
      expect(item.produto).toBe('Produto Teste');
      expect(item.valor_minimo.toNumber()).toBe(10.50);
    });

    it('deve buscar itens orçamentários', async () => {
      // Criar alguns itens
      await prisma.itemOrcamentario.createMany({
        data: [
          {
            produto: 'Microfone',
            item: 'Microfone sem fio',
            unidade: 'UN',
            uf: 'SP',
            cidade: 'São Paulo',
            valor_minimo: 100,
            valor_medio: 150,
            valor_maximo: 200,
          },
          {
            produto: 'Microfone',
            item: 'Microfone com fio',
            unidade: 'UN',
            uf: 'RJ',
            cidade: 'Rio de Janeiro',
            valor_minimo: 50,
            valor_medio: 75,
            valor_maximo: 100,
          },
        ],
      });

      const items = await prisma.itemOrcamentario.findMany({
        where: {
          produto: 'Microfone',
        },
      });

      expect(items).toHaveLength(2);
    });

    it('deve respeitar a constraint de unicidade', async () => {
      const data = {
        produto: 'Produto Único',
        item: 'Item Único',
        unidade: 'UN',
        uf: 'SP',
        cidade: 'São Paulo',
        valor_minimo: 10,
        valor_medio: 15,
        valor_maximo: 20,
      };

      // Criar primeiro item
      await prisma.itemOrcamentario.create({ data });

      // Tentar criar item duplicado deve falhar
      await expect(
        prisma.itemOrcamentario.create({ data })
      ).rejects.toThrow();
    });

    it('deve fazer upsert corretamente', async () => {
      const uniqueData = {
        produto: 'Produto Upsert',
        item: 'Item Upsert',
        uf: 'SP',
        cidade: 'São Paulo',
      };

      // Primeiro upsert (create)
      const firstItem = await prisma.itemOrcamentario.upsert({
        where: {
          unique_item_location: uniqueData,
        },
        update: {
          valor_minimo: 100,
          valor_medio: 150,
          valor_maximo: 200,
        },
        create: {
          ...uniqueData,
          unidade: 'UN',
          valor_minimo: 10,
          valor_medio: 15,
          valor_maximo: 20,
        },
      });

      expect(firstItem.valor_minimo.toNumber()).toBe(10);

      // Segundo upsert (update)
      const secondItem = await prisma.itemOrcamentario.upsert({
        where: {
          unique_item_location: uniqueData,
        },
        update: {
          valor_minimo: 100,
          valor_medio: 150,
          valor_maximo: 200,
        },
        create: {
          ...uniqueData,
          unidade: 'UN',
          valor_minimo: 10,
          valor_medio: 15,
          valor_maximo: 20,
        },
      });

      expect(secondItem.id).toBe(firstItem.id); // Mesmo ID
      expect(secondItem.valor_minimo.toNumber()).toBe(100); // Valor atualizado
    });
  });

  describe('Extensão pg_trgm', () => {
    it('deve ter a extensão pg_trgm instalada', async () => {
      const result = await prisma.$queryRaw<Array<{ extname: string }>>`
        SELECT extname FROM pg_extension WHERE extname = 'pg_trgm';
      `;

      expect(result).toHaveLength(1);
      expect(result[0].extname).toBe('pg_trgm');
    });

    it('deve ter índices GIN criados', async () => {
      const result = await prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'itens_orcamentarios' 
        AND indexname LIKE '%_gin';
      `;

      expect(result.length).toBeGreaterThan(0);

      const indexNames = result.map(r => r.indexname);
      expect(indexNames).toContain('idx_itens_orcamentarios_produto_gin');
      expect(indexNames).toContain('idx_itens_orcamentarios_item_gin');
      expect(indexNames).toContain('idx_itens_orcamentarios_cidade_gin');
      expect(indexNames).toContain('idx_itens_orcamentarios_text_search_gin');
    });
  });

  describe('Busca com Full Text Search', () => {
    beforeEach(async () => {
      // Inserir dados de teste
      await prisma.itemOrcamentario.createMany({
        data: [
          {
            produto: 'Microfone Shure SM58',
            item: 'Microfone dinâmico cardioide',
            unidade: 'UN',
            uf: 'SP',
            cidade: 'São Paulo',
            valor_minimo: 500,
            valor_medio: 650,
            valor_maximo: 800,
          },
          {
            produto: 'Microfone AKG C414',
            item: 'Microfone condensador multipadrão',
            unidade: 'UN',
            uf: 'RJ',
            cidade: 'Rio de Janeiro',
            valor_minimo: 3000,
            valor_medio: 3500,
            valor_maximo: 4000,
          },
          {
            produto: 'Caixa de Som JBL',
            item: 'Caixa amplificada 15 polegadas',
            unidade: 'UN',
            uf: 'SP',
            cidade: 'Campinas',
            valor_minimo: 1500,
            valor_medio: 2000,
            valor_maximo: 2500,
          },
        ],
      });
    });

    it('deve buscar por similaridade usando pg_trgm', async () => {
      // Buscar por "microfon" (sem 'e' no final) - deve encontrar "Microfone"
      const result = await prisma.$queryRaw<Array<any>>`
        SELECT produto, item, similarity(produto, 'microfon') as sim
        FROM itens_orcamentarios
        WHERE produto % 'microfon'
        ORDER BY sim DESC;
      `;

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].produto).toContain('Microfone');
    });

    it('deve buscar em múltiplos campos com índice composto', async () => {
      const searchTerm = 'microfone são paulo';

      const result = await prisma.$queryRaw<Array<any>>`
        SELECT produto, item, cidade
        FROM itens_orcamentarios
        WHERE (produto || ' ' || item || ' ' || cidade) % ${searchTerm}
        ORDER BY similarity((produto || ' ' || item || ' ' || cidade), ${searchTerm}) DESC
        LIMIT 10;
      `;

      expect(result.length).toBeGreaterThan(0);
    });
  });
});
