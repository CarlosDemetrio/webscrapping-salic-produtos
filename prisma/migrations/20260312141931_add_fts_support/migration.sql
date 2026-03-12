-- Enable pg_trgm extension for trigram-based similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index on produto field for fast full-text search
CREATE INDEX IF NOT EXISTS idx_itens_orcamentarios_produto_gin
  ON itens_orcamentarios USING gin (produto gin_trgm_ops);

-- Create GIN index on item field for fast full-text search
CREATE INDEX IF NOT EXISTS idx_itens_orcamentarios_item_gin
  ON itens_orcamentarios USING gin (item gin_trgm_ops);

-- Create GIN index on cidade field for fast full-text search
CREATE INDEX IF NOT EXISTS idx_itens_orcamentarios_cidade_gin
  ON itens_orcamentarios USING gin (cidade gin_trgm_ops);

-- Create composite GIN index for multi-field text search
CREATE INDEX IF NOT EXISTS idx_itens_orcamentarios_text_search_gin
  ON itens_orcamentarios USING gin ((produto || ' ' || item || ' ' || cidade) gin_trgm_ops);
