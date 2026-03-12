# Development Guide

Guidelines for contributing to the SALIC Web Scraping API project.

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Git
- PostgreSQL client (optional, for direct DB access)
- Redis client (optional, for queue inspection)

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd webscrapping-salic-produtos

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start infrastructure
docker-compose up -d postgres redis

# Run migrations
npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate
```

### Development Workflow

```bash
# Terminal 1: API Server (hot reload)
npm run dev

# Terminal 2: Worker (hot reload)
npm run dev:worker

# Terminal 3: Maestro (optional, hot reload)
npm run dev:maestro

# Terminal 4: Run tests
npm test
```

## Project Structure

```
src/
├── config/           # Configuration files
│   ├── database.ts   # Prisma client
│   ├── env.ts        # Environment validation
│   └── redis.ts      # Redis connection
│
├── controllers/      # HTTP request handlers
│   ├── queue.controller.ts
│   └── search.controller.ts
│
├── errors/           # Custom error classes
│   └── AppError.ts
│
├── maestro/          # Orchestration & scheduling
│   ├── index.ts      # Entry point
│   ├── maestro.ts    # Job enqueuing logic
│   └── scheduler.ts  # Cron scheduling
│
├── middlewares/      # Express/Fastify middleware
│   ├── errorHandler.ts
│   └── security.ts
│
├── queue/            # BullMQ configuration
│   └── scraperQueue.ts
│
├── repositories/     # Data access layer
│   └── item.repository.ts
│
├── routes/           # API route definitions
│   ├── index.ts
│   ├── health.routes.ts
│   ├── queue.routes.ts
│   └── search.routes.ts
│
├── schemas/          # Validation schemas
│   └── api.schemas.ts
│
├── scraper/          # Web scraping logic
│   ├── config/       # Scraper configuration
│   ├── data/         # Product data
│   ├── orchestrator/ # Worker orchestration
│   ├── services/     # Scraping services
│   ├── types/        # Type definitions
│   └── workers/      # Worker implementation
│
├── services/         # Business logic layer
│   ├── queue.service.ts
│   └── search.service.ts
│
├── types/            # Shared TypeScript types
│   ├── item.types.ts
│   └── search.types.ts
│
├── workers/          # BullMQ worker
│   └── scraperWorker.ts
│
├── server.ts         # API entry point
└── worker.ts         # Worker entry point
```

## Code Style Guidelines

### TypeScript

**Follow AGENTS.md rules strictly:**
- NO emojis in code, comments, or logs
- Minimal comments (only for complex logic/workarounds)
- Strict TypeScript mode
- NO `any` types
- Explicit return types

**Example:**

```typescript
// BAD
function getData(): any {
  console.log('Getting data...');
  return result;
}

// GOOD
function getData(): ItemOrcamentarioDTO[] {
  return itemRepository.findAll();
}
```

### Naming Conventions

```typescript
// Files: kebab-case
item.repository.ts
search.service.ts

// Classes/Interfaces: PascalCase
class SearchService {}
interface ItemOrcamentarioDTO {}

// Variables/Functions: camelCase
const searchTerm = 'computer';
function findItems() {}

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_PAGE_SIZE = 20;
```

### SOLID Principles

#### Single Responsibility

Each class/module has one reason to change:

```typescript
// ItemRepository: Database access only
class ItemRepository {
  async findAll(): Promise<ItemOrcamentarioDTO[]> {
    return prisma.itemOrcamentario.findMany();
  }
}

// SearchService: Business logic only
class SearchService {
  constructor(private itemRepository: ItemRepository) {}

  async search(criteria: SearchCriteria) {
    const items = await this.itemRepository.findByCriteria(criteria);
    return this.formatResults(items);
  }
}

// SearchController: HTTP handling only
class SearchController {
  constructor(private searchService: SearchService) {}

  async search(request: FastifyRequest, reply: FastifyReply) {
    const results = await this.searchService.search(request.query);
    return reply.send(results);
  }
}
```

#### Dependency Inversion

Depend on abstractions, not implementations:

```typescript
// GOOD: Interface-based
interface ItemRepository {
  findAll(): Promise<ItemOrcamentarioDTO[]>;
}

class SearchService {
  constructor(private repository: ItemRepository) {}
}

// BAD: Concrete dependency
class SearchService {
  constructor(private prismaClient: PrismaClient) {}
}
```

## Testing Strategy

### Test Structure

```
tests/
├── setup.ts          # Test configuration
├── unit/             # Unit tests (isolated)
│   ├── services/
│   ├── repositories/
│   └── utils/
└── integration/      # Integration tests (real deps)
    ├── api/
    └── scraper/
```

### Writing Tests

**Unit Test Example:**

```typescript
import { SearchService } from '../../src/services/search.service';
import { ItemRepository } from '../../src/repositories/item.repository';

describe('SearchService', () => {
  let service: SearchService;
  let mockRepository: jest.Mocked<ItemRepository>;

  beforeEach(() => {
    mockRepository = {
      findByCriteria: jest.fn(),
    } as any;
    service = new SearchService(mockRepository);
  });

  it('should return formatted results', async () => {
    const mockItems = [{ id: '1', produto: 'Test' }];
    mockRepository.findByCriteria.mockResolvedValue(mockItems);

    const result = await service.search({ q: 'test' });

    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('pagination');
  });
});
```

**Integration Test Example:**

```typescript
import { createServer } from '../../src/server';
import { FastifyInstance } from 'fastify';

