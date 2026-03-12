# System Architecture

Detailed architecture documentation for SALIC Web Scraping & Search API.

## System Overview

The system is built on a distributed architecture with three main components:

1. **API Server** (Fastify) - REST API with Full-Text Search
2. **Job Queue** (BullMQ + Redis) - Distributed job management
3. **Worker Pool** (Selenium) - Parallel web scraping

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│                     (Frontend / API Consumer)                    │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             │ HTTP/REST
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                        API LAYER (Fastify)                        │
├───────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐            │
│  │ Rate Limiter│  │   Helmet    │  │   CORS       │            │
│  │  Security   │  │   Headers   │  │   Config     │            │
│  └─────────────┘  └─────────────┘  └──────────────┘            │
├───────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐            │
│  │ Controllers │  │  Services   │  │ Repositories │            │
│  │   (Routes)  │  │  (Business) │  │    (Data)    │            │
│  └─────────────┘  └─────────────┘  └──────────────┘            │
└───────────┬────────────────────────────┬──────────────────────────┘
            │                            │
            │                            │
   ┌────────▼────────┐          ┌────────▼────────┐
   │                 │          │                 │
   │  PostgreSQL 16  │          │    Redis 7      │
   │                 │          │                 │
   │  ┌───────────┐  │          │  ┌───────────┐  │
   │  │ pg_trgm   │  │          │  │  BullMQ   │  │
   │  │ Extension │  │          │  │   Queue   │  │
   │  └───────────┘  │          │  └───────────┘  │
   │                 │          │                 │
   │  ┌───────────┐  │          └────────┬────────┘
   │  │GIN Indexes│  │                   │
   │  │  (FTS)    │  │                   │
   │  └───────────┘  │          ┌────────▼────────┐
   │                 │          │                 │
   │  ┌───────────┐  │          │  Worker Pool    │
   │  │  Upsert   │  │          │   (BullMQ)      │
   │  │  Logic    │  │          │                 │
   │  └───────────┘  │          │  ┌───────────┐  │
   │                 │          │  │ Worker 1  │  │
   └─────────────────┘          │  │ Worker 2  │  │
                                │  │ Worker 3  │  │
                                │  └───────────┘  │
                                │                 │
                                │  ┌───────────┐  │
                                │  │ Selenium  │  │
                                │  │ Browsers  │  │
                                │  └───────────┘  │
                                └────────┬────────┘
                                         │
                                ┌────────▼────────┐
                                │                 │
                                │  SALIC System   │
                                │ (Target Website)│
                                │                 │
                                └─────────────────┘
```

## Component Details

### 1. API Layer

**Technology:** Fastify 4 + TypeScript 5

**Responsibilities:**
- Handle HTTP requests
- Request validation (JSON Schema)
- Response formatting
- Error handling
- Security enforcement
- Rate limiting

**Key Features:**
- Swagger/OpenAPI documentation
- CORS configuration
- Helmet security headers
- Pino structured logging
- Global error handler

**Structure:**
```
src/
├── routes/          # Endpoint definitions
├── controllers/     # Request handling
├── services/        # Business logic
├── repositories/    # Database access
├── middlewares/     # Cross-cutting concerns
├── schemas/         # Validation schemas
└── errors/          # Custom error classes
```

### 2. Database Layer

**Technology:** PostgreSQL 16 + Prisma ORM

**Key Features:**

1. **Full-Text Search (pg_trgm)**
   - Trigram-based fuzzy matching
   - GIN indexes for O(log n) performance
   - Multi-field search support

2. **Upsert Logic**
   - Unique constraint: [produto, item, uf, cidade]
   - Batch processing (50 items)
   - Automatic timestamp updates

3. **Performance Optimization**
   - B-tree indexes for exact matches
   - GIN indexes for FTS
   - Composite indexes for complex queries

**Schema:**
```sql
CREATE TABLE itens_orcamentarios (
  id UUID PRIMARY KEY,
  produto VARCHAR(255) NOT NULL,
  item VARCHAR(500) NOT NULL,
  unidade VARCHAR(50) NOT NULL,
  uf VARCHAR(2) NOT NULL,
  cidade VARCHAR(255) NOT NULL,
  valor_minimo DECIMAL(15,2) NOT NULL,
  valor_medio DECIMAL(15,2) NOT NULL,
  valor_maximo DECIMAL(15,2) NOT NULL,
  caminho_referencia TEXT,
  data_extracao TIMESTAMP NOT NULL,
  CONSTRAINT unique_item_location UNIQUE (produto, item, uf, cidade)
);
```

### 3. Queue Layer

**Technology:** BullMQ 5 + Redis 7

**Responsibilities:**
- Job management
- Worker coordination
- Retry logic
- Progress tracking

**Configuration:**
```typescript
{
  connection: Redis,
  concurrency: 3,
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000
  },
  limiter: {
    max: 10,
    duration: 1000
  }
}
```

**Job Lifecycle:**
```
[Enqueued] → [Waiting] → [Active] → [Completed]
                ↓                        ↓
            [Delayed]                [Failed]
                ↓                        ↓
            [Retry]                  [Dead]
