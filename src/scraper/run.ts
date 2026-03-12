/**
 * Script de inicialização rápida
 * Use este arquivo para executar o scraper rapidamente
 */

import { iniciarScraping } from './index';

console.log('🚀 Iniciando Sistema de Scraping SALIC...\n');
console.log('📝 Configuração:');
console.log(`   - Workers: ${process.env.MAX_WORKERS || '3'}`);
console.log(`   - Ambiente: ${process.env.NODE_ENV || 'development'}`);
console.log('\n────────────────────────────────────────\n');

iniciarScraping()
  .then(() => {
    console.log('\n✅ Scraping concluído com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro durante o scraping:', error);
    process.exit(1);
  });
