/**
 * Testes unitários para BrowserService
 * Testa criação e configuração de navegadores
 */

import { BrowserService } from '../../../src/scraper/services/browser.service';

describe('BrowserService', () => {
  let browserService: BrowserService;

  beforeEach(() => {
    browserService = new BrowserService();
  });

  describe('criarNavegador', () => {
    it('deve ser definido', () => {
      expect(browserService.criarNavegador).toBeDefined();
    });

    // Nota: Testes reais de Selenium requerem ChromeDriver instalado
    // Estes são testes de estrutura, não executam Selenium real

    it('deve retornar promessa de WebDriver', () => {
      const resultado = browserService.criarNavegador();
      expect(resultado).toBeInstanceOf(Promise);
    });
  });

  describe('fecharNavegador', () => {
    it('deve ser definido', () => {
      expect(browserService.fecharNavegador).toBeDefined();
    });

    it('deve lidar com erro ao fechar navegador', async () => {
      const driverMock = {
        quit: jest.fn().mockRejectedValue(new Error('Erro ao fechar')),
      } as any;

      // Não deve lançar erro
      await expect(browserService.fecharNavegador(driverMock)).resolves.not.toThrow();
    });
  });

  describe('Configurações do Chrome', () => {
    it('deve aplicar configurações headless', () => {
      // Verifica que as configurações são importadas corretamente
      const { CHROME_OPTIONS } = require('../../../src/scraper/config/scraper.config');

      expect(CHROME_OPTIONS).toContain('--headless=new');
    });

    it('deve aplicar configurações anti-detecção', () => {
      const { CHROME_OPTIONS } = require('../../../src/scraper/config/scraper.config');

      expect(CHROME_OPTIONS).toContain('--disable-blink-features=AutomationControlled');
      expect(CHROME_OPTIONS.some((opt: string) => opt.includes('user-agent'))).toBe(true);
    });

    it('deve replicar configurações do script original', () => {
      // Script original:
      // options.addArguments('--headless=new');
      // options.addArguments('--disable-blink-features=AutomationControlled');
      // options.addArguments('user-agent=Mozilla/5.0...');
      // options.excludeSwitches('enable-automation');

      const config = require('../../../src/scraper/config/scraper.config');

      expect(config.CHROME_OPTIONS).toContain('--headless=new');
      expect(config.CHROME_OPTIONS).toContain('--disable-blink-features=AutomationControlled');
      expect(config.CHROME_EXCLUDED_SWITCHES).toContain('enable-automation');
      expect(config.CHROME_PREFS).toHaveProperty('useAutomationExtension', false);
    });
  });
});
