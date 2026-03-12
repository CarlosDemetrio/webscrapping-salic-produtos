/**
 * Serviço de scraping de produtos
 * Princípio: Single Responsibility - orquestra o scraping de um produto completo
 */

import { WebDriver } from 'selenium-webdriver';
import { ItemExtraido, ProdutoParaScraping } from '../types/scraper.types';
import { PageScraperService } from './page.scraper.service';

export class ProdutoScraperService {
  private pageScraperService: PageScraperService;

  constructor(
    private readonly driver: WebDriver,
    private readonly baseUrl: string
  ) {
    this.pageScraperService = new PageScraperService(this.driver, this.baseUrl);
  }

  /**
   * Executa o scraping completo de um produto
   */
  async scrapeProduto(produto: ProdutoParaScraping): Promise<ItemExtraido[]> {
    const dadosDoProduto: ItemExtraido[] = [];

    try {
      // 1. Navega para a página base
      await this.pageScraperService.navegarParaBase();

      // 2. Seleciona o produto
      await this.pageScraperService.selecionarProduto(produto);

      // 3. Aguarda carregamento dos itens
      await this.pageScraperService.aguardarCarregamentoItens();

      // 4. Obtém lista de itens disponíveis
      const itens = await this.pageScraperService.obterItensDisponiveis();

      // 5. Processa cada item
      for (const item of itens) {
        try {
          // 5.1. Seleciona e submete o item
          await this.pageScraperService.selecionarESubmeterItem(item.val);

          // 5.2. Extrai dados da grid
          const dadosItem = await this.pageScraperService.extrairDadosGrid(produto, item.txt);
          dadosDoProduto.push(...dadosItem);

          // 5.3. Reseta a página para o próximo item
          await this.pageScraperService.resetarPaginaComProduto(produto);

        } catch (error) {
          // Timeout no item específico, ignora e continua com próximo
          console.warn(`   ⚠️  Timeout no item: ${item.txt}`);
          await this.pageScraperService.navegarParaBase();
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      return dadosDoProduto;

    } catch (error) {
      console.error(`   ❌ Erro ao processar produto ${produto.nome}:`, error);
      throw error;
    }
  }
}
