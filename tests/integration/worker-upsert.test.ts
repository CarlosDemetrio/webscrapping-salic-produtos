import { test, describe, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import prisma from '../../src/config/database';
import { Decimal } from '@prisma/client/runtime/library';

interface ItemExtraido {
  produto: string;
  item: string;
  unidade: string;
  uf: string;
  cidade: string;
  valor_minimo: number;
  valor_medio: number;
  valor_maximo: number;
  caminho_referencia?: string;
}

// Replicar função do worker para testar
async function upsertItensOrcamentarios(itens: ItemExtraido[]): Promise<number> {
  if (itens.length === 0) return 0;

  let sucessos = 0;
  const BATCH_SIZE = 50;

  for (let i = 0; i < itens.length; i += BATCH_SIZE) {
    const lote = itens.slice(i, i + BATCH_SIZE);

    const resultados = await Promise.allSettled(
      lote.map(async (item) => {
        await prisma.itemOrcamentario.upsert({
          where: {
            unique_item_location: {
              produto: item.produto,
              item: item.item,
              uf: item.uf,
              cidade: item.cidade,
            },
          },
          update: {
            unidade: item.unidade,
            valor_minimo: new Decimal(item.valor_minimo),
            valor_medio: new Decimal(item.valor_medio),
            valor_maximo: new Decimal(item.valor_maximo),
            caminho_referencia: item.caminho_referencia,
            data_extracao: new Date(),
          },
          create: {
            produto: item.produto,
            item: item.item,
            unidade: item.unidade,
            uf: item.uf,
            cidade: item.cidade,
            valor_minimo: new Decimal(item.valor_minimo),
            valor_medio: new Decimal(item.valor_medio),
            valor_maximo: new Decimal(item.valor_maximo),
            caminho_referencia: item.caminho_referencia,
            data_extracao: new Date(),
          },
        });
        return true;
      })
    );

    resultados.forEach((result) => {
      if (result.status === 'fulfilled') sucessos++;
    });
  }

  return sucessos;
}

describe('Worker Upsert Integration', () => {
  beforeAll(async () => await prisma.$connect());
  afterAll(async () => await prisma.$disconnect());
  beforeEach(async () => await prisma.itemOrcamentario.deleteMany({}));

  describe('CREATE - Inserção', () => {
    test('deve inserir novo item', async () => {
      const itens: ItemExtraido[] = [{
        produto: 'Mouse',
        item: 'Mouse USB',
        unidade: 'UN',
        uf: 'SP',
        cidade: 'São Paulo',
        valor_minimo: 15.00,
        valor_medio: 25.00,
        valor_maximo: 35.00,
      }];

      const sucessos = await upsertItensOrcamentarios(itens);
      expect(sucessos).toBe(1);

      const item = await prisma.itemOrcamentario.findFirst({ where: { produto: 'Mouse' } });
      expect(item).not.toBeNull();
      expect(Number(item?.valor_minimo)).toBe(15.00);
    });

    test('deve inserir múltiplos itens', async () => {
      const itens: ItemExtraido[] = [
        {
          produto: 'Mouse',
          item: 'Mouse USB',
          unidade: 'UN',
          uf: 'SP',
          cidade: 'São Paulo',
          valor_minimo: 10.00,
          valor_medio: 20.00,
          valor_maximo: 30.00,
        },
        {
          produto: 'Teclado',
          item: 'Teclado Mecânico',
          unidade: 'UN',
          uf: 'RJ',
          cidade: 'Rio de Janeiro',
          valor_minimo: 100.00,
          valor_medio: 200.00,
          valor_maximo: 300.00,
        },
      ];

      const sucessos = await upsertItensOrcamentarios(itens);
      expect(sucessos).toBe(2);

      const count = await prisma.itemOrcamentario.count();
      expect(count).toBe(2);
    });
  });

  describe('UPDATE - Atualização', () => {
    test('deve atualizar item existente', async () => {
      await prisma.itemOrcamentario.create({
        data: {
          produto: 'Mouse',
          item: 'Mouse USB',
          unidade: 'UN',
          uf: 'SP',
          cidade: 'São Paulo',
          valor_minimo: 10.00,
          valor_medio: 15.00,
          valor_maximo: 20.00,
        },
      });

      const itens: ItemExtraido[] = [{
        produto: 'Mouse',
        item: 'Mouse USB',
        unidade: 'UN',
        uf: 'SP',
        cidade: 'São Paulo',
        valor_minimo: 12.00,
        valor_medio: 18.00,
        valor_maximo: 25.00,
      }];

      await upsertItensOrcamentarios(itens);

      const count = await prisma.itemOrcamentario.count();
      expect(count).toBe(1);

      const item = await prisma.itemOrcamentario.findFirst({ where: { produto: 'Mouse' } });
      expect(Number(item?.valor_minimo)).toBe(12.00);
    });
  });

  describe('Batch Processing', () => {
    test('deve processar 100 itens em lotes', async () => {
      const itens: ItemExtraido[] = Array.from({ length: 100 }, (_, i) => ({
        produto: `Produto ${i}`,
        item: `Item ${i}`,
        unidade: 'UN',
        uf: 'SP',
        cidade: 'São Paulo',
        valor_minimo: 10 + i,
        valor_medio: 20 + i,
        valor_maximo: 30 + i,
      }));

      const sucessos = await upsertItensOrcamentarios(itens);
      expect(sucessos).toBe(100);

      const count = await prisma.itemOrcamentario.count();
      expect(count).toBe(100);
    });
  });

  describe('Constraint Única', () => {
    test('deve prevenir duplicatas', async () => {
      const item = {
        produto: 'Mouse',
        item: 'Mouse USB',
        unidade: 'UN',
        uf: 'SP',
        cidade: 'São Paulo',
        valor_minimo: 10.00,
        valor_medio: 20.00,
        valor_maximo: 30.00,
      };

      await upsertItensOrcamentarios([item]);
      await upsertItensOrcamentarios([item]);

      const count = await prisma.itemOrcamentario.count();
      expect(count).toBe(1);
    });

    test('deve permitir mesmo produto em cidades diferentes', async () => {
      const itens: ItemExtraido[] = [
        {
          produto: 'Mouse',
          item: 'Mouse USB',
          unidade: 'UN',
          uf: 'SP',
          cidade: 'São Paulo',
          valor_minimo: 10.00,
          valor_medio: 20.00,
          valor_maximo: 30.00,
        },
        {
          produto: 'Mouse',
          item: 'Mouse USB',
          unidade: 'UN',
          uf: 'SP',
          cidade: 'Campinas',
          valor_minimo: 12.00,
          valor_medio: 22.00,
          valor_maximo: 32.00,
        },
      ];

      await upsertItensOrcamentarios(itens);

      const count = await prisma.itemOrcamentario.count();
      expect(count).toBe(2);
    });
  });
});
