import { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';

/**
 * Configuração de rate limiting
 */
const rateLimitConfig = {
  global: true,
  max: 100, // 100 requests
  timeWindow: '1 minute',
  cache: 10000, // Cache de 10k usuários
  allowList: ['127.0.0.1'], // IPs whitelist
  skipOnError: false,
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true,
  },
  errorResponseBuilder: () => ({
    success: false,
    error: {
      name: 'RateLimitError',
      message: 'Muitas requisições. Tente novamente em 1 minuto.',
      statusCode: 429,
      timestamp: new Date().toISOString(),
    },
  }),
};

/**
 * Configuração de segurança com Helmet
 */
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 ano
    includeSubDomains: true,
    preload: true,
  },
};

/**
 * Configuração de CORS
 */
const corsConfig = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset'],
};

/**
 * Registra plugins de segurança
 */
export async function registerSecurityPlugins(app: FastifyInstance) {
  // Rate limiting
  await app.register(rateLimit, rateLimitConfig);

  // Security headers
  await app.register(helmet, helmetConfig);

  // CORS
  await app.register(cors, corsConfig);
}

/**
 * Rate limit customizado para endpoints específicos
 */
export const searchRateLimit = {
  config: {
    rateLimit: {
      max: 30, // 30 requests
      timeWindow: '1 minute',
    },
  },
};

export const enqueueRateLimit = {
  config: {
    rateLimit: {
      max: 10, // 10 requests
      timeWindow: '1 minute',
    },
  },
};
