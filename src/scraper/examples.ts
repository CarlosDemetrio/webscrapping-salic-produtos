/**
 * Exemplo de uso do sistema de scraping
 * Este arquivo demonstra como usar o sistema refatorado
 */

import { ClusterOrchestrator } from './orchestrator/cluster.orchestrator';
import { ProdutoQueue } from './queue/produto.queue';
import { ProdutoParaScraping, ScraperConfig } from './types/scraper.types';

/**
 * Exemplo 1: Uso básico com configuração padrão
 */
export async function exemploBasico() {
  const produtos: ProdutoParaScraping[] = [
    { id: '154', nome: 'Aplicativo Cultural - AUDIOVISUAL' },
    { id: '51', nome: 'Apresentação Musical' },
  ];

  const config: ScraperConfig = {
    baseUrl: 'https://aplicacoes.cultura.gov.br/comparar/grid_ItemOrcamentario_PorProduto_ValorMedio/grid_ItemOrcamentario_PorProduto_ValorMedio.php',
    outputDir: './extracao_salicneet-teste',
    maxWorkers: 3,
    workerStartDelay: 2000,
  };

  const queue = new ProdutoQueue(produtos);
  const orchestrator = new ClusterOrchestrator(config, queue);

  await orchestrator.iniciar();
}

/**
 * Exemplo 2: Configuração customizada para servidor potente
 */
export async function exemploServidorPotente() {
  const produtos: ProdutoParaScraping[] = [
    { id: '154', nome: 'Aplicativo Cultural - AUDIOVISUAL' },
    { id: '51', nome: 'Apresentação Musical' },
    { id: '59', nome: 'Banco de Dados' },
    // ... adicione mais produtos
  ];

  const config: ScraperConfig = {
    baseUrl: 'https://aplicacoes.cultura.gov.br/comparar/grid_ItemOrcamentario_PorProduto_ValorMedio/grid_ItemOrcamentario_PorProduto_ValorMedio.php',
    outputDir: './extracao_producao',
    maxWorkers: 10, // Mais workers para servidor potente
    workerStartDelay: 1000, // Delay menor
  };

  const queue = new ProdutoQueue(produtos);
  const orchestrator = new ClusterOrchestrator(config, queue);

  await orchestrator.iniciar();
}

/**
 * Exemplo 3: Configuração para ambiente de desenvolvimento
 */
export async function exemploDesenvolvimento() {
  // Apenas alguns produtos para teste rápido
  const produtos: ProdutoParaScraping[] = [
    { id: '51', nome: 'Apresentação Musical' },
  ];

  const config: ScraperConfig = {
    baseUrl: 'https://aplicacoes.cultura.gov.br/comparar/grid_ItemOrcamentario_PorProduto_ValorMedio/grid_ItemOrcamentario_PorProduto_ValorMedio.php',
    outputDir: './extracao_dev',
    maxWorkers: 1, // Apenas 1 worker para debug
    workerStartDelay: 3000,
  };

  const queue = new ProdutoQueue(produtos);
  const orchestrator = new ClusterOrchestrator(config, queue);

  await orchestrator.iniciar();
}

// Execute o exemplo desejado descomentando a linha abaixo:
// exemploBasico();
// exemploServidorPotente();
// exemploDesenvolvimento();
