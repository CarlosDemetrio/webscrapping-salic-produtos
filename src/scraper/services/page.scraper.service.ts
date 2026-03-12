/**
 * Serviço de scraping de páginas
 * Princípio: Single Responsibility - apenas lógica de extração de dados
 */

import { WebDriver, By, until } from 'selenium-webdriver';
import * as cheerio from 'cheerio';
import { ItemExtraido, ItemSelectOption, ProdutoParaScraping } from '../types/scraper.types';
import { limparValor } from '../utils/value.parser';

export class PageScraperService {
  private readonly WAIT_TIMEOUT = 15000;
  private readonly SHORT_WAIT = 1000;
  private readonly MEDIUM_WAIT = 2000;
  private readonly ITEM_TIMEOUT = 6000;

  constructor(
    private readonly driver: WebDriver,
    private readonly baseUrl: string
  ) {}

  /**
   * Navega para a página base
   */
  async navegarParaBase(): Promise<void> {
    await this.driver.get(this.baseUrl);
    await this.driver.sleep(this.MEDIUM_WAIT);
  }

  /**
   * Seleciona um produto no dropdown
   */
  async selecionarProduto(produto: ProdutoParaScraping): Promise<void> {
    const valor = `${produto.id}##@@${produto.nome}`;

    await this.driver.executeScript(`
      const sel = document.getElementById('SC_idproduto');
      if (sel) {
        sel.value = '${valor}';
        nm_refresh_idproduto();
      }
    `);
  }

  /**
   * Aguarda o carregamento dos itens do produto
   */
  async aguardarCarregamentoItens(): Promise<void> {
    await this.driver.wait(async () => {
      return await this.driver.executeScript(`
        const el = document.getElementById('SC_idplanilhaitem');
        return el && el.options.length > 1;
      `);
    }, this.WAIT_TIMEOUT);
  }

  /**
   * Obtém lista de itens disponíveis para o produto
   */
  async obterItensDisponiveis(): Promise<ItemSelectOption[]> {
    const itens = await this.driver.executeScript(`
      const select = document.getElementById('SC_idplanilhaitem');
      return Array.from(select.options)
        .filter(o => o.value.includes('##@@'))
        .map(o => ({ val: o.value, txt: o.text }));
    `);

    return itens as ItemSelectOption[];
  }

  /**
   * Seleciona um item e submete o formulário
   */
  async selecionarESubmeterItem(itemValue: string): Promise<void> {
    await this.driver.executeScript(`
      const sel = document.getElementById('SC_idplanilhaitem');
      if (sel) {
        sel.value = '${itemValue}';
        document.F1.bprocessa.value = 'pesq';
        nm_submit_form();
      }
    `);

    await this.driver.wait(until.elementLocated(By.className('scGridFieldOdd')), this.ITEM_TIMEOUT);
  }

  /**
   * Extrai dados da grid de resultados
   */
  async extrairDadosGrid(produto: ProdutoParaScraping, itemNome: string): Promise<ItemExtraido[]> {
    const html = await this.driver.getPageSource();
    const $ = cheerio.load(html);
    const dados: ItemExtraido[] = [];

    $('.scGridFieldOdd, .scGridFieldEven').each((_idx, el) => {
      const valorMedio = limparValor($(el).find('.css_preco_medio_grid_line').text().trim());

      if (valorMedio > 0) {
        dados.push({
          produto: produto.nome,
          item: itemNome,
          unidade: $(el).find('.css_unidade_grid_line').text().trim(),
          uf: $(el).find('.css_uf_grid_line').text().trim() || 'N/A',
          cidade: $(el).find('.css_cidade_grid_line').text().trim(),
          minimo: limparValor($(el).find('.css_preco_minimo_grid_line').text().trim()),
          medio: valorMedio,
          maximo: limparValor($(el).find('.css_preco_maximo_grid_line').text().trim()),
        });
      }
    });

    return dados;
  }

  /**
   * Reseta a página para o estado inicial com o produto selecionado
   */
  async resetarPaginaComProduto(produto: ProdutoParaScraping): Promise<void> {
    await this.driver.get(this.baseUrl);

    const valor = `${produto.id}##@@${produto.nome}`;
    await this.driver.executeScript(`
      const sel = document.getElementById('SC_idproduto');
      if (sel) {
        sel.value = '${valor}';
        nm_refresh_idproduto();
      }
    `);

    await this.driver.sleep(this.SHORT_WAIT);
  }
}
