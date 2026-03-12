# Database Schema & Design

Complete database documentation including schema, indexes, and query patterns.

## Schema Overview

The system uses a single primary table with extensive indexing for high-performance Full-Text Search.

## Primary Table: itens_orcamentarios

### Table Definition

```sql
CREATE TABLE itens_orcamentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto VARCHAR(255) NOT NULL,
  item VARCHAR(500) NOT NULL,
  unidade VARCHAR(50) NOT NULL,
  uf VARCHAR(2) NOT NULL,
  cidade VARCHAR(255) NOT NULL,
  valor_minimo DECIMAL(15,2) NOT NULL,
  valor_medio DECIMAL(15,2) NOT NULL,
  valor_maximo DECIMAL(15,2) NOT NULL,
  caminho_referencia TEXT,
  data_extracao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_item_location UNIQUE (produto, item, uf, cidade)
);
```

### Column Descriptions

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key, auto-generated |
| produto | VARCHAR(255) | NO | Product name/category |
| item | VARCHAR(500) | NO | Item description (detailed) |
| unidade | VARCHAR(50) | NO | Unit of measure (UN, KG, M2, etc) |
| uf | VARCHAR(2) | NO | Brazilian state code (SP, RJ, MG, etc) |
| cidade | VARCHAR(255) | NO | City name |
| valor_minimo | DECIMAL(15,2) | NO | Minimum price found |
| valor_medio | DECIMAL(15,2) | NO | Average price |
| valor_maximo | DECIMAL(15,2) | NO | Maximum price found |
| caminho_referencia | TEXT | YES | Source URL/reference path |
| data_extracao | TIMESTAMP | NO | Extraction timestamp |

### Constraints

#### Unique Constraint: unique_item_location

```sql
CONSTRAINT unique_item_location UNIQUE (produto, item, uf, cidade)
```

**Purpose:**
- Prevents duplicate entries
- Enables upsert operations (update or insert)
- Ensures data integrity

**Business Logic:**
- Same item in same location = update prices
- Same item in different location = new record
- Different item in same location = new record

## Indexes

### B-tree Indexes (Exact Match)

```sql
CREATE INDEX idx_itens_orcamentarios_produto
ON itens_orcamentarios(produto);

CREATE INDEX idx_itens_orcamentarios_uf
ON itens_orcamentarios(uf);

CREATE INDEX idx_itens_orcamentarios_cidade
ON itens_orcamentarios(cidade);
```

**Purpose:** Fast exact match queries
**Use Cases:**
- Filter by specific product
- Filter by state
- Filter by city (exact name)

**Performance:** O(log n) lookup time

### GIN Indexes (Full-Text Search)

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_itens_orcamentarios_produto_gin
ON itens_orcamentarios USING gin(produto gin_trgm_ops);

CREATE INDEX idx_itens_orcamentarios_item_gin
ON itens_orcamentarios USING gin(item gin_trgm_ops);

CREATE INDEX idx_itens_orcamentarios_cidade_gin
ON itens_orcamentarios USING gin(cidade gin_trgm_ops);

CREATE INDEX idx_itens_orcamentarios_text_search_gin
ON itens_orcamentarios USING gin((produto || ' ' || item || ' ' || cidade) gin_trgm_ops);
```

**Purpose:** Fuzzy/trigram-based text search
**Use Cases:**
- Typo-tolerant search
- Partial word matching
- Multi-field search

**How it works:**
- Splits text into trigrams (3-character sequences)
- "mouse" → ["mou", "ous", "use"]
- Matches similar trigram sets
- Returns similarity score (0.0 to 1.0)

**Performance:** O(log n) with GIN index

## Prisma Schema

```prisma
model ItemOrcamentario {
  id                  String   @id @default(uuid()) @db.Uuid
  produto             String   @db.VarChar(255)
  item                String   @db.VarChar(500)
  unidade             String   @db.VarChar(50)
  uf                  String   @db.VarChar(2)
  cidade              String   @db.VarChar(255)
  valor_minimo        Decimal  @db.Decimal(15, 2)
  valor_medio         Decimal  @db.Decimal(15, 2)
  valor_maximo        Decimal  @db.Decimal(15, 2)
  caminho_referencia  String?  @db.Text
  data_extracao       DateTime @default(now()) @db.Timestamp(6)

  @@unique([produto, item, uf, cidade], name: "unique_item_location")
  @@index([produto], name: "idx_itens_orcamentarios_produto")
  @@index([uf], name: "idx_itens_orcamentarios_uf")
  @@index([cidade], name: "idx_itens_orcamentarios_cidade")
  @@map("itens_orcamentarios")
}
```

## Query Patterns

### 1. Full-Text Search with Filters

```sql
SELECT
  *,
  similarity(produto || ' ' || item || ' ' || cidade, $1) AS relevancia
FROM itens_orcamentarios
WHERE
  (produto || ' ' || item || ' ' || cidade) % $1
  AND uf = $2
ORDER BY relevancia DESC
LIMIT 20
OFFSET 0;
```

**Parameters:**
- $1: Search term (e.g., "computador")
- $2: State filter (e.g., "SP")

**Index Used:** idx_itens_orcamentarios_text_search_gin

### 2. State and City Filter

```sql
SELECT *
FROM itens_orcamentarios
WHERE
  uf = $1
  AND cidade % $2
