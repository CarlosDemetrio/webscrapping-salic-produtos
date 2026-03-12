/**
 * Orquestrador de cluster de workers
 * Princípio: Single Responsibility - gerencia múltiplos workers
 */

import { ScraperConfig, WorkerConfig } from '../types/scraper.types';
import { ScraperWorker } from '../workers/scraper.worker';
import { ProdutoQueue } from '../queue/produto.queue';
import { FileManager } from '../utils/file.manager';

export class ClusterOrchestrator {
  private fileManager: FileManager;

  constructor(
    private readonly config: ScraperConfig,
    private readonly produtoQueue: ProdutoQueue
  ) {
    this.fileManager = new FileManager();
  }

  /**
   * Inicia o cluster de workers
   */
  async iniciar(): Promise<void> {
    // Cria pasta de destino
    await this.fileManager.criarDiretorio(this.config.outputDir);

    console.log(
      `\n🎻 Iniciando Maestro com ${this.config.maxWorkers} Workers Simultâneos...\n`
    );

    const workers: Promise<void>[] = [];
    const numWorkers = Math.min(this.config.maxWorkers, this.produtoQueue.tamanho());

    // Cria e inicia workers
    for (let i = 1; i <= numWorkers; i++) {
      const workerPromise = this.criarEIniciarWorker(i);
      workers.push(workerPromise);

      // Delay para não iniciar todos ao mesmo tempo
      await this.delay(this.config.workerStartDelay);
    }

    // Aguarda todos os workers finalizarem
    await Promise.all(workers);

    console.log('\n🏁 TODOS OS PRODUTOS FORAM EXTRAÍDOS COM SUCESSO!');
  }

  /**
   * Cria e inicia um worker individual
   */
  private async criarEIniciarWorker(workerId: number): Promise<void> {
    const workerConfig: WorkerConfig = {
      workerId,
      maxRetries: 3,
      timeoutMs: 30000,
    };

    const worker = new ScraperWorker(
      workerConfig,
      this.config.baseUrl,
      this.config.outputDir,
      this.produtoQueue
    );

    await worker.iniciar();
  }

  /**
   * Utilitário para delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
