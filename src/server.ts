import 'dotenv/config';
import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import routes from './routes';
import { registerSecurityPlugins } from './middlewares/security';
import { errorHandler } from './middlewares/errorHandler';

const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Configuração do Swagger/OpenAPI
 */
const swaggerOptions = {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'SALIC Web Scraping API',
      description: 'API para busca de dados orçamentários do SALIC com Full Text Search',
      version: '1.0.0',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
    tags: [
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Search', description: 'Full Text Search endpoints' },
      { name: 'Queue', description: 'Queue management endpoints' },
    ],
  },
};

const swaggerUiOptions = {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list' as const,
    deepLinking: false,
  },
  staticCSP: true,
};

/**
 * Cria e configura a instância do Fastify
 */
async function createServer() {
  const app = Fastify({
    logger: {
      level: NODE_ENV === 'development' ? 'debug' : 'info',
      transport: NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      } : undefined,
    },
    trustProxy: true,
    disableRequestLogging: NODE_ENV === 'production',
  });

  // Registrar plugins de segurança (rate limit, helmet, cors)
  await registerSecurityPlugins(app);

  // Registrar Swagger
  if (NODE_ENV !== 'test') {
    await app.register(swagger, swaggerOptions);
    await app.register(swaggerUi, swaggerUiOptions);
  }

  // Registrar error handler global
  app.setErrorHandler(errorHandler);

  // Registrar todas as rotas
  await app.register(routes);

  return app;
}

/**
 * Inicializa o servidor
 */
async function start() {
  const app = await createServer();

  try {
    // Iniciar servidor
    await app.listen({ port: PORT, host: '0.0.0.0' });

    console.log(`
    ╔═════════════════════════════════════════════════════════════╗
    ║   SALIC Web Scraping API - PRODUÇÃO READY 🚀                ║
    ║                                                             ║
    ║  🌐 Server: http://localhost:${PORT}                        ║
    ║  📚 Docs: http://localhost:${PORT}/docs                     ║
    ║  ❤️  Health: http://localhost:${PORT}/health                ║
    ║  📊 Queue: http://localhost:${PORT}/api/queue/status        ║
    ║  🔍 Search: GET http://localhost:${PORT}/api/search?q=termo ║
    ║                                                             ║
    ║  ✅ PostgreSQL + Full Text Search (pg_trgm + GIN)           ║
    ║  ✅ Redis + BullMQ com workers paralelos                    ║
    ║  ✅ Arquitetura SOLID e Clean Code                          ║
    ║  ✅ Rate Limiting (100 req/min global)                      ║
    ║  ✅ Security Headers (Helmet)                               ║
    ║  ✅ CORS configurado                                        ║
    ║  ✅ Error Handler global                                    ║
    ║  ✅ Swagger/OpenAPI docs                                    ║
    ║  ✅ Schema validation                                       ║
    ╚═════════════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Executar apenas se for o arquivo principal
if (require.main === module) {
  start();
}

export { createServer };