```

### 4. Worker Layer

**Technology:** Selenium WebDriver 4 + Chrome Headless

**Responsibilities:**
- Browser automation
- Data extraction
- Data transformation
- Database persistence

**Worker Process:**
```
1. Receive job from queue
2. Launch Selenium browser
3. Navigate to SALIC system
4. Select product and items
5. Extract data from tables
6. Transform to DTO format
7. Batch upsert to database
8. Close browser
9. Report completion
```

**Concurrency Model:**
- 3 workers by default
- Each with independent browser
- Parallel processing
- Automatic retry on failure

### 5. Maestro Layer

**Technology:** Node-cron 3

**Responsibilities:**
- Job orchestration
- Batch management
- Scheduling
- Progress monitoring

**Maestro Workflow:**
```
1. Trigger (Cron or Manual)
2. Load product list (53 products)
3. Create jobs with unique IDs
4. Enqueue to BullMQ
5. Monitor progress
6. Report status
```

## Data Flow

### Scraping Flow

```
┌───────────────┐
│   Scheduler   │
│  (Cron 2 AM)  │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│    Maestro    │
│ Enqueue Jobs  │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  BullMQ Queue │
│  (53 jobs)    │
└───────┬───────┘
        │
        ├─────┬─────┬─────┐
        │     │     │     │
        ▼     ▼     ▼     ▼
    ┌─────┬─────┬─────┐
    │W #1 │W #2 │W #3 │
    └──┬──┴──┬──┴──┬──┘
       │     │     │
       ▼     ▼     ▼
    ┌────────────────┐
    │  SALIC System  │
    └────────┬───────┘
             │
             ▼
    ┌────────────────┐
    │   PostgreSQL   │
    │   (Upsert)     │
    └────────────────┘
