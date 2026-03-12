# API Reference

Complete API documentation for SALIC Web Scraping & Search API.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Some endpoints require API key authentication via header:

```http
X-API-Key: your-secret-key
```

## Endpoints

### Health Check

#### GET /health

Check API server health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-12T10:30:00.000Z",
  "uptime": 3600
}
```

---

### Search

#### GET /api/search

Search budget items with Full-Text Search (fuzzy matching).

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | No* | Search term (fuzzy match across product, item, city) |
| uf | string | No* | State code filter (exact match, 2 chars) |
| cidade | string | No* | City filter (fuzzy match) |
| page | number | No | Page number (default: 1, min: 1) |
| limit | number | No | Items per page (default: 20, min: 1, max: 100) |

*At least one filter (q, uf, or cidade) is required.

**Example Request:**

```bash
curl "http://localhost:3000/api/search?q=computador&uf=SP&page=1&limit=20"
```

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "produto": "Computador Desktop",
      "item": "Computador Core i5, 8GB RAM, 256GB SSD",
      "unidade": "UN",
      "uf": "SP",
      "cidade": "Sao Paulo",
      "valor_minimo": 2500.00,
      "valor_medio": 3000.00,
      "valor_maximo": 3500.00,
      "caminho_referencia": "http://sistemas.cultura.gov.br/...",
      "data_extracao": "2026-03-12T02:30:00.000Z",
      "relevancia": 0.8523
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "filters": {
    "searchTerm": "computador",
    "uf": "SP",
    "cidade": null
  }
}
```

**Error Response (400):**

```json
{
  "error": "Bad Request",
  "message": "Informe pelo menos um criterio de busca: q, uf ou cidade"
}
```

---

### Queue Management

#### GET /api/queue/status

Get current queue statistics.

**Response:**

```json
{
  "queue": "scraper-queue",
  "counts": {
    "waiting": 15,
    "active": 3,
    "completed": 35,
    "failed": 0,
    "delayed": 0,
    "total": 53
  },
  "timestamp": "2026-03-12T10:30:00.000Z"
}
```

---

### Scraper Management

#### POST /api/scraper/trigger

Trigger full scraping of all 53 products (requires authentication).

**Headers:**

```http
X-API-Key: your-secret-key
```

**Response (200):**

```json
{
  "success": true,
  "batchId": "manual-api-1710252000000",
  "timestamp": "2026-03-12T15:30:00.000Z",
  "totalProdutos": 53,
  "jobsEnfileirados": [
    {
      "jobId": "manual-api-1710252000000-produto-001-...",
      "produtoId": "001",
      "produtoNome": "Alimentacao"
    }
  ],
  "tempoSegundos": 0.45
}
```

**Error Response (401):**

```json
{
  "error": "Unauthorized",
  "message": "Unauthorized: Invalid API Key"
}
```

**Error Response (500):**

```json
{
  "error": "Internal Server Error",
  "message": "SCRAPER_SECRET_KEY nao configurada no servidor"
}
```

---

#### GET /api/scraper/batch/:batchId

Get status of a specific scraping batch.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| batchId | string | Yes | Batch identifier |

**Example Request:**

```bash
curl "http://localhost:3000/api/scraper/batch/manual-api-1710252000000"
```

**Response (200):**

```json
{
  "batchId": "manual-api-1710252000000",
  "status": {
    "total": 53,
    "processados": 35,
    "emProcessamento": 3,
    "aguardando": 15,
    "falhados": 0,
    "progresso": "66.04%"
  },
  "jobs": {
    "completed": [
      {
        "id": "manual-api-1710252000000-produto-001-...",
        "name": "scrape-produto-001"
      }
    ],
    "active": [
      {
        "id": "manual-api-1710252000000-produto-036-...",
        "name": "scrape-produto-036"
      }
    ],
    "waiting": [...],
    "failed": []
  },
  "timestamp": "2026-03-12T15:35:00.000Z"
}
```

---

### Test Endpoints

#### POST /api/test/enqueue

Enqueue a test scraping job (for development/testing).

**Response (200):**

```json
{
  "success": true,
  "message": "Job de teste enfileirado com sucesso",
  "jobId": "test-scraper-12345",
  "data": {
    "produtoId": "TESTE-001",
    "produtoNome": "Produto de Teste - Fase 3"
  }
}
```

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| Global | 100 requests/minute |
| /api/search | 30 requests/minute |
| /api/test/enqueue | 10 requests/minute |
| /api/scraper/trigger | 10 requests/minute |

When rate limit is exceeded, API returns:

```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded, retry in 60 seconds"
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing API key |
| 404 | Not Found - Resource does not exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---

## Swagger/OpenAPI

Interactive API documentation available at:

```
http://localhost:3000/docs
```

Features:
- Try out endpoints directly from browser
- View request/response schemas
- See all available parameters
- Test authentication
