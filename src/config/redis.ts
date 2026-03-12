import 'dotenv/config';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

// Configuração de conexão Redis para BullMQ
export const redisConfig = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: null, // Requerido pelo BullMQ
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

console.log(`📡 Redis configurado em ${REDIS_HOST}:${REDIS_PORT}`);

export default redisConfig;