ORDER BY similarity(cidade, $2) DESC
LIMIT 20;
```

**Parameters:**
- $1: State code (exact)
- $2: City name (fuzzy)

**Indexes Used:**
- idx_itens_orcamentarios_uf (B-tree)
- idx_itens_orcamentarios_cidade_gin (GIN)

### 3. Product Search

```sql
SELECT *
FROM itens_orcamentarios
WHERE produto % $1
ORDER BY similarity(produto, $1) DESC
LIMIT 20;
```

**Parameters:**
- $1: Product search term

**Index Used:** idx_itens_orcamentarios_produto_gin

### 4. Upsert Operation

```sql
INSERT INTO itens_orcamentarios (
  produto, item, unidade, uf, cidade,
  valor_minimo, valor_medio, valor_maximo,
  caminho_referencia, data_extracao
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
ON CONFLICT (produto, item, uf, cidade)
DO UPDATE SET
  unidade = EXCLUDED.unidade,
  valor_minimo = EXCLUDED.valor_minimo,
  valor_medio = EXCLUDED.valor_medio,
  valor_maximo = EXCLUDED.valor_maximo,
  caminho_referencia = EXCLUDED.caminho_referencia,
  data_extracao = EXCLUDED.data_extracao;
```

**Purpose:** Update existing or insert new
**Conflict Target:** unique_item_location constraint
**Performance:** Single query for both operations

### 5. Count Query (Pagination)

```sql
SELECT COUNT(*)
FROM itens_orcamentarios
WHERE (produto || ' ' || item || ' ' || cidade) % $1;
```

**Optimization:** Run in parallel with data query

## Performance Characteristics

### Table Size Estimates

| Records | Table Size | Index Size | Total Size |
|---------|-----------|-----------|-----------|
| 10k | ~5 MB | ~15 MB | ~20 MB |
| 100k | ~50 MB | ~150 MB | ~200 MB |
| 1M | ~500 MB | ~1.5 GB | ~2 GB |

### Query Performance

| Operation | Without Index | With Index | Speedup |
|-----------|--------------|-----------|---------|
| Exact match | 100ms | 1ms | 100x |
| FTS search | 500ms | 10ms | 50x |
| Upsert | 50ms | 5ms | 10x |

*Benchmarks on 100k records, PostgreSQL 16, 4GB RAM*

## Maintenance

### Vacuum & Analyze

```sql
VACUUM ANALYZE itens_orcamentarios;
```

**Frequency:** Weekly or after large updates
**Purpose:**
- Reclaim storage
- Update statistics
- Optimize query planner

### Reindex

```sql
REINDEX TABLE itens_orcamentarios;
```

**When to run:**
- Index bloat detected
- Performance degradation
- After major data changes

### Statistics

```sql
SELECT
  relname,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE relname = 'itens_orcamentarios';
```

## Backup Strategy

### Logical Backup (pg_dump)

```bash
pg_dump -h localhost -U salic_user -d salic_produtos \
  -t itens_orcamentarios \
  -F c -f backup.dump
```

**Frequency:** Daily
**Retention:** 30 days

### Point-in-Time Recovery (PITR)

```
postgresql.conf:
  wal_level = replica
  archive_mode = on
  archive_command = 'cp %p /archive/%f'
```

**Frequency:** Continuous
**Retention:** 7 days

## Migration Strategy

### Adding a Column

```sql
ALTER TABLE itens_orcamentarios
ADD COLUMN novo_campo VARCHAR(100);

UPDATE itens_orcamentarios
SET novo_campo = 'valor_default'
WHERE novo_campo IS NULL;

ALTER TABLE itens_orcamentarios
ALTER COLUMN novo_campo SET NOT NULL;
```

### Adding an Index (Online)

```sql
CREATE INDEX CONCURRENTLY idx_novo
ON itens_orcamentarios(novo_campo);
```

**Note:** CONCURRENTLY prevents table locking

### Removing a Column

```sql
ALTER TABLE itens_orcamentarios
DROP COLUMN campo_antigo;
```

**Warning:** Irreversible, backup first

## Monitoring Queries

### Index Usage

```sql
SELECT
  indexrelname as index_name,
  idx_scan as times_used,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE relname = 'itens_orcamentarios'
ORDER BY idx_scan DESC;
```

### Table Size

```sql
SELECT
  pg_size_pretty(pg_total_relation_size('itens_orcamentarios')) as total_size,
  pg_size_pretty(pg_relation_size('itens_orcamentarios')) as table_size,
  pg_size_pretty(pg_indexes_size('itens_orcamentarios')) as indexes_size;
```

### Slow Queries

```sql
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE query LIKE '%itens_orcamentarios%'
ORDER BY mean_time DESC
LIMIT 10;
```

**Requirement:** pg_stat_statements extension

## Data Dictionary

### UF Codes (Brazilian States)

```
AC - Acre
AL - Alagoas
AP - Amapa
AM - Amazonas
BA - Bahia
CE - Ceara
DF - Distrito Federal
ES - Espirito Santo
GO - Goias
MA - Maranhao
MT - Mato Grosso
MS - Mato Grosso do Sul
MG - Minas Gerais
PA - Para
PB - Paraiba
PR - Parana
PE - Pernambuco
PI - Piaui
RJ - Rio de Janeiro
RN - Rio Grande do Norte
RS - Rio Grande do Sul
RO - Rondonia
RR - Roraima
SC - Santa Catarina
SP - Sao Paulo
SE - Sergipe
TO - Tocantins
```

### Common Units (Unidade)

```
UN - Unidade
KG - Quilograma
M - Metro
M2 - Metro Quadrado
M3 - Metro Cubico
L - Litro
CX - Caixa
PC - Peca
HR - Hora
DIA - Dia
```

## Best Practices

1. **Always use Prisma for queries** - Prevents SQL injection
2. **Batch upserts** - Process 50 items at a time
3. **Use GIN for search** - Don't use LIKE '%term%'
4. **Paginate results** - Never SELECT * without LIMIT
5. **Monitor index usage** - Remove unused indexes
6. **Regular VACUUM** - Prevents table bloat
7. **Backup before migrations** - Safety first
