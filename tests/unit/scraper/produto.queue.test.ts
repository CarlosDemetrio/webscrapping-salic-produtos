/**
 * Testes unitários para ProdutoQueue
 * Testa o gerenciamento de fila baseado no comportamento do script original
 */

import { ProdutoQueue } from '../../../src/scraper/queue/produto.queue';
import { ProdutoParaScraping } from '../../../src/scraper/types/scraper.types';

describe('ProdutoQueue', () => {
  const criarProdutosMock = (): ProdutoParaScraping[] => [
    { id: '154', nome: 'Aplicativo Cultural - AUDIOVISUAL' },
    { id: '51', nome: 'Apresentação Musical' },
    { id: '59', nome: 'Banco de Dados' },
  ];

  describe('Inicialização', () => {
    it('deve criar fila com cópia dos produtos', () => {
      const queue = new ProdutoQueue(criarProdutosMock());
      expect(queue.tamanho()).toBe(3);

      // Modificar array original não deve afetar a fila
      criarProdutosMock().push({ id: '999', nome: 'Novo Produto' });
      expect(queue.tamanho()).toBe(3);
    });

    it('deve criar fila vazia', () => {
      const queue = new ProdutoQueue([]);
      expect(queue.tamanho()).toBe(0);
      expect(queue.temProdutos()).toBe(false);
    });
  });

  describe('temProdutos', () => {
    it('deve retornar true quando há produtos', () => {
      const queue = new ProdutoQueue(criarProdutosMock());
      expect(queue.temProdutos()).toBe(true);
    });

    it('deve retornar false quando não há produtos', () => {
      const queue = new ProdutoQueue([]);
      expect(queue.temProdutos()).toBe(false);
    });

    it('deve replicar comportamento do script original (produtosFila.length > 0)', () => {
      const queue = new ProdutoQueue(criarProdutosMock());

      // Script original: while (produtosFila.length > 0)
      let contador = 0;
      while (queue.temProdutos()) {
        queue.proximoProduto();
        contador++;
      }

      expect(contador).toBe(3);
      expect(queue.temProdutos()).toBe(false);
    });
  });

  describe('proximoProduto', () => {
    it('deve retornar produtos em ordem FIFO', () => {
      const queue = new ProdutoQueue(criarProdutosMock());

      expect(queue.proximoProduto()).toEqual(criarProdutosMock()[0]);
      expect(queue.proximoProduto()).toEqual(criarProdutosMock()[1]);
      expect(queue.proximoProduto()).toEqual(criarProdutosMock()[2]);
    });

    it('deve reduzir tamanho da fila', () => {
      const queue = new ProdutoQueue(criarProdutosMock());
      expect(queue.tamanho()).toBe(3);

      queue.proximoProduto();
      expect(queue.tamanho()).toBe(2);

      queue.proximoProduto();
      expect(queue.tamanho()).toBe(1);
    });

    it('deve retornar undefined quando fila está vazia', () => {
      const queue = new ProdutoQueue([]);
      expect(queue.proximoProduto()).toBeUndefined();
    });

    it('deve replicar comportamento do script original (produtosFila.shift())', () => {
      const queue = new ProdutoQueue(criarProdutosMock());

      // Script original: const produto = produtosFila.shift();
      const produto = queue.proximoProduto();

      expect(produto).toBeDefined();
      expect(produto?.id).toBe('154');
      expect(queue.tamanho()).toBe(2);
    });
  });

  describe('devolverProduto', () => {
    it('deve adicionar produto no final da fila', () => {
      const queue = new ProdutoQueue(criarProdutosMock());

      const primeiro = queue.proximoProduto()!;
      queue.devolverProduto(primeiro);

      expect(queue.tamanho()).toBe(3);
    });

    it('deve permitir retry de produtos com erro', () => {
      const queue = new ProdutoQueue(criarProdutosMock());

      const produto1 = queue.proximoProduto()!;
      queue.proximoProduto(); // produto2

      // Simula erro no produto1, devolve para fila
      queue.devolverProduto(produto1);

      expect(queue.tamanho()).toBe(2);

      // Próximos produtos devem ser: produto3, produto1
      const produto3 = queue.proximoProduto()!;
      expect(produto3.id).toBe('59');

      const produto1Retry = queue.proximoProduto()!;
      expect(produto1Retry.id).toBe('154');
    });

    it('deve replicar comportamento do script original (produtosFila.push())', () => {
      const queue = new ProdutoQueue([criarProdutosMock()[0]]);

      const produto = queue.proximoProduto()!;
      expect(queue.tamanho()).toBe(0);

      // Script original: produtosFila.push(produto);
      queue.devolverProduto(produto);
      expect(queue.tamanho()).toBe(1);
      expect(queue.proximoProduto()).toEqual(produto);
    });
  });

  describe('tamanho', () => {
    it('deve retornar tamanho correto da fila', () => {
      const queue = new ProdutoQueue(criarProdutosMock());
      expect(queue.tamanho()).toBe(3);

      queue.proximoProduto();
      expect(queue.tamanho()).toBe(2);

      queue.proximoProduto();
      expect(queue.tamanho()).toBe(1);

      queue.proximoProduto();
      expect(queue.tamanho()).toBe(0);
    });

    it('deve replicar comportamento do script original para log', () => {
      const queue = new ProdutoQueue(criarProdutosMock());

      // Script original: console.log(`Restam ${produtosFila.length} na fila`)
      queue.proximoProduto();
      expect(queue.tamanho()).toBe(2); // Restam 2 na fila
    });
  });

  describe('listarProdutos', () => {
    it('deve retornar cópia da fila atual', () => {
      const queue = new ProdutoQueue(criarProdutosMock());
      const lista = queue.listarProdutos();

      expect(lista).toHaveLength(3);
      expect(lista[0]).toEqual(criarProdutosMock()[0]);
    });

    it('deve ser readonly (não afetar fila original)', () => {
      const queue = new ProdutoQueue(criarProdutosMock());
      const lista = queue.listarProdutos() as ProdutoParaScraping[];

      // Tentar modificar lista não deve afetar fila
      lista.push({ id: '999', nome: 'Teste' });

      expect(queue.tamanho()).toBe(3);
    });
  });

  describe('Comportamento de concorrência (múltiplos workers)', () => {
    it('deve processar produtos em paralelo sem conflito', () => {
      const muitosProdutos = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        nome: `Produto ${i}`,
      }));

      const queue = new ProdutoQueue(muitosProdutos);

      // Simula 3 workers pegando produtos simultaneamente
      const worker1 = queue.proximoProduto();
      const worker2 = queue.proximoProduto();
      const worker3 = queue.proximoProduto();

      expect(worker1?.id).toBe('0');
      expect(worker2?.id).toBe('1');
      expect(worker3?.id).toBe('2');
      expect(queue.tamanho()).toBe(7);
    });

    it('deve replicar comportamento do script original com múltiplos workers', () => {
      // Script original: múltiplos workers compartilham mesma fila global
      const queue = new ProdutoQueue(criarProdutosMock());

      // Worker 1 pega produto
      const produtoWorker1 = queue.proximoProduto();
      expect(produtoWorker1?.id).toBe('154');
      expect(queue.tamanho()).toBe(2);

      // Worker 2 pega próximo produto
      const produtoWorker2 = queue.proximoProduto();
      expect(produtoWorker2?.id).toBe('51');
      expect(queue.tamanho()).toBe(1);

      // Worker 1 falha e devolve
      queue.devolverProduto(produtoWorker1!);
      expect(queue.tamanho()).toBe(2);

      // Worker 3 pega próximo da fila
      const produtoWorker3 = queue.proximoProduto();
      expect(produtoWorker3?.id).toBe('59');
    });
  });

  describe('Casos extremos', () => {
    it('deve lidar com fila sendo esvaziada e reabastecida', () => {
      const queue = new ProdutoQueue([criarProdutosMock()[0]]);

      const produto = queue.proximoProduto()!;
      expect(queue.temProdutos()).toBe(false);

      queue.devolverProduto(produto);
      expect(queue.temProdutos()).toBe(true);
    });

    it('deve lidar com múltiplas devoluções', () => {
      const queue = new ProdutoQueue([criarProdutosMock()[0]]);

      const produto = queue.proximoProduto()!;

      // Múltiplas tentativas de retry
      queue.devolverProduto(produto);
      queue.devolverProduto(produto);
      queue.devolverProduto(produto);

      expect(queue.tamanho()).toBe(3);
    });
  });
});
