# Quick Start - Observability Features

## Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ (for local development)
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)

---

## Quick Start with Docker Compose

### 1. Start All Services

```bash
docker-compose up -d
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- API Server (port 3000)
- Worker processes
- Prometheus (port 9090)
- Grafana (port 3001)

### 2. Verify Services

```bash
# Check all containers are running
docker-compose ps

# Check API health
curl http://localhost:3000/health

# Check metrics endpoint
curl http://localhost:3000/metrics
```

### 3. Access Dashboards

**Grafana (Metrics Visualization):**
- URL: http://localhost:3001
- Username: `admin`
- Password: `admin`
- Pre-configured dashboard available

**Prometheus (Metrics Database):**
- URL: http://localhost:9090
- Query metrics directly
- View targets: http://localhost:9090/targets

**API Documentation:**
- URL: http://localhost:3000/docs
- Interactive Swagger UI

---

## Test the Features

### 1. Test Caching

```bash
# First request (cache miss)
time curl "http://localhost:3000/api/search?q=teste&limit=10"

# Second request (cache hit - should be faster)
time curl "http://localhost:3000/api/search?q=teste&limit=10"

# Check cache metrics
curl http://localhost:3000/metrics | grep cache
```

### 2. View Metrics in Prometheus

Visit http://localhost:9090 and try these queries:

```promql
# Request rate
rate(http_requests_total[5m])

# Cache hit rate
rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))

# Request duration (95th percentile)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Scraper job success rate
rate(scraper_jobs_total{status="completed"}[5m])
```

### 3. View Dashboards in Grafana

1. Login to Grafana: http://localhost:3001 (admin/admin)
2. Navigate to Dashboards
3. Open "SALIC Scraper Metrics"
4. Generate some traffic to see real-time data

---

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

Required variables:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/salic_produtos
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3000
```

### 3. Run Services Locally

```bash
# Terminal 1: Start API server
npm run dev

# Terminal 2: Start worker
npm run dev:worker

# Terminal 3: Run Prometheus (optional)
docker run -p 9090:9090 -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml prom/prometheus

# Terminal 4: Run Grafana (optional)
docker run -p 3001:3000 -v $(pwd)/grafana:/etc/grafana/provisioning grafana/grafana
```

---

## Running Tests

### Unit Tests

```bash
npm run test:unit
```

### Integration Tests

```bash
npm run test:integration
```

### Coverage Report

```bash
npm run test:coverage
```

View HTML report:
```bash
open coverage/lcov-report/index.html
```

---

## CI/CD Pipeline

### GitHub Actions Setup

1. **Configure Secrets** (if using Docker Hub):
   - Go to Settings > Secrets and variables > Actions
   - Add `DOCKER_USERNAME`
   - Add `DOCKER_PASSWORD`

2. **Trigger Pipeline**:
   ```bash
   git add .
   git commit -m "feat: add observability and CI/CD"
   git push origin main
   ```

3. **Monitor Pipeline**:
   - Visit: https://github.com/YOUR_USERNAME/YOUR_REPO/actions
   - Check test results, coverage, and security scans

---

## Common Commands

### Docker Compose

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f app
docker-compose logs -f worker

# Restart a service
docker-compose restart app

# Rebuild and start
docker-compose up -d --build
```

### Cache Management

```bash
# Connect to Redis
docker exec -it salic_redis redis-cli

# View cache keys
KEYS search:*

# Get cache statistics
INFO stats

# Clear search cache
EVAL "return redis.call('del', unpack(redis.call('keys', 'search:*')))" 0

# Exit Redis CLI
exit
```

### Database Management

```bash
# Connect to PostgreSQL
docker exec -it salic_postgres psql -U salic_user -d salic_produtos

# View tables
\dt

# View items count
SELECT COUNT(*) FROM itens_orcamentarios;

# Exit psql
\q
```

---

## Monitoring Best Practices

### 1. Key Metrics to Watch

- **Error Rate**: http_requests_total{status_code=~"5.."}
- **Response Time**: http_request_duration_seconds
- **Cache Hit Rate**: cache_hits / (cache_hits + cache_misses)
- **Scraper Success**: scraper_jobs_total{status="completed"}

### 2. Set Alerts For

- Error rate > 5%
- P95 response time > 2 seconds
- Cache hit rate < 70%
- Scraper failure rate > 10%

### 3. Regular Tasks

- Review Grafana dashboards daily
- Check error logs weekly
- Analyze slow queries monthly
- Review cache TTL effectiveness

---

## Troubleshooting

### Services Won't Start

```bash
# Check Docker status
docker ps -a

# Check logs for errors
docker-compose logs

# Restart everything
docker-compose down
docker-compose up -d
```

### Metrics Not Showing

```bash
# Check metrics endpoint
curl http://localhost:3000/metrics

# Check Prometheus targets
open http://localhost:9090/targets

# Verify Grafana datasource
# Go to Configuration > Data Sources in Grafana
```

### Cache Not Working

```bash
# Check Redis connection
docker exec -it salic_redis redis-cli ping

# View Redis logs
docker-compose logs redis

# Check cache metrics
curl http://localhost:3000/metrics | grep cache
```

### Tests Failing

```bash
# Clear cache and node_modules
rm -rf node_modules coverage dist
npm install

# Run specific test
npm test -- cache.service.test.ts

# Check TypeScript errors
npx tsc --noEmit
```

---

## Next Steps

1. **Customize Dashboards**: Edit Grafana dashboards for your needs
2. **Add Alerts**: Configure Prometheus AlertManager
3. **Optimize Cache**: Adjust TTL based on your data patterns
4. **Scale**: Add more workers or API instances
5. **Monitor**: Set up regular monitoring and review cycles

---

## Support

For issues or questions:
1. Check logs: `docker-compose logs`
2. Review documentation in `docs/` folder
3. Run tests: `npm test`
4. Check GitHub Issues

---

## Resources

- **Documentation**: `docs/OBSERVABILITY.md`
- **API Reference**: `docs/API.md`
- **Architecture**: `docs/ARCHITECTURE.md`
- **Prometheus**: https://prometheus.io/docs/
- **Grafana**: https://grafana.com/docs/
