/**
 * Gerenciador de fila de produtos
 * Princípio: Single Responsibility - apenas gerenciamento da fila
 */

import { ProdutoParaScraping } from '../types/scraper.types';

export class ProdutoQueue {
  private fila: ProdutoParaScraping[];

  constructor(produtos: ProdutoParaScraping[]) {
    this.fila = [...produtos]; // Cria cópia para não modificar original
  }

  /**
   * Verifica se ainda há produtos na fila
   */
  temProdutos(): boolean {
    return this.fila.length > 0;
  }

  /**
   * Remove e retorna o próximo produto da fila
   */
  proximoProduto(): ProdutoParaScraping | undefined {
    return this.fila.shift();
  }

  /**
   * Devolve um produto para o final da fila (para retry)
   */
  devolverProduto(produto: ProdutoParaScraping): void {
    this.fila.push(produto);
  }

  /**
   * Retorna quantidade de produtos restantes
   */
  tamanho(): number {
    return this.fila.length;
  }

  /**
   * Retorna snapshot atual da fila (apenas leitura)
   */
  listarProdutos(): readonly ProdutoParaScraping[] {
    return [...this.fila];
  }
}
