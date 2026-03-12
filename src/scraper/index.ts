/**
 * Ponto de entrada para o sistema de scraping
 * Princípio: Dependency Inversion - depende de abstrações, não de implementações concretas
 */

import { ClusterOrchestrator } from './orchestrator/cluster.orchestrator';
import { ProdutoQueue } from './queue/produto.queue';
import { SCRAPER_CONFIG } from './config/scraper.config';
import { PRODUTOS } from './data/produtos.data';

/**
 * Função principal que inicia o processo de scraping
 */
async function iniciarScraping(): Promise<void> {
  try {
    // Cria a fila de produtos
    const produtoQueue = new ProdutoQueue(PRODUTOS);

    // Cria o orquestrador
    const orchestrator = new ClusterOrchestrator(SCRAPER_CONFIG, produtoQueue);

    // Inicia o processo
    await orchestrator.iniciar();

  } catch (error) {
    console.error('❌ Erro fatal no sistema de scraping:', error);
    process.exit(1);
  }
}

// Executa se for o arquivo principal
if (require.main === module) {
  iniciarScraping();
}

export { iniciarScraping };
