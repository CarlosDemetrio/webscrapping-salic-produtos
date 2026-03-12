/**
 * Worker de scraping
 * Princípio: Single Responsibility - executa scraping em um navegador individual
 */

import { WebDriver } from 'selenium-webdriver';
import { ProdutoParaScraping, WorkerConfig } from '../types/scraper.types';
import { BrowserService } from '../services/browser.service';
import { ProdutoScraperService } from '../services/produto.scraper.service';
import { FileManager } from '../utils/file.manager';
import { ProdutoQueue } from '../queue/produto.queue';

export class ScraperWorker {
  private browserService: BrowserService;
  private fileManager: FileManager;
  private driver: WebDriver | null = null;

  constructor(
    private readonly config: WorkerConfig,
    private readonly baseUrl: string,
    private readonly outputDir: string,
    private readonly produtoQueue: ProdutoQueue
  ) {
    this.browserService = new BrowserService();
    this.fileManager = new FileManager();
  }

  /**
   * Inicia o worker e processa produtos da fila
   */
  async iniciar(): Promise<void> {
    try {
      // Cria o navegador
      this.driver = await this.browserService.criarNavegador();
      const produtoScraperService = new ProdutoScraperService(this.driver, this.baseUrl);

      // Processa produtos enquanto houver na fila
      while (this.produtoQueue.temProdutos()) {
        const produto = this.produtoQueue.proximoProduto();

        if (!produto) {
          break; // Fila foi esvaziada
        }

        await this.processarProduto(produto, produtoScraperService);
      }

    } finally {
      await this.finalizarWorker();
    }
  }

  /**
   * Processa um produto individual
   */
  private async processarProduto(
    produto: ProdutoParaScraping,
    scraperService: ProdutoScraperService
  ): Promise<void> {
    const nomeArquivo = this.fileManager.gerarNomeArquivo(
      produto.id,
      produto.nome,
      this.outputDir
    );

    try {
      // Verifica se já foi extraído
      const jaExiste = await this.fileManager.arquivoExiste(nomeArquivo);

      if (jaExiste) {
        console.log(
          `[Worker ${this.config.workerId}] ⏩ Pulando ${produto.nome} (Já extraído)`
        );
        return;
      }

      console.log(
        `[Worker ${this.config.workerId}] 🚀 Iniciando: ${produto.nome} ` +
        `(Restam ${this.produtoQueue.tamanho()} na fila)`
      );

      // Executa scraping
      const dadosDoProduto = await scraperService.scrapeProduto(produto);

      // Salva resultados
      await this.fileManager.salvarJSON(nomeArquivo, dadosDoProduto);

      console.log(
        `[Worker ${this.config.workerId}] 💾 Salvo: ${produto.nome} ` +
        `(${dadosDoProduto.length} registros)`
      );

    } catch (error) {
      console.error(
        `[Worker ${this.config.workerId}] ❌ Erro ao processar ${produto.nome}. ` +
        `Devolvendo para a fila...`
      );

      // Devolve para a fila para retry
      this.produtoQueue.devolverProduto(produto);
    }
  }

  /**
   * Finaliza o worker e fecha recursos
   */
  private async finalizarWorker(): Promise<void> {
    if (this.driver) {
      await this.browserService.fecharNavegador(this.driver);
    }

    console.log(
      `[Worker ${this.config.workerId}] 🛑 Finalizou seu trabalho e fechou o navegador.`
    );
  }
}
