# Observability & Monitoring

This document describes the observability, caching, and CI/CD implementations for the SALIC Web Scraping project.

## Features Implemented

1. Redis Caching for Search Results
2. Prometheus Metrics
3. OpenTelemetry Tracing
4. GitHub Actions CI/CD Pipeline

---

## 1. Redis Caching

### Overview
Implements cache-aside pattern using Redis to optimize search query performance.

### Configuration
- Default TTL: 300 seconds (5 minutes)
- Cache invalidation on data updates
- Automatic cache key generation based on query parameters

### Usage

```typescript
import cacheService from './services/cache.service';

const result = await cacheService.getOrSet(
  'cache-key',
  async () => {
    return await fetchDataFromDatabase();
  },
  300
);
```

### Cache Keys
- Search queries: `search:{params}`
- Pattern-based invalidation: `search:*`

### Metrics
- Cache hits: `cache_hits_total`
- Cache misses: `cache_misses_total`

---

## 2. Prometheus Metrics

### Exposed Metrics

#### HTTP Metrics
- `http_requests_total`: Total HTTP requests by method, route, and status
- `http_request_duration_seconds`: HTTP request duration histogram

#### Cache Metrics
- `cache_hits_total`: Total cache hits by prefix
- `cache_misses_total`: Total cache misses by prefix

#### Scraper Metrics
- `scraper_jobs_total`: Total scraper jobs by status
- `scraper_job_duration_seconds`: Scraper job duration histogram
- `scraper_jobs_failed_total`: Total failed jobs by error type

#### Database Metrics
- `database_query_duration_seconds`: Database query duration histogram by operation

### Endpoints
- Metrics: `http://localhost:3000/metrics`
- Prometheus UI: `http://localhost:9090`

### Configuration
Edit `prometheus.yml` to configure scrape targets and intervals.

---

## 3. Grafana Dashboards

### Access
- URL: `http://localhost:3001`
- Username: `admin`
- Password: `admin`

### Pre-configured Dashboard
The system includes a pre-configured dashboard showing:
- HTTP request rate and duration
- Cache hit rate
- Scraper job metrics
- Database query performance

### Custom Queries

**Cache Hit Rate:**
```promql
rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))
```

**Request Rate:**
```promql
rate(http_requests_total[5m])
```

**P95 Request Duration:**
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

---

## 4. OpenTelemetry Tracing

### Configuration
OpenTelemetry is configured in `src/config/tracing.ts` with:
- Service name: `salic-scraper`
- Automatic instrumentation for HTTP, Redis, and Fastify
- Prometheus exporter on port 9464

### Usage
Import and initialize in your application:

```typescript
import { initTracing } from './config/tracing';

initTracing();
```

---

## 5. CI/CD Pipeline

### GitHub Actions Workflow

The pipeline runs on push/PR to `main` and `develop` branches.

#### Jobs

**1. Test**
- Runs unit and integration tests
- Uses real PostgreSQL and Redis (via services)
- Generates coverage reports
- Uploads to Codecov

**2. Docker**
- Builds multi-platform images (amd64, arm64)
- Pushes to Docker Hub
- Only runs on main branch
- Uses build cache for faster builds

**3. Security**
- Runs npm audit
- Scans with Trivy
- Uploads results to GitHub Security

### Required Secrets
Configure in GitHub repository settings:
- `DOCKER_USERNAME`: Docker Hub username
- `DOCKER_PASSWORD`: Docker Hub token

### Local Testing

Run the same checks locally:

```bash
npm run test:coverage
npx tsc --noEmit
npm audit
```

---

## 6. Docker Compose Services

### Complete Stack

```bash
docker-compose up -d
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| postgres | 5432 | PostgreSQL database |
| redis | 6379 | Redis for caching and queues |
| app | 3000 | Main API server |
| worker | - | Background scraper workers |
| prometheus | 9090 | Metrics storage and query |
| grafana | 3001 | Metrics visualization |

### Health Checks

All services include health checks:
- PostgreSQL: `pg_isready`
- Redis: `redis-cli ping`
- App/Worker: depend on healthy database

---

## 7. Environment Variables

### Required
```env
DATABASE_URL=postgresql://user:password@host:5432/db
```

### Optional
```env
REDIS_HOST=localhost
REDIS_PORT=6379
WORKER_CONCURRENCY=3
PORT=3000
NODE_ENV=production
```

---

## 8. Performance Optimization

### Cache Strategy
- Cache search results for 5 minutes
- Invalidate on data updates
- Track hit/miss rates

### Database Queries
- Use pg_trgm for full-text search
- Parallel queries for data + count
- Query duration tracking

### Scraper Workers
- Configurable concurrency
- Rate limiting (10 req/sec)
- Retry with exponential backoff
- Job duration tracking

---

## 9. Monitoring Best Practices

### Alerts to Configure

**High Error Rate:**
```promql
rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
```

**Low Cache Hit Rate:**
```promql
rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m])) < 0.7
```

**Slow Queries:**
```promql
histogram_quantile(0.95, rate(database_query_duration_seconds_bucket[5m])) > 1
```

### Recommended Retention
- Prometheus: 15 days
- Logs: 30 days
- Metrics: 90 days

---

## 10. Troubleshooting

### Cache Issues
```bash
docker exec -it salic_redis redis-cli
> KEYS search:*
> DBSIZE
> INFO stats
```

### Metrics Not Showing
1. Check `/metrics` endpoint
2. Verify Prometheus targets: `http://localhost:9090/targets`
3. Check Grafana datasource connection

### CI/CD Failures
1. Check GitHub Actions logs
2. Run tests locally: `npm test`
3. Verify Docker Hub credentials

---

## References

- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Grafana Dashboard Guide](https://grafana.com/docs/grafana/latest/dashboards/)
- [OpenTelemetry Node.js](https://opentelemetry.io/docs/instrumentation/js/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
