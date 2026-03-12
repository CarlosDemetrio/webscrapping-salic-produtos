-- Restore GIN indexes for Full Text Search (FTS) that were dropped in previous migration
CREATE INDEX IF NOT EXISTS idx_itens_orcamentarios_produto_gin
  ON itens_orcamentarios USING gin (produto gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_itens_orcamentarios_item_gin
  ON itens_orcamentarios USING gin (item gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_itens_orcamentarios_cidade_gin
  ON itens_orcamentarios USING gin (cidade gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_itens_orcamentarios_text_search_gin
  ON itens_orcamentarios USING gin ((produto || ' ' || item || ' ' || cidade) gin_trgm_ops);
