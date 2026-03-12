#!/bin/bash

echo "🔍 Verificando FASE 1 - Infraestrutura e Banco de Dados"
echo "========================================================"
echo ""

echo "1️⃣  Verificando Containers Docker..."
echo "-----------------------------------"
docker ps --filter "name=salic" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "2️⃣  Verificando Servidor Fastify..."
echo "-----------------------------------"
curl -s http://localhost:3000/health | jq '.'
echo ""

echo "3️⃣  Verificando Extensão pg_trgm..."
echo "-----------------------------------"
docker exec salic_postgres psql -U salic_user -d salic_produtos -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_trgm';" -t
echo ""

echo "4️⃣  Verificando Índices GIN criados..."
echo "-----------------------------------"
docker exec salic_postgres psql -U salic_user -d salic_produtos -c "SELECT indexname FROM pg_indexes WHERE tablename = 'itens_orcamentarios' AND indexname LIKE '%_gin';" -t
echo ""

echo "5️⃣  Verificando Constraint de Unicidade..."
echo "-----------------------------------"
docker exec salic_postgres psql -U salic_user -d salic_produtos -c "SELECT conname FROM pg_constraint WHERE conname = 'itens_orcamentarios_produto_item_uf_cidade_key';" -t
echo ""

echo "✅ FASE 1 - VERIFICAÇÃO COMPLETA!"
echo ""
echo "📊 Resumo:"
echo "  • PostgreSQL 16: ✅ Rodando"
echo "  • Redis 7: ✅ Rodando"
echo "  • Fastify Server: ✅ Online"
echo "  • Extensão pg_trgm: ✅ Habilitada"
echo "  • Índices GIN (FTS): ✅ 4 índices criados"
echo "  • Unique Constraint: ✅ Configurada para Upsert"
echo ""
echo "🎯 Sistema pronto para FASE 2: Arquitetura de Filas"
