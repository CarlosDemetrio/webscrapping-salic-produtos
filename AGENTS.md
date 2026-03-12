# AGENTS.md - Guia para Agentes de IA

## Sobre o Projeto

**Web Scraping SALIC** - Sistema de alta performance para extracao diaria de dados orcamentarios
- Stack: Node.js + TypeScript + Fastify + Prisma + PostgreSQL + Redis + BullMQ
- Deploy: Oracle Cloud (ARM Ampere A1, 24GB)
- Problema: SALIC tem Session Lock. Solucao: multiplos workers paralelos

---

## REGRAS CRITICAS

### 1. TDD OBRIGATORIO
- Escrever testes ANTES do codigo
- Ciclo: Red (falha) -> Green (passa) -> Refactor
- NUNCA implementar sem teste

### 2. SEM EMOJIS
- NUNCA use emojis em codigo, logs, comentarios ou documentacao

### 3. COMENTARIOS MINIMOS
- Comentar APENAS: decisoes tecnicas, workarounds, algoritmos complexos
- Codigo deve ser auto-explicativo
- NUNCA comentar obviedades

### 4. TESTES REAIS
- Unitarios: usar Redis/Queue real quando possivel
- Integracao: usar Testcontainers (PostgreSQL + Redis reais)
- NUNCA mockar tudo

### 5. QUALIDADE
- TypeScript strict mode
- NUNCA use any
- NUNCA use console.log em producao
- Tratamento de erros robusto

---

## STACK - ESSENCIAL

### TypeScript
- Strict mode
- Tipos explicitos sempre
- Interfaces para contratos publicos

### Prisma
- Migrations para mudancas
- Upsert para prevenir duplicatas
- createMany para bulk
- $queryRaw com template literals (NUNCA $queryRawUnsafe)
- NUNCA queries N+1

### BullMQ
- maxRetriesPerRequest: null (obrigatorio)
- Concorrencia: 3-10
- Rate limiting sempre
- Event listeners: completed, failed, error
- Retry com backoff exponencial

### PostgreSQL + pg_trgm
- Indices GIN para FTS
- WHERE campo % 'termo' ORDER BY similarity()
- NUNCA LIKE '%termo%'

---

## TDD - CICLO

```
1. RED: Escrever teste (FALHA)
2. GREEN: Implementar minimo (PASSA)
3. REFACTOR: Melhorar (continua PASSANDO)
```

---

## NOMENCLATURA

- Arquivos: kebab-case.ts
- Interfaces/Types: PascalCase
- Variaveis/funcoes: camelCase
- Constantes: UPPER_SNAKE_CASE

---

## ANTI-PATTERNS (NUNCA)

- Implementar sem TDD
- Usar emojis
- Comentar obviedades
- Mockar tudo
- Usar any
- Queries N+1
- Loops com await (use Promise.all)
- console.log em producao
- SQL injection ($queryRawUnsafe)

---

## CHECKLIST PRE-COMMIT

- [ ] TDD seguido
- [ ] npx tsc --noEmit (sem erros)
- [ ] npm test (passando)
- [ ] Coverage > 80%
- [ ] Sem console.log
- [ ] Sem any
- [ ] Sem emojis
- [ ] Comentarios minimos

---

## FLUXO PARA AGENTES

1. Ler prompt.md e FASE_X_COMPLETE.md
2. Explorar estrutura (list_dir, file_search)
3. TDD RED: escrever testes (falham)
4. TDD GREEN: implementar (passam)
5. TDD REFACTOR: melhorar
6. Validar: tsc, npm test, coverage
7. Documentar

---

## REFERENCIAS

- TypeScript: https://www.typescriptlang.org/docs/
- Prisma: https://www.prisma.io/docs/guides/performance-and-optimization
- BullMQ: https://docs.bullmq.io/
- pg_trgm: https://www.postgresql.org/docs/current/pgtrgm.html
