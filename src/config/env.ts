/**
 * Configuração centralizada de variáveis de ambiente
 * Valida e exporta todas as configs em um único lugar
 */

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // Redis
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),

  // Cache
  cacheTTL: parseInt(process.env.CACHE_TTL || '300', 10),

  // Worker
  workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY || '3', 10),

  // Security
  scraperSecretKey: process.env.SCRAPER_SECRET_KEY || 'change-me-in-production',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],

  // Rate Limiting
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  rateLimitWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',

  // Cron (Fase 5)
  cronSchedule: process.env.CRON_SCHEDULE || '0 2 * * *', // 02h00 diariamente

  // Feature flags
  enableSwagger: process.env.ENABLE_SWAGGER !== 'false',
  enableCors: process.env.ENABLE_CORS !== 'false',
} as const;

/**
 * Valida as configurações obrigatórias
 */
export function validateConfig() {
  const requiredEnvVars = ['DATABASE_URL'];

  const missing = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );

  if (missing.length > 0) {
    throw new Error(
      `Variáveis de ambiente obrigatórias não configuradas: ${missing.join(', ')}`
    );
  }

  // Validações adicionais
  if (config.nodeEnv === 'production' && config.scraperSecretKey === 'change-me-in-production') {
    console.warn('⚠️  AVISO: SCRAPER_SECRET_KEY usando valor padrão em produção!');
  }
}

// Validar ao importar o módulo
if (require.main !== module) {
  try {
    validateConfig();
  } catch (error) {
    console.error('❌ Erro na validação de configurações:', error);
    process.exit(1);
  }
}
