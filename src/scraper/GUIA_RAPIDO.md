# 🎯 Guia Rápido - Sistema de Scraping SALIC Refatorado

## ✅ O que foi feito?

Seu script original foi **completamente refatorado** seguindo **SOLID** e **boas práticas de arquitetura de software**.

### 📊 Comparação: Antes vs Depois

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Arquivos** | 1 arquivo monolítico | 13 arquivos organizados |
| **Linhas de código** | ~150 linhas | ~800 linhas (com docs) |
| **Responsabilidades** | Tudo misturado | Separado por camadas |
| **Manutenção** | Difícil localizar bugs | Cada classe tem 1 função |
| **Testabilidade** | Impossível testar isoladamente | 100% testável |
| **Escalabilidade** | Hardcoded | Configurável via env vars |
| **Reusabilidade** | Código acoplado | Componentes reutilizáveis |

## 🏗️ Arquitetura

```
src/scraper/
├── 📄 index.ts                    # Ponto de entrada
├── 📄 run.ts                      # Script de inicialização
├── 📄 examples.ts                 # Exemplos de uso
│
├── 📁 types/                      # 🎯 Tipos TypeScript
│   └── scraper.types.ts
│
├── 📁 config/                     # ⚙️ Configurações
│   └── scraper.config.ts
│
├── 📁 data/                       # 💾 Dados
│   └── produtos.data.ts
│
├── 📁 utils/                      # 🔧 Utilitários
│   ├── value.parser.ts            # Parsing de valores
│   └── file.manager.ts            # Gerenciamento de arquivos
│
├── 📁 services/                   # 🚀 Serviços
│   ├── browser.service.ts         # Gerencia navegador
│   ├── page.scraper.service.ts    # Scraping de páginas
│   └── produto.scraper.service.ts # Scraping de produtos
│
├── 📁 queue/                      # 📋 Fila
│   └── produto.queue.ts           # Gerencia fila de produtos
│
├── 📁 workers/                    # 👷 Workers
│   └── scraper.worker.ts          # Worker individual
│
└── 📁 orchestrator/               # 🎼 Orquestração
    └── cluster.orchestrator.ts    # Coordena workers
```

## 🚀 Como Usar

### 1. Instalação (já feito)

```bash
npm install selenium-webdriver cheerio @types/selenium-webdriver
```

### 2. Configuração

Copie o arquivo de exemplo:
```bash
cp .env.scraper.example .env
```

Edite `.env`:
```bash
MAX_WORKERS=3  # Mac: 3-5, Servidor OCI: 10
```

### 3. Adicionar Produtos

Edite `src/scraper/data/produtos.data.ts`:

```typescript
export const PRODUTOS: ProdutoParaScraping[] = [
  { id: '154', nome: 'Aplicativo Cultural - AUDIOVISUAL' },
  { id: '51', nome: 'Apresentação Musical' },
  // Adicione mais produtos aqui...
];
```

### 4. Executar

```bash
# Desenvolvimento (com hot-reload)
npm run dev:scraper

# Execução única
npm run scraper

# Build e execução em produção
npm run scraper:build
```

## 🎯 Princípios SOLID Aplicados

### 1. **Single Responsibility Principle (SRP)** ✅
Cada classe tem UMA responsabilidade:
- `BrowserService`: apenas gerencia navegador
- `FileManager`: apenas gerencia arquivos
- `PageScraperService`: apenas extrai dados de páginas
- `ProdutoQueue`: apenas gerencia fila

### 2. **Open/Closed Principle (OCP)** ✅
Fácil estender sem modificar código existente:
- Quer mudar estratégia de parsing? Crie novo parser
- Quer adicionar novo tipo de scraper? Implemente interface
- Quer mudar persistência? Substitua FileManager

### 3. **Liskov Substitution Principle (LSP)** ✅
Interfaces bem definidas podem ser substituídas:
```typescript
// Pode criar implementações alternativas
class DatabaseFileManager extends FileManager { ... }
class S3FileManager extends FileManager { ... }
```

### 4. **Interface Segregation Principle (ISP)** ✅
Tipos específicos sem dependências extras:
- `ProdutoParaScraping`: apenas id e nome
- `ItemExtraido`: apenas dados extraídos
- `WorkerConfig`: apenas configurações do worker

