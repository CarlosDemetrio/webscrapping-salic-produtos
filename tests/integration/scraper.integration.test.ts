/**
 * Testes de integração para o sistema de scraping
 * Testa comportamento end-to-end baseado no script original
 */

import { ProdutoQueue } from '../../src/scraper/queue/produto.queue';
import { FileManager } from '../../src/scraper/utils/file.manager';
import { ProdutoParaScraping, ItemExtraido } from '../../src/scraper/types/scraper.types';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Scraper Integration - Fluxo Completo', () => {
  const testDir = './test-integration-scraper';
  const fileManager = new FileManager();

  beforeAll(async () => {
    try {
      await fs.rm(testDir, { recursive: true });
    } catch (error) {
      // Ignora se não existir
    }
    await fileManager.criarDiretorio(testDir);
  });

  afterAll(async () => {
    try {
      await fs.rm(testDir, { recursive: true });
    } catch (error) {
      // Ignora erros
    }
  });

  describe('Simulação do fluxo do script original', () => {
    it('deve processar fila de produtos como no script original', async () => {
      // Script original: produtosFila array global compartilhado
      const produtos: ProdutoParaScraping[] = [
        { id: '154', nome: 'Aplicativo Cultural - AUDIOVISUAL' },
        { id: '51', nome: 'Apresentação Musical' },
        { id: '59', nome: 'Banco de Dados' },
      ];

      const queue = new ProdutoQueue(produtos);

      // Simula múltiplos workers processando
      const processados: string[] = [];

      // Worker 1
      while (queue.temProdutos()) {
        const produto = queue.proximoProduto();
        if (produto) {
          processados.push(produto.id);
        }
      }

      expect(processados).toEqual(['154', '51', '59']);
      expect(queue.temProdutos()).toBe(false);
    });

    it('deve criar arquivos com nomes corretos', async () => {
      const produtos: ProdutoParaScraping[] = [
        { id: '154', nome: 'Aplicativo Cultural - AUDIOVISUAL' },
      ];

      const queue = new ProdutoQueue(produtos);
      const produto = queue.proximoProduto()!;

      const nomeArquivo = fileManager.gerarNomeArquivo(
        produto.id,
        produto.nome,
        testDir
      );

      await fileManager.salvarJSON(nomeArquivo, []);

      expect(await fileManager.arquivoExiste(nomeArquivo)).toBe(true);
      expect(nomeArquivo).toContain('Produto_154_');
      expect(nomeArquivo).toMatch(/\.json$/);
    });

    it('deve pular produtos já extraídos', async () => {
      const produtos: ProdutoParaScraping[] = [
        { id: '100', nome: 'Produto Teste' },
      ];

      const queue = new ProdutoQueue(produtos);
      const produto = queue.proximoProduto()!;

      const nomeArquivo = fileManager.gerarNomeArquivo(
        produto.id,
        produto.nome,
        testDir
      );

      // Primeira execução: não existe
      const existeAntes = await fileManager.arquivoExiste(nomeArquivo);
      expect(existeAntes).toBe(false);

      // Salva arquivo (simula primeira extração)
      await fileManager.salvarJSON(nomeArquivo, []);

      // Segunda execução: existe (deve pular)
      const existeDepois = await fileManager.arquivoExiste(nomeArquivo);
      expect(existeDepois).toBe(true);

      // Script original faria: continue;
    });

    it('deve devolver produto para fila em caso de erro', async () => {
      const produtos: ProdutoParaScraping[] = [
        { id: '1', nome: 'Produto 1' },
        { id: '2', nome: 'Produto 2' },
        { id: '3', nome: 'Produto 3' },
      ];

      const queue = new ProdutoQueue(produtos);

      // Worker processa produto 1
      const produto1 = queue.proximoProduto()!;
      expect(produto1.id).toBe('1');

      // Worker processa produto 2
      const produto2 = queue.proximoProduto()!;
      expect(produto2.id).toBe('2');

      // Simula erro no produto 1, devolve para fila
      queue.devolverProduto(produto1);

      // Próximos: produto 3, produto 1 (retry)
      const produto3 = queue.proximoProduto()!;
      expect(produto3.id).toBe('3');

      const produto1Retry = queue.proximoProduto()!;
      expect(produto1Retry.id).toBe('1');
    });
  });

  describe('Simulação de múltiplos workers', () => {
    it('deve simular 3 workers processando em paralelo', async () => {
      const produtos: ProdutoParaScraping[] = Array.from({ length: 9 }, (_, i) => ({
        id: `${i + 1}`,
        nome: `Produto ${i + 1}`,
      }));

      const queue = new ProdutoQueue(produtos);

      // Simula 3 workers pegando produtos simultaneamente
      const worker1Produtos: string[] = [];
      const worker2Produtos: string[] = [];
      const worker3Produtos: string[] = [];

      // Cada worker processa 3 produtos
      for (let i = 0; i < 3; i++) {
        const p1 = queue.proximoProduto();
        if (p1) worker1Produtos.push(p1.id);

        const p2 = queue.proximoProduto();
        if (p2) worker2Produtos.push(p2.id);

        const p3 = queue.proximoProduto();
        if (p3) worker3Produtos.push(p3.id);
      }

      expect(worker1Produtos).toHaveLength(3);
      expect(worker2Produtos).toHaveLength(3);
      expect(worker3Produtos).toHaveLength(3);

      // Todos diferentes
      const todos = [...worker1Produtos, ...worker2Produtos, ...worker3Produtos];
      const unicos = new Set(todos);
      expect(unicos.size).toBe(9);
    });
  });

  describe('Comportamento de limparValor integrado', () => {
    it('deve processar valores como no script original', () => {
      const { limparValor } = require('../../src/scraper/utils/value.parser');

      // Simula extração de valores da página
      const valoresPagina = [
        'R$ 150,00',
        'R$ 1.500,50',
        '&nbsp;',
        'R$ 10.250,75',
      ];

      const valoresProcessados = valoresPagina.map(limparValor);

      expect(valoresProcessados[0]).toBe(150.00);
      expect(valoresProcessados[1]).toBe(1500.50);
      expect(valoresProcessados[2]).toBe(0);
      expect(valoresProcessados[3]).toBe(10250.75);
    });

    it('deve filtrar valores zerados', () => {
      const { limparValor } = require('../../src/scraper/utils/value.parser');

      // Script original: if (valorMedio > 0) { adiciona }
      const valores = ['R$ 150,00', '&nbsp;', 'R$ 0,00', 'R$ 200,00'];
      const valoresFiltrados = valores
        .map(limparValor)
          // @ts-ignore
        .filter((v: number) => v > 0);

      expect(valoresFiltrados).toEqual([150, 200]);
    });
  });

  describe('Simulação completa de execução', () => {
    it('deve simular execução completa do script original', async () => {
      // Script original: iniciarCluster()
      const PRODUTOS: ProdutoParaScraping[] = [
        { id: '154', nome: 'Aplicativo Cultural - AUDIOVISUAL' },
        { id: '51', nome: 'Apresentação Musical' },
      ];

      const MAX_WORKERS = 2;
      const queue = new ProdutoQueue(PRODUTOS);

      // 1. Cria pasta de destino
      await fileManager.criarDiretorio(testDir);

      // 2. Simula workers processando
      const workersPromises = [];

      for (let workerId = 1; workerId <= MAX_WORKERS; workerId++) {
        const workerPromise = (async () => {
          const processados: string[] = [];

          while (queue.temProdutos()) {
            const produto = queue.proximoProduto();
            if (!produto) break;

            // Verifica se já foi extraído
            const nomeArquivo = fileManager.gerarNomeArquivo(
              produto.id,
              produto.nome,
              testDir
            );

            const jaExiste = await fileManager.arquivoExiste(nomeArquivo);
            if (jaExiste) {
              continue; // Pula
            }

            // Simula scraping (dados vazios para teste)
            const dados: ItemExtraido[] = [];

            // Salva arquivo
            await fileManager.salvarJSON(nomeArquivo, dados);
            processados.push(produto.id);
          }

          return processados;
        })();

        workersPromises.push(workerPromise);

        // Delay entre workers (script original: 2000ms)
        await new Promise(r => setTimeout(r, 10));
      }

      // 3. Aguarda todos os workers
      const resultados = await Promise.all(workersPromises);

      // 4. Verifica resultados
      const todosProdutos = resultados.flat();
      // Pode haver race condition onde um produto já foi salvo por outro worker
      expect(todosProdutos.length).toBeGreaterThanOrEqual(1);
      expect(todosProdutos.length).toBeLessThanOrEqual(2);

      // Verifica que contém pelo menos um produto
      const produtosUnicos = new Set(todosProdutos);
      expect(produtosUnicos.size).toBeGreaterThanOrEqual(1);

      // 5. Verifica arquivos criados (todos devem existir independente de race condition)
      for (const produto of PRODUTOS) {
        const nomeArquivo = fileManager.gerarNomeArquivo(
          produto.id,
          produto.nome,
          testDir
        );
        expect(await fileManager.arquivoExiste(nomeArquivo)).toBe(true);
      }
    });

    it('deve respeitar ordem FIFO da fila', async () => {
      const produtos: ProdutoParaScraping[] = [
        { id: '1', nome: 'Primeiro' },
        { id: '2', nome: 'Segundo' },
        { id: '3', nome: 'Terceiro' },
        { id: '4', nome: 'Quarto' },
        { id: '5', nome: 'Quinto' },
      ];

      const queue = new ProdutoQueue(produtos);
      const ordem: string[] = [];

      while (queue.temProdutos()) {
        const produto = queue.proximoProduto();
        if (produto) {
          ordem.push(produto.id);
        }
      }

      expect(ordem).toEqual(['1', '2', '3', '4', '5']);
    });
  });

  describe('Casos extremos e edge cases', () => {
    it('deve lidar com nome de produto com caracteres especiais', async () => {
      const produto: ProdutoParaScraping = {
        id: '999',
        nome: 'Produto/Com\\Muitos:Caracteres*Especiais?<>|"',
      };

      const nomeArquivo = fileManager.gerarNomeArquivo(
        produto.id,
        produto.nome,
        testDir
      );

      // Pega apenas o nome do arquivo (sem caminho do diretório)
      const nomeArquivoApenas = path.basename(nomeArquivo);

      // Não deve conter caracteres inválidos no nome do arquivo
      expect(nomeArquivoApenas).not.toContain('/');
      expect(nomeArquivoApenas).not.toContain('\\');
      expect(nomeArquivoApenas).not.toContain(':');
      expect(nomeArquivoApenas).not.toContain('*');
      expect(nomeArquivoApenas).not.toContain('?');
      expect(nomeArquivoApenas).not.toContain('<');
      expect(nomeArquivoApenas).not.toContain('>');
      expect(nomeArquivoApenas).not.toContain('|');
      expect(nomeArquivoApenas).not.toContain('"');

      // Deve ser possível criar o arquivo
      await expect(fileManager.salvarJSON(nomeArquivo, [])).resolves.not.toThrow();
    });

    it('deve lidar com fila vazia', async () => {
      const queue = new ProdutoQueue([]);

      expect(queue.temProdutos()).toBe(false);
      expect(queue.proximoProduto()).toBeUndefined();
      expect(queue.tamanho()).toBe(0);
    });

    it('deve lidar com produto sem dados extraídos', async () => {
      const nomeArquivo = path.join(testDir, 'produto-vazio.json');
      await fileManager.salvarJSON(nomeArquivo, []);

      const conteudo = await fs.readFile(nomeArquivo, 'utf-8');
      expect(JSON.parse(conteudo)).toEqual([]);
    });
  });
});
