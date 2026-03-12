import { MetricsService } from '../../src/services/metrics.service';

describe('MetricsService', () => {
  let metricsService: MetricsService;

  beforeEach(() => {
    metricsService = new MetricsService();
  });

  describe('initialization', () => {
    it('should initialize all metrics', () => {
      expect(metricsService.httpRequestDuration).toBeDefined();
      expect(metricsService.httpRequestTotal).toBeDefined();
      expect(metricsService.cacheHits).toBeDefined();
      expect(metricsService.cacheMisses).toBeDefined();
      expect(metricsService.scraperJobsTotal).toBeDefined();
      expect(metricsService.scraperJobDuration).toBeDefined();
      expect(metricsService.scraperJobsFailed).toBeDefined();
      expect(metricsService.databaseQueryDuration).toBeDefined();
    });
  });

  describe('httpRequestTotal', () => {
    it('should increment http request counter', () => {
      metricsService.httpRequestTotal.inc({
        method: 'GET',
        route: '/api/search',
        status_code: 200,
      });

      const metrics = metricsService.getRegister().getSingleMetric('http_requests_total');
      expect(metrics).toBeDefined();
    });
  });

  describe('httpRequestDuration', () => {
    it('should observe http request duration', () => {
      metricsService.httpRequestDuration.observe(
        {
          method: 'GET',
          route: '/api/search',
          status_code: 200,
        },
        0.5
      );

      const metrics = metricsService.getRegister().getSingleMetric('http_request_duration_seconds');
      expect(metrics).toBeDefined();
    });
  });

  describe('cacheHits and cacheMisses', () => {
    it('should track cache hits', () => {
      metricsService.cacheHits.inc({ cache_key_prefix: 'search' });

      const metrics = metricsService.getRegister().getSingleMetric('cache_hits_total');
      expect(metrics).toBeDefined();
    });

    it('should track cache misses', () => {
      metricsService.cacheMisses.inc({ cache_key_prefix: 'search' });

      const metrics = metricsService.getRegister().getSingleMetric('cache_misses_total');
      expect(metrics).toBeDefined();
    });
  });

  describe('scraperJobsTotal', () => {
    it('should count completed scraper jobs', () => {
      metricsService.scraperJobsTotal.inc({ status: 'completed' });

      const metrics = metricsService.getRegister().getSingleMetric('scraper_jobs_total');
      expect(metrics).toBeDefined();
    });

    it('should count failed scraper jobs', () => {
      metricsService.scraperJobsTotal.inc({ status: 'failed' });

      const metrics = metricsService.getRegister().getSingleMetric('scraper_jobs_total');
      expect(metrics).toBeDefined();
    });
  });

  describe('scraperJobDuration', () => {
    it('should observe scraper job duration', () => {
      metricsService.scraperJobDuration.observe({ job_type: 'full_scrape' }, 30);

      const metrics = metricsService.getRegister().getSingleMetric('scraper_job_duration_seconds');
      expect(metrics).toBeDefined();
    });
  });

  describe('databaseQueryDuration', () => {
    it('should observe database query duration', () => {
      metricsService.databaseQueryDuration.observe({ operation: 'search' }, 0.1);

      const metrics = metricsService.getRegister().getSingleMetric('database_query_duration_seconds');
      expect(metrics).toBeDefined();
    });
  });

  describe('getMetrics', () => {
    it('should return metrics in Prometheus format', async () => {
      metricsService.httpRequestTotal.inc({
        method: 'GET',
        route: '/test',
        status_code: 200,
      });

      const metrics = await metricsService.getMetrics();

      expect(typeof metrics).toBe('string');
      expect(metrics).toContain('http_requests_total');
    });
  });
});