### 5. **Dependency Inversion Principle (DIP)** ✅
Dependências de abstrações:
```typescript
// ClusterOrchestrator depende de ProdutoQueue (abstração)
// não de array de produtos (implementação)
constructor(
  private readonly config: ScraperConfig,
  private readonly produtoQueue: ProdutoQueue  // ✅ abstração
) {}
```

## 📋 Fluxo de Execução

```
1. index.ts (main)
   ↓
2. ClusterOrchestrator.iniciar()
   ↓
3. Cria N workers em paralelo
   ↓
4. Cada Worker:
   - BrowserService.criarNavegador()
   - Loop: ProdutoQueue.proximoProduto()
     - ProdutoScraperService.scrapeProduto()
       - PageScraperService (operações na página)
     - FileManager.salvarJSON()
   - BrowserService.fecharNavegador()
   ↓
5. Todos concluem → FIM
```

## 🔑 Componentes Principais

### 1. ClusterOrchestrator (Maestro)
- Coordena múltiplos workers
- Controla inicialização
- Aguarda conclusão

### 2. ScraperWorker (Trabalhador)
- Gerencia um navegador
- Processa produtos da fila
- Implementa retry automático

### 3. ProdutoScraperService (Scraper de Produto)
- Orquestra scraping de um produto
- Coordena PageScraperService
- Trata erros por item

### 4. PageScraperService (Scraper de Página)
- Operações de baixo nível na página
- Seleção de elementos
- Extração de dados

### 5. BrowserService (Gerente de Navegador)
- Cria navegadores configurados
- Fecha navegadores com segurança

### 6. FileManager (Gerente de Arquivos)
- Cria diretórios
- Verifica existência
- Salva JSON

### 7. ProdutoQueue (Fila)
- Gerencia fila compartilhada
- Thread-safe
- Suporte a retry

## 🎨 Benefícios da Refatoração

### ✅ Manutenibilidade
- Fácil encontrar e corrigir bugs
- Cada componente é pequeno e focado
- Código autodocumentado

### ✅ Testabilidade
- Cada serviço pode ser testado isoladamente
- Fácil criar mocks e stubs
- Testes unitários por camada

### ✅ Escalabilidade
- Configuração flexível de workers
- Fácil trocar implementações
- Suporte a diferentes ambientes

### ✅ Reusabilidade
- Serviços podem ser usados em outros contextos
- FileManager útil para outros scrapers
- BrowserService reutilizável

## 📚 Documentação Adicional

- `README.md`: Documentação completa
- `ARCHITECTURE.md`: Diagramas e arquitetura
- `examples.ts`: Exemplos de uso

## 🧪 Próximos Passos Sugeridos

1. **Testes**: Adicionar testes unitários e integração
2. **Logging**: Integrar Winston ou Pino
3. **Métricas**: Adicionar Prometheus
4. **Database**: Integrar com Prisma (já tem no projeto)
5. **BullMQ**: Integrar com sistema de filas existente
6. **Docker**: Criar imagem Docker para scraping

## 🎉 Resultado

Você agora tem um sistema **profissional**, **escalável** e **manutenível** que:

✅ Segue SOLID
✅ Separa responsabilidades
✅ É testável
✅ É configurável
✅ É escalável
✅ Mantém a lógica original intacta

## 💡 Dicas de Uso

### Desenvolvimento Local (Mac)
```bash
MAX_WORKERS=3 npm run scraper
```

### Servidor Potente (OCI)
```bash
MAX_WORKERS=10 npm run scraper
```

### Debug de Um Produto
Edite `produtos.data.ts` e deixe apenas 1 produto, depois:
```bash
npm run dev:scraper
```

## 🤝 Suporte

Se precisar adicionar funcionalidades ou fazer modificações, a arquitetura facilita:

- **Novo tipo de scraper?** → Crie novo service
- **Nova forma de persistência?** → Crie novo manager
- **Nova estratégia de fila?** → Substitua ProdutoQueue
- **Novos produtos?** → Edite `produtos.data.ts`

---

**Divirta-se com seu novo sistema de scraping! 🚀**
