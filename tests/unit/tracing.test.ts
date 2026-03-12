import { initTracing } from '../../src/config/tracing';

describe('Tracing Configuration', () => {
  let tracing: ReturnType<typeof initTracing>;

  afterEach(async () => {
    if (tracing) {
      await tracing.sdk.shutdown();
      await tracing.meterProvider.shutdown();
    }
  });

  describe('initTracing', () => {
    it('should initialize OpenTelemetry SDK successfully', () => {
      expect(() => {
        tracing = initTracing();
      }).not.toThrow();

      expect(tracing).toBeDefined();
      expect(tracing.sdk).toBeDefined();
      expect(tracing.meterProvider).toBeDefined();
    });

    it('should return SDK and MeterProvider instances', () => {
      tracing = initTracing();

      expect(tracing.sdk).toHaveProperty('start');
      expect(tracing.sdk).toHaveProperty('shutdown');
      expect(tracing.meterProvider).toHaveProperty('shutdown');
    });

    it('should configure Prometheus exporter on port 9464', async () => {
      tracing = initTracing();

      await new Promise((resolve) => setTimeout(resolve, 100));

      const http = require('node:http');
      const result = await new Promise((resolve, reject) => {
        const req = http.get('http://localhost:9464/metrics', (res: any) => {
          let data = '';
          res.on('data', (chunk: any) => data += chunk);
          res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.end();
      });

      expect(typeof result).toBe('string');
    });
  });
});
