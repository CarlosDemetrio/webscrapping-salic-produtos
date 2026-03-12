import 'dotenv/config';
import './workers/scraperWorker';

console.log(`
╔═════════════════════════════════════════════════════════════════════════════╗
║  SALIC Worker - Processador de Jobs                                         ║
║                                                                             ║
║  Redis conectado                                                            ║
║  Worker rodando com concorrência configurável                               ║
║  Aguardando jobs na fila: scraper-queue                                     ║
║                                                                             ║
║  Concorrência: ${process.env.WORKER_CONCURRENCY || '3'} workers paralelos   ║
╚═════════════════════════════════════════════════════════════════════════════╝
`);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Recebido SIGTERM, encerrando worker...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Recebido SIGINT, encerrando worker...');
  process.exit(0);
});
