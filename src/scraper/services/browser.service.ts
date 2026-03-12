/**
 * Serviço de gerenciamento do navegador
 * Princípio: Single Responsibility - apenas configuração e criação do navegador
 */

import { Builder, Browser, WebDriver } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import { CHROME_OPTIONS, CHROME_PREFS, CHROME_EXCLUDED_SWITCHES } from '../config/scraper.config';

export class BrowserService {
  /**
   * Cria e configura uma nova instância do navegador
   */
  async criarNavegador(): Promise<WebDriver> {
    const options = new chrome.Options();

    // Adiciona argumentos do Chrome
    CHROME_OPTIONS.forEach(option => options.addArguments(option));

    // Exclui switches
    CHROME_EXCLUDED_SWITCHES.forEach(sw => options.excludeSwitches(sw));

    // Define preferências
    options.setUserPreferences(CHROME_PREFS);

    return await new Builder()
      .forBrowser(Browser.CHROME)
      .setChromeOptions(options)
      .build();
  }

  /**
   * Fecha o navegador de forma segura
   */
  async fecharNavegador(driver: WebDriver): Promise<void> {
    try {
      await driver.quit();
    } catch (error) {
      console.error('Erro ao fechar navegador:', error);
    }
  }
}
