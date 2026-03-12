/**
 * Configurações centralizadas para o scraper
 * Princípio: Single Responsibility - apenas configurações
 */

import { ScraperConfig } from '../types/scraper.types';

export const SCRAPER_CONFIG: ScraperConfig = {
  baseUrl: 'https://aplicacoes.cultura.gov.br/comparar/grid_ItemOrcamentario_PorProduto_ValorMedio/grid_ItemOrcamentario_PorProduto_ValorMedio.php',
  outputDir: './extracao_salicneet-teste',
  maxWorkers: parseInt(process.env.MAX_WORKERS || '3', 10),
  workerStartDelay: 2000,
};

// Configurações do Chrome para scraping
export const CHROME_OPTIONS = [
  '--headless=new',
  '--disable-blink-features=AutomationControlled',
  'user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
];

export const CHROME_PREFS = {
  useAutomationExtension: false,
};

export const CHROME_EXCLUDED_SWITCHES = ['enable-automation'];
