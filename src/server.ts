import 'dotenv/config';
import Fastify from 'fastify';
import scraperQueue from './queue/scraperQueue';

const PORT = parseInt(process.env.PORT || '3000', 10);

const app = Fastify({
  logger: true,
});

// Health check endpoint
app.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    phase: 'FASE 2 - Queue Architecture (BullMQ + Redis)'
  };
});

// Queue status endpoint
app.get('/api/queue/status', async () => {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    scraperQueue.getWaitingCount(),
    scraperQueue.getActiveCount(),
    scraperQueue.getCompletedCount(),
    scraperQueue.getFailedCount(),
    scraperQueue.getDelayedCount(),
  ]);

  return {
    queue: 'scraper-queue',
    counts: {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    },
    timestamp: new Date().toISOString(),
  };
});

// Start server
const start = async () => {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`
    ╔════════════════════════════════════════════════════════════╗
    ║   SALIC Web Scraping API - FASE 2 COMPLETA                 ║
    ║                                                            ║
    ║  Server running on: http://localhost:${PORT}               ║
    ║  Health check: http://localhost:${PORT}/health             ║
    ║  Queue status: http://localhost:${PORT}/api/queue/status   ║
    ║                                                            ║
    ║   PostgreSQL com Full Text Search (pg_trgm)                ║
    ║   Redis + BullMQ configurado                               ║
    ║   Fila de scraping criada (scraper-queue)                  ║
    ║   Worker pronto para processar jobs                        ║
    ║   Concorrência ajustável via env                           ║
    ╚════════════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
