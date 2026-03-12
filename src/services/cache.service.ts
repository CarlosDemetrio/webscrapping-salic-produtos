import Redis from 'ioredis';
import { redisConfig } from '../config/redis';
import metricsService from './metrics.service';

interface CacheStats {
  dbsize: number;
  info: Record<string, string>;
}

export class CacheService {
  private redis: Redis;
  private readonly defaultTTL: number = 300;

  constructor(redisClient?: Redis) {
    this.redis = redisClient || new Redis(redisConfig);
  }

  private generateCacheKey(prefix: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${sortedParams}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    if (!cached) return null;
    return JSON.parse(cached) as T;
  }

  async set(key: string, value: unknown, ttl: number = this.defaultTTL): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) {
      metricsService.cacheHits.inc({ cache_key_prefix: key.split(':')[0] });
      return cached;
    }

    metricsService.cacheMisses.inc({ cache_key_prefix: key.split(':')[0] });
    const data = await fetchFn();
    await this.set(key, data, ttl);
    return data;
  }

  generateSearchCacheKey(params: Record<string, unknown>): string {
    return this.generateCacheKey('search', params);
  }

  async invalidateSearchCache(): Promise<void> {
    await this.delPattern('search:*');
  }

  async getStats(): Promise<CacheStats | null> {
    try {
      const info = await this.redis.info('stats');
      const dbsize = await this.redis.dbsize();
      return {
        dbsize,
        info: info.split('\r\n').reduce((acc, line) => {
          const [key, value] = line.split(':');
          if (key && value) {
            acc[key] = value;
          }
          return acc;
        }, {} as Record<string, string>),
      };
    } catch (error) {
      return null;
    }
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}

export default new CacheService();
