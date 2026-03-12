import { CacheService } from '../../src/services/cache.service';
import Redis from 'ioredis';
import RedisMock from 'ioredis-mock';

describe('CacheService', () => {
  let cacheService: CacheService;
  let redisMock: Redis;

  beforeEach(() => {
    redisMock = new RedisMock();
    cacheService = new CacheService(redisMock);
  });

  afterEach(async () => {
    await redisMock.flushall();
    await redisMock.quit();
  });

  describe('get', () => {
    it('should return null when key does not exist', async () => {
      const result = await cacheService.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should return cached value when key exists', async () => {
      const testData = { id: 1, name: 'test' };
      await redisMock.setex('test-key', 300, JSON.stringify(testData));

      const result = await cacheService.get('test-key');
      expect(result).toEqual(testData);
    });
  });

  describe('set', () => {
    it('should store value with default TTL', async () => {
      const testData = { id: 1, name: 'test' };
      await cacheService.set('test-key', testData);

      const stored = await redisMock.get('test-key');
      expect(JSON.parse(stored!)).toEqual(testData);
    });

    it('should store value with custom TTL', async () => {
      const testData = { id: 1, name: 'test' };
      await cacheService.set('test-key', testData, 600);

      const ttl = await redisMock.ttl('test-key');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(600);
    });
  });

  describe('del', () => {
    it('should delete existing key', async () => {
      await redisMock.set('test-key', 'value');
      await cacheService.del('test-key');

      const exists = await redisMock.exists('test-key');
      expect(exists).toBe(0);
    });
  });

  describe('delPattern', () => {
    it('should delete all keys matching pattern', async () => {
      await redisMock.set('search:1', 'value1');
      await redisMock.set('search:2', 'value2');
      await redisMock.set('other:1', 'value3');

      await cacheService.delPattern('search:*');

      const search1 = await redisMock.exists('search:1');
      const search2 = await redisMock.exists('search:2');
      const other1 = await redisMock.exists('other:1');

      expect(search1).toBe(0);
      expect(search2).toBe(0);
      expect(other1).toBe(1);
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      const testData = { id: 1, name: 'cached' };
      await redisMock.setex('test-key', 300, JSON.stringify(testData));

      const fetchFn = jest.fn().mockResolvedValue({ id: 2, name: 'fresh' });
      const result = await cacheService.getOrSet('test-key', fetchFn);

      expect(result).toEqual(testData);
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('should fetch and cache value if not exists', async () => {
      const freshData = { id: 2, name: 'fresh' };
      const fetchFn = jest.fn().mockResolvedValue(freshData);

      const result = await cacheService.getOrSet('test-key', fetchFn, 300);

      expect(result).toEqual(freshData);
      expect(fetchFn).toHaveBeenCalledTimes(1);

      const cached = await redisMock.get('test-key');
      expect(JSON.parse(cached!)).toEqual(freshData);
    });
  });

  describe('generateSearchCacheKey', () => {
    it('should generate consistent cache key for same params', () => {
      const params1 = { q: 'test', page: 1, limit: 20 };
      const params2 = { limit: 20, q: 'test', page: 1 };

      const key1 = cacheService.generateSearchCacheKey(params1);
      const key2 = cacheService.generateSearchCacheKey(params2);

      expect(key1).toBe(key2);
      expect(key1).toContain('search:');
    });

    it('should generate different keys for different params', () => {
      const params1 = { q: 'test', page: 1 };
      const params2 = { q: 'test', page: 2 };

      const key1 = cacheService.generateSearchCacheKey(params1);
      const key2 = cacheService.generateSearchCacheKey(params2);

      expect(key1).not.toBe(key2);
    });
  });

  describe('invalidateSearchCache', () => {
    it('should clear all search cache keys', async () => {
      await redisMock.set('search:1', 'value1');
      await redisMock.set('search:2', 'value2');
      await redisMock.set('other:1', 'value3');

      await cacheService.invalidateSearchCache();

      const search1 = await redisMock.exists('search:1');
      const search2 = await redisMock.exists('search:2');
      const other1 = await redisMock.exists('other:1');

      expect(search1).toBe(0);
      expect(search2).toBe(0);
      expect(other1).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      await redisMock.set('key1', 'value1');
      await redisMock.set('key2', 'value2');

      const stats = await cacheService.getStats();

      expect(stats).not.toBeNull();
      expect(stats?.dbsize).toBeGreaterThan(0);
    });
  });
});
