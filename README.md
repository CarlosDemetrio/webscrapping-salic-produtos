# SALIC Web Scraping & Search API

> High-performance web scraping and search system for SALIC budget data with distributed workers and Full-Text Search capabilities.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-4-black.svg)](https://www.fastify.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-red.svg)](https://redis.io/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Overview

Production-ready system that extracts budget data from the SALIC government system and provides a high-performance REST API with Full-Text Search. Built to handle session locks through distributed workers and optimized for Oracle Cloud Infrastructure's Always Free tier.

### Key Features

- **Distributed Scraping**: BullMQ-powered job queue with parallel workers
- **Full-Text Search**: PostgreSQL with trigram indexes (pg_trgm) for fuzzy search
- **Auto Scheduling**: Cron-based daily execution at 2 AM
- **Production Ready**: Rate limiting, security headers, comprehensive error handling
- **SOLID Architecture**: Clean separation of concerns with repository/service patterns
- **API Documentation**: Interactive Swagger/OpenAPI docs
- **Type Safety**: Full TypeScript with strict mode
- **Docker Support**: Complete containerization with Docker Compose

## Quick Start

```bash
# Install dependencies
npm install

# Start infrastructure
docker-compose up -d postgres redis

# Run migrations
npm run prisma:migrate

# Start API server (terminal 1)
npm run dev

# Start worker (terminal 2)
npm run dev:worker

# Optional: Start scheduler (terminal 3)
npm run dev:maestro
```

API will be available at `http://localhost:3000`

Documentation at `http://localhost:3000/docs`

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client/Frontend                         │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/REST
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Fastify API Server                        │
│  - Rate Limiting (100 req/min)                              │
│  - Security Headers (Helmet)                                │
│  - Prometheus Metrics (/metrics)                            │
│  - Request Validation                                       │
│  - Swagger Docs (/docs)                                     │
└──────────┬──────────────────┬────────────┬──────────────────┘
           │                  │            │
           ▼                  ▼            ▼
┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐
│  PostgreSQL 16   │  │   Redis 7    │  │  Observability   │
│  - pg_trgm FTS   │  │  - Cache     │  │  - Prometheus    │
│  - GIN Indexes   │  │  - BullMQ    │  │  - Grafana       │
│  - Upsert Logic  │  │  - Jobs      │  │  - OpenTelemetry │
└──────────────────┘  └──────┬───────┘  └──────────────────┘
                             │
                             ▼
                  ┌──────────────────────────────┐
                  │   Worker Pool (3x)           │
                  │   - Selenium Browsers        │
                  │   - Parallel Processing      │
                  │   - Auto Retry               │
                  │   - Metrics Tracking         │
                  └───────────┬──────────────────┘
                              │
                              ▼
                  ┌──────────────────────────────┐
                  │   SALIC System               │
                  │   (Target Website)           │
                  └──────────────────────────────┘
```

### Data Flow

1. **Maestro** enqueues 53 products into BullMQ
2. **Workers** (3 concurrent) process jobs:
   - Launch Selenium browser
   - Extract data from SALIC
   - Transform to DTO format
   - Upsert to PostgreSQL (batch 50)
   - Invalidate cache
   - Track metrics
3. **API** serves data with:
   - Cache check (Redis)
   - FTS queries (PostgreSQL)
   - Metrics collection
4. **Scheduler** triggers daily at 2 AM
5. **Monitoring** tracks all operations

## API Endpoints

### Search

```http
GET /api/search?q=computador&uf=SP&page=1&limit=20
```

**Parameters:**
- `q` - Search term (fuzzy match across product, item, city)
- `uf` - State filter (exact match)
- `cidade` - City filter (fuzzy match)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "produto": "Computador Desktop",
      "item": "Core i5, 8GB RAM",
      "unidade": "UN",
      "uf": "SP",
      "cidade": "Sao Paulo",
      "valor_minimo": 2500.00,
      "valor_medio": 3000.00,
      "valor_maximo": 3500.00,
      "relevancia": 0.85
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Queue Management

```http
GET /api/queue/status
POST /api/scraper/trigger
GET /api/scraper/batch/:batchId
```

See [API Documentation](docs/API.md) for complete reference.

## Project Structure

```
src/
├── config/          # Database, Redis, environment configs
├── controllers/     # Request handlers
├── errors/          # Custom error classes
├── maestro/         # Job orchestration & scheduling
├── middlewares/     # Security, rate limiting, error handling
├── queue/           # BullMQ queue configuration
├── repositories/    # Database access layer
├── routes/          # API route definitions
├── scraper/         # Selenium scraping logic
│   ├── config/      # Scraper configuration
│   ├── data/        # Product list (53 items)
│   ├── orchestrator/ # Worker cluster management
│   ├── services/    # Browser, page scraper services
│   ├── types/       # Scraper type definitions
│   └── workers/     # Individual worker logic
├── services/        # Business logic
├── types/           # Shared TypeScript types
└── workers/         # BullMQ worker implementation
```

## Technology Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| Runtime | Node.js 20 | JavaScript runtime |
| Language | TypeScript 5 | Type safety |
| Web Framework | Fastify 4 | High-performance HTTP server |
| ORM | Prisma 5 | Database access & migrations |
| Database | PostgreSQL 16 | Primary data store with FTS |
| Cache/Queue | Redis 7 | Job queue backend |
| Job Queue | BullMQ 5 | Distributed job processing |
| Scheduler | node-cron 3 | Task scheduling |
| Browser Automation | Selenium WebDriver 4 | Web scraping |
| Testing | Jest 29 | Unit & integration tests |
| Containerization | Docker & Docker Compose | Development & deployment |

## Configuration

Copy `.env.example` to `.env` and configure:

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/salic_produtos"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Cache
CACHE_TTL=300

# Application
NODE_ENV=development
PORT=3000

# Worker
WORKER_CONCURRENCY=3

# Scheduler
CRON_SCHEDULE="0 2 * * *"

# Security
SCRAPER_SECRET_KEY=your-secret-key-here

# Features
ENABLE_SWAGGER=true
ENABLE_CORS=true
```

## Development

```bash
# Install dependencies
npm install

# Start development mode (hot reload)
npm run dev              # API server
npm run dev:worker       # Worker process
npm run dev:maestro      # Scheduler (optional)

# Run tests
npm test                 # All tests
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests
npm run test:coverage    # With coverage report

# Database
npm run prisma:studio    # Open Prisma Studio GUI
npm run prisma:migrate   # Run migrations

# Production build
npm run build
npm start
```

## Production Deployment

Optimized for **Oracle Cloud Infrastructure (OCI)** Always Free tier:
- ARM Ampere A1 compute (24GB RAM)
- Autonomous Database (PostgreSQL compatible)
- Always Free Object Storage

See [Deployment Guide](docs/DEPLOYMENT.md) for complete instructions.

## Performance

- **Search Response Time**: < 50ms (with 100k+ records)
- **Scraping Rate**: ~150 items/minute (3 workers)
- **Database Indexing**: GIN indexes for O(log n) fuzzy search
- **Memory Usage**: ~200MB per worker
- **Concurrent Jobs**: 3-10 (configurable)

## Security

- ✅ Rate limiting (100 req/min global, 30 req/min search)
- ✅ Helmet security headers (CSP, HSTS, X-Frame-Options)
- ✅ CORS configuration
- ✅ API key authentication for triggers
- ✅ SQL injection prevention (Prisma ORM)
- ✅ Input validation (JSON Schema)

## Monitoring & Observability

### Metrics Collection
All key operations are instrumented with Prometheus metrics:
- HTTP request/response times
- Cache hit/miss rates
- Database query durations
- Scraper job success/failure rates
- Worker performance metrics

### Dashboards
Pre-configured Grafana dashboards available at `http://localhost:3001`:
- System overview
- API performance
- Cache effectiveness
- Scraper job monitoring
- Database query performance

### Alerts (Recommended Setup)
Configure alerts for:
- Error rate > 5%
- P95 response time > 2s
- Cache hit rate < 70%
- Scraper failure rate > 10%
- Database connection issues

See [Observability Guide](docs/OBSERVABILITY.md) for detailed setup.

## CI/CD Pipeline

Automated pipeline with GitHub Actions:

### On Push/PR
- TypeScript compilation check
- Unit tests (19 suites, 209 tests)
- Integration tests (Testcontainers)
- Coverage report (92%+)
- Security audit (npm audit)
- Vulnerability scanning (Trivy)

### On Main Branch
- Multi-platform Docker build (amd64, arm64)
- Push to Docker Hub
- Automated versioning

## Documentation

- [Quick Start Guide](QUICKSTART.md) - Get started in 5 minutes
- [API Reference](docs/API.md) - Complete API documentation
- [Architecture](docs/ARCHITECTURE.md) - System design details
- [Database Schema](docs/DATABASE.md) - Schema & indexes
- [Deployment](docs/DEPLOYMENT.md) - Production deployment guide
- [Development](docs/DEVELOPMENT.md) - Contributing guidelines
- [Observability](docs/OBSERVABILITY.md) - Monitoring, metrics & tracing
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md) - Recent features added
- [Security Fixes](SECURITY_FIXES.md) - Security updates & fixes

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

For issues and questions:
- Open an [Issue](../../issues)
- Check [Discussions](../../discussions)

---

**Production-ready web scraping and search system built with TypeScript, Fastify, PostgreSQL, and comprehensive observability.**
