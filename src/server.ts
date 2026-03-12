import 'dotenv/config';
import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import routes from './routes';
import { registerSecurityPlugins } from './middlewares/security';
import { errorHandler } from './middlewares/errorHandler';
import { registerMetrics } from './middlewares/metrics';

const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

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
      { name: 'Observability', description: 'Monitoring, metrics and observability endpoints' },
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

  await registerSecurityPlugins(app);
  await registerMetrics(app);

  if (NODE_ENV !== 'test') {
    await app.register(swagger, swaggerOptions);
    await app.register(swaggerUi, swaggerUiOptions);
  }

  app.setErrorHandler(errorHandler);
  await app.register(routes);

  return app;
}

async function start() {
  const app = await createServer();

  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });

    console.log(`
    SALIC Web Scraping API - Production Ready
    
    Server: http://localhost:${PORT}
    Docs: http://localhost:${PORT}/docs
    Health: http://localhost:${PORT}/health
    Metrics: http://localhost:${PORT}/metrics
    Queue Status: http://localhost:${PORT}/api/queue/status
    Search: GET http://localhost:${PORT}/api/search?q=termo
    
    PostgreSQL + Full Text Search (pg_trgm + GIN)
    Redis + BullMQ with parallel workers
    SOLID Architecture
    Rate Limiting (100 req/min)
    Security Headers (Helmet)
    CORS enabled
    Global Error Handler
    Swagger/OpenAPI docs
    Schema validation
    Prometheus metrics
    `);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

export { createServer };