```

### Search Flow

```
┌───────────────┐
│    Client     │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  API Server   │
│ /api/search   │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Query Builder │
│  (Prisma)     │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  PostgreSQL   │
│  (GIN Index)  │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│   Response    │
│ (JSON + Meta) │
└───────────────┘
```

## SOLID Principles

### Single Responsibility

Each class/module has one reason to change:
- `ItemRepository`: Database access only
- `SearchService`: Business logic only
- `SearchController`: HTTP handling only
- `ItemMapper`: Data transformation only

### Open/Closed

Extensible without modification:
- New products: update data file
- New scrapers: implement interface
- New validators: chain middleware

### Liskov Substitution

Interfaces honored:
- All repositories implement base interface
- Services depend on abstractions
- Mappers are interchangeable

### Interface Segregation

Specific interfaces per client:
- `ItemOrcamentarioDTO` for database
- `ItemExtraidoScraper` for scraper
- Separate types per domain

### Dependency Inversion

High-level depends on abstractions:
- Controllers depend on service interfaces
- Services depend on repository interfaces
- No direct dependencies on implementations

## Security Architecture

### Layers

1. **Network Layer**
   - CORS configuration
   - Trusted proxy headers
   - TLS/HTTPS (production)

2. **Application Layer**
   - Helmet security headers
   - Rate limiting (token bucket)
   - API key authentication

3. **Data Layer**
   - Prisma ORM (SQL injection prevention)
   - Input validation (JSON Schema)
   - Sanitization

### Rate Limiting Strategy

```typescript
Global: 100 requests/minute
Search: 30 requests/minute
Trigger: 10 requests/minute
```

Token Bucket algorithm:
- Refills over time
- Burst capacity
- Per-IP tracking

## Performance Optimization

### Database

1. **Indexing Strategy**
   - B-tree for exact match filters
   - GIN for fuzzy search
   - Composite for multi-column queries

2. **Query Optimization**
   - Parallel count + data queries
   - Limit result set early
   - Use materialized CTEs when needed

3. **Connection Pooling**
   - Prisma connection pool
   - Max connections: 10
   - Idle timeout: 60s

### Application

1. **Caching**
   - Redis for queue state
   - In-memory for config
   - HTTP cache headers

2. **Async Processing**
   - Non-blocking I/O
   - Promise.all for parallel ops
   - Stream large datasets

3. **Resource Management**
   - Browser pool in workers
   - Graceful shutdown
   - Memory leak prevention

## Monitoring & Observability

### Logging

Structured logging with Pino:
```typescript
{
  level: 'info',
  timestamp: '2026-03-12T10:30:00.000Z',
  pid: 1234,
  hostname: 'worker-1',
  msg: 'Job completed',
  jobId: 'abc123',
  duration: 15000
}
```

### Metrics

Key metrics to track:
- Request rate (req/s)
- Response time (p50, p95, p99)
- Error rate (%)
- Queue depth
- Worker utilization
- Database connection pool

### Health Checks

```
GET /health
- Database connectivity
- Redis connectivity
- API uptime
- Memory usage
```

## Deployment Architecture

### Development

```
Docker Compose:
- PostgreSQL container
- Redis container
- API (host mode)
- Workers (host mode)
```

### Production (OCI)

```
Compute Instance (ARM Ampere A1):
- API Server (PM2)
- Workers (PM2)
- Redis (Docker)

Autonomous Database:
- PostgreSQL compatible
- Automatic backups
- High availability

Load Balancer:
- HTTPS termination
- Health checks
- Auto-scaling
```

## Scalability

### Horizontal Scaling

1. **API Servers**
   - Stateless design
   - Load balancer distribution
   - Session-free

2. **Workers**
   - Independent processes
   - No shared state
   - Dynamic scaling

### Vertical Scaling

1. **Database**
   - Connection pooling
   - Read replicas
   - Partitioning

2. **Redis**
   - Cluster mode
   - Sentinel for HA
   - Persistence configuration

## Failure Handling

### Retry Strategy

```
Attempt 1: Immediate
Attempt 2: 5s delay
Attempt 3: 25s delay
Failed: Move to dead letter
```

### Circuit Breaker

Not yet implemented. Future:
- Open on 50% failure rate
- Half-open after 60s
- Close on 3 successes

### Graceful Degradation

- Queue continues on API failure
- API serves cached on DB failure
- Workers retry on network issues

## Future Enhancements

1. **Observability**
   - Prometheus metrics
   - Grafana dashboards
   - Distributed tracing

2. **Resilience**
   - Circuit breakers
   - Bulkheads
   - Timeouts

3. **Performance**
   - Redis caching layer
   - Database read replicas
   - CDN for static assets

4. **Features**
   - WebSocket for real-time updates
   - GraphQL API
   - Export to CSV/Excel
