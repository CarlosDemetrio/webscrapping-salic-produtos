import client from 'prom-client';

export class MetricsService {
  private readonly register: client.Registry;

  public readonly httpRequestDuration: client.Histogram;
  public readonly httpRequestTotal: client.Counter;
  public readonly cacheHits: client.Counter;
  public readonly cacheMisses: client.Counter;
  public readonly scraperJobsTotal: client.Counter;
  public readonly scraperJobDuration: client.Histogram;
  public readonly scraperJobsFailed: client.Counter;
  public readonly databaseQueryDuration: client.Histogram;

  constructor() {
    this.register = new client.Registry();

    client.collectDefaultMetrics({ register: this.register });

    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5],
      registers: [this.register],
    });

    this.httpRequestTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    this.cacheHits = new client.Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_key_prefix'],
      registers: [this.register],
    });

    this.cacheMisses = new client.Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_key_prefix'],
      registers: [this.register],
    });

    this.scraperJobsTotal = new client.Counter({
      name: 'scraper_jobs_total',
      help: 'Total number of scraper jobs processed',
      labelNames: ['status'],
      registers: [this.register],
    });

    this.scraperJobDuration = new client.Histogram({
      name: 'scraper_job_duration_seconds',
      help: 'Duration of scraper jobs in seconds',
      labelNames: ['job_type'],
      buckets: [1, 5, 10, 30, 60, 120],
      registers: [this.register],
    });

    this.scraperJobsFailed = new client.Counter({
      name: 'scraper_jobs_failed_total',
      help: 'Total number of failed scraper jobs',
      labelNames: ['error_type'],
      registers: [this.register],
    });

    this.databaseQueryDuration = new client.Histogram({
      name: 'database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
      registers: [this.register],
    });
  }

  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  getRegister(): client.Registry {
    return this.register;
  }
}

export default new MetricsService();