describe('Search API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/search should return results', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/search?q=computador',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');
  });
});
```

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Coverage Goals

- Overall: 80%+
- Services: 90%+
- Controllers: 80%+
- Repositories: 90%+
- Utils: 95%+

## Database Development

### Creating Migrations

```bash
# Create migration
npm run prisma:migrate dev --name add_new_field

# Apply migrations
npm run prisma:migrate deploy

# Reset database (dev only)
npm run prisma:migrate reset
```

### Seeding Data

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.itemOrcamentario.createMany({
    data: [
      {
        produto: 'Teste',
        item: 'Item teste',
        unidade: 'UN',
        uf: 'SP',
        cidade: 'Sao Paulo',
        valor_minimo: 10.00,
        valor_medio: 15.00,
        valor_maximo: 20.00,
      },
    ],
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

```bash
# Run seed
npm run prisma:db:seed
```

## API Development

### Adding New Endpoint

1. **Define Schema** (`src/schemas/api.schemas.ts`):

```typescript
export const newEndpointSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object' },
      },
    },
  },
};
```

2. **Create Service** (`src/services/new.service.ts`):

```typescript
export class NewService {
  async doSomething() {
    // Business logic
    return result;
  }
}
```

3. **Create Controller** (`src/controllers/new.controller.ts`):

```typescript
export class NewController {
  async handleRequest(request: FastifyRequest, reply: FastifyReply) {
    const result = await newService.doSomething();
    return reply.send({ success: true, data: result });
  }
}
```

4. **Add Route** (`src/routes/new.routes.ts`):

```typescript
export default async function newRoutes(fastify: FastifyInstance) {
  fastify.get('/api/new', {
    schema: newEndpointSchema,
  }, newController.handleRequest);
}
```

5. **Register Route** (`src/routes/index.ts`):

```typescript
import newRoutes from './new.routes';

export default async function routes(fastify: FastifyInstance) {
  await fastify.register(newRoutes);
}
```

6. **Write Tests**:

```typescript
describe('New Endpoint', () => {
  it('should work', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/new',
    });
    expect(response.statusCode).toBe(200);
  });
});
```

## Debugging

### VS Code Configuration

`.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug API",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 9229,
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["test", "--", "--runInBand"],
      "port": 9229,
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### Logging

Use structured logging:

```typescript
// GOOD
app.log.info({ userId: 123, action: 'login' }, 'User logged in');

// BAD
console.log('User 123 logged in');
```

### Inspecting Queue

```bash
# Install BullMQ CLI
npm install -g bullmq-cli

# Inspect queue
bullmq-cli queue scraper-queue

# Clean queue
bullmq-cli queue scraper-queue clean
```

## Git Workflow

### Branch Naming

```
feature/add-export-endpoint
fix/search-pagination-bug
refactor/improve-error-handling
docs/update-api-reference
```

### Commit Messages

Follow conventional commits:

```
feat: add CSV export endpoint
fix: correct pagination calculation in search
refactor: extract mapper to separate class
docs: update API documentation
test: add unit tests for search service
chore: update dependencies
```

### Pull Request Process

1. Create feature branch
2. Write code + tests
3. Run tests: `npm test`
4. Run linter: `npm run lint` (if configured)
5. Create PR with description
6. Wait for review
7. Address feedback
8. Merge when approved

## Performance Optimization

### Database Queries

```typescript
// BAD: N+1 query problem
for (const item of items) {
  const details = await prisma.detail.findMany({ where: { itemId: item.id } });
}

// GOOD: Single query with include
const items = await prisma.item.findMany({
  include: { details: true },
});
```

### Parallel Operations

```typescript
// BAD: Sequential
const result1 = await operation1();
const result2 = await operation2();

// GOOD: Parallel
const [result1, result2] = await Promise.all([
  operation1(),
  operation2(),
]);
```

### Caching Strategy

```typescript
import { Redis } from 'ioredis';

class CacheService {
  constructor(private redis: Redis) {}

  async getCached<T>(key: string, fetch: () => Promise<T>, ttl = 3600): Promise<T> {
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);

    const data = await fetch();
    await this.redis.setex(key, ttl, JSON.stringify(data));
    return data;
  }
}
```

## Documentation

### Code Documentation

Only document complex logic:

```typescript
// GOOD: Complex algorithm needs explanation
// Boyer-Moore string matching for O(n/m) performance
// See: https://en.wikipedia.org/wiki/Boyer%E2%80%93Moore_string-search_algorithm
function findPattern(text: string, pattern: string): number {
  // Implementation
}

// BAD: Obvious code doesn't need comments
// Get user by ID
function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}
```

### API Documentation

Update Swagger schemas:

```typescript
const schema = {
  description: 'Search for budget items',
  tags: ['Search'],
  querystring: {
    type: 'object',
    properties: {
      q: { type: 'string', description: 'Search term' },
      uf: { type: 'string', pattern: '^[A-Z]{2}$' },
    },
  },
  response: {
    200: { /* schema */ },
  },
};
```

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
lsof -ti:3000 | xargs kill -9
```

**Prisma client out of sync:**
```bash
npm run prisma:generate
```

**Docker containers not starting:**
```bash
docker-compose down -v
docker-compose up -d
```

**Tests failing:**
```bash
# Reset test database
npm run prisma:migrate reset -- --force
```

## Resources

- [Fastify Documentation](https://www.fastify.io/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Documentation](https://jestjs.io/)

## Getting Help

- Check existing issues
- Read documentation
- Ask in discussions
- Create new issue with:
  - Clear description
  - Steps to reproduce
  - Expected vs actual behavior
  - Environment details
