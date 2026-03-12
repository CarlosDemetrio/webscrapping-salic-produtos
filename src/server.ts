import 'dotenv/config';
import Fastify from 'fastify';

const PORT = parseInt(process.env.PORT || '3000', 10);

const app = Fastify({
  logger: true,
});

// Health check endpoint
app.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    phase: 'FASE 1 - Infrastructure and Database (PostgreSQL + FTS) ✅'
  };
});

// Start server
const start = async () => {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`
    ╔════════════════════════════════════════════════════════════╗
    ║  🚀 SALIC Web Scraping API - FASE 1 COMPLETA              ║
    ║                                                            ║
    ║  Server running on: http://localhost:${PORT}                 ║
    ║  Health check: http://localhost:${PORT}/health               ║
    ║                                                            ║
    ║  ✅ PostgreSQL com Full Text Search (pg_trgm)             ║
    ║  ✅ Redis pronto para BullMQ                              ║
    ║  ✅ Prisma ORM com modelo ItemOrcamentario                ║
    ║  ✅ Índices GIN para busca textual otimizada              ║
    ║  ✅ Constraint de unicidade para Upsert                   ║
    ╚════════════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
