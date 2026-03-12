# Sistema de Scraping SALIC - Arquitetura Refatorada

## 📋 Visão Geral

Sistema de scraping refatorado seguindo princípios SOLID, com separação clara de responsabilidades e arquitetura modular.

## 🏗️ Arquitetura

### Princípios SOLID Aplicados

1. **Single Responsibility Principle (SRP)**
   - Cada classe/módulo tem uma única responsabilidade
   - Separação clara entre configuração, lógica de negócio e infraestrutura

2. **Open/Closed Principle (OCP)**
   - Extensível sem modificar código existente
   - Fácil adicionar novos scrapers ou estratégias

3. **Liskov Substitution Principle (LSP)**
   - Interfaces bem definidas
   - Componentes substituíveis

4. **Interface Segregation Principle (ISP)**
   - Tipos específicos para cada domínio
   - Sem dependências desnecessárias

5. **Dependency Inversion Principle (DIP)**
   - Dependência de abstrações (tipos/interfaces)
   - Inversão de controle através do orquestrador

## 📁 Estrutura de Diretórios

```
src/scraper/
├── index.ts                          # Ponto de entrada principal
├── types/
│   └── scraper.types.ts             # Definições de tipos e interfaces
├── config/
│   └── scraper.config.ts            # Configurações centralizadas
├── data/
│   └── produtos.data.ts             # Dados dos produtos
├── utils/
│   ├── value.parser.ts              # Parsing de valores
│   └── file.manager.ts              # Gerenciamento de arquivos
├── services/
│   ├── browser.service.ts           # Gerenciamento do navegador
│   ├── page.scraper.service.ts      # Scraping de páginas
│   └── produto.scraper.service.ts   # Scraping de produtos
├── queue/
│   └── produto.queue.ts             # Gerenciamento da fila
├── workers/
│   └── scraper.worker.ts            # Worker individual
└── orchestrator/
    └── cluster.orchestrator.ts      # Orquestração de workers
```

## 🔧 Componentes

### 1. **Types** (`types/scraper.types.ts`)
Define todas as interfaces e tipos do sistema:
- `ProdutoParaScraping`: Dados de um produto
- `ItemExtraido`: Dados extraídos
- `WorkerConfig`: Configuração do worker
- `ScraperConfig`: Configuração global

### 2. **Config** (`config/scraper.config.ts`)
Configurações centralizadas:
- URL base do sistema SALIC
- Diretório de saída
- Número de workers
- Configurações do Chrome/Selenium

### 3. **Data** (`data/produtos.data.ts`)
Lista de produtos a serem extraídos (fácil manutenção).

### 4. **Utils**

#### `value.parser.ts`
- `limparValor()`: Converte strings monetárias em números
- `sanitizarNomeArquivo()`: Remove caracteres inválidos

#### `file.manager.ts`
- `criarDiretorio()`: Cria diretórios
- `arquivoExiste()`: Verifica existência
- `gerarNomeArquivo()`: Gera nomes padronizados
- `salvarJSON()`: Persiste dados

### 5. **Services**

#### `browser.service.ts`
Responsável por:
- Criar e configurar instâncias do navegador
- Fechar navegadores de forma segura

#### `page.scraper.service.ts`
Responsável por:
- Navegação na página
- Seleção de produtos e itens
- Extração de dados da grid
- Reset de páginas

#### `produto.scraper.service.ts`
Orquestra o scraping completo de um produto:
- Coordena `PageScraperService`
- Trata erros de itens individuais
- Retorna dados consolidados

### 6. **Queue** (`queue/produto.queue.ts`)
Gerencia a fila de produtos:
- Thread-safe para acesso concorrente
- Suporte a retry (devolver produto)
- Métodos de consulta (tamanho, listar)

### 7. **Workers** (`workers/scraper.worker.ts`)
Worker individual:
- Gerencia um navegador
- Processa produtos da fila compartilhada
- Implementa retry em caso de erro
- Fecha recursos adequadamente

### 8. **Orchestrator** (`orchestrator/cluster.orchestrator.ts`)
Maestro do sistema:
- Inicia múltiplos workers
- Controla delay entre inicializações
- Aguarda conclusão de todos
- Gerencia ciclo de vida

## 🚀 Como Usar

### Instalação

```bash
npm install
```

### Configuração

Ajuste as configurações em `src/scraper/config/scraper.config.ts`:

```typescript
export const SCRAPER_CONFIG: ScraperConfig = {
  maxWorkers: 3, // ou use MAX_WORKERS env var
  // ... outras configs
};
```

### Adicionar Produtos

Edite `src/scraper/data/produtos.data.ts`:

```typescript
export const PRODUTOS: ProdutoParaScraping[] = [
  { id: '154', nome: 'Aplicativo Cultural - AUDIOVISUAL' },
  // Adicione mais produtos aqui
];
```

### Executar

```bash
# Desenvolvimento
npm run dev:scraper

# Build e execução
npm run build
node dist/scraper/index.js
```

### Variáveis de Ambiente

```bash
MAX_WORKERS=5  # Número de navegadores simultâneos
```

## 🎯 Vantagens da Arquitetura

### Manutenibilidade
- Cada componente tem responsabilidade única
- Fácil localizar e corrigir bugs
- Código autodocumentado

### Testabilidade
- Componentes isolados
- Fácil criar mocks
- Testes unitários por camada

### Escalabilidade
- Fácil adicionar novos scrapers
- Suporte a diferentes estratégias
- Configuração flexível de workers

### Reusabilidade
- Componentes independentes
- Serviços reutilizáveis
- Lógica desacoplada

## 🔄 Fluxo de Execução

```
index.ts (main)
    ↓
ClusterOrchestrator
    ↓
Cria N × ScraperWorker (paralelo)
    ↓
Cada Worker:
    - Cria BrowserService
    - Cria ProdutoScraperService
    - Loop: pega produto da ProdutoQueue
        - PageScraperService extrai dados
        - FileManager salva resultado
    - Fecha navegador
    ↓
Todos concluem
```

## 📊 Exemplo de Saída

```
🎻 Iniciando Maestro com 3 Workers Simultâneos...

[Worker 1] 🚀 Iniciando: Aplicativo Cultural (Restam 5 na fila)
[Worker 2] 🚀 Iniciando: Apresentação Musical (Restam 4 na fila)
[Worker 3] 🚀 Iniciando: Banco de Dados (Restam 3 na fila)

[Worker 1] 💾 Salvo: Aplicativo Cultural (127 registros)
[Worker 1] 🚀 Iniciando: Bem Imóvel (Restam 2 na fila)

🏁 TODOS OS PRODUTOS FORAM EXTRAÍDOS COM SUCESSO!
```

## 🧪 Testes

Para adicionar testes:

```bash
# Criar testes unitários para cada serviço
tests/unit/scraper/
  ├── value.parser.test.ts
  ├── file.manager.test.ts
  ├── produto.queue.test.ts
  └── ...
```

## 🔒 Segurança

- Headers personalizados para evitar detecção
- User-agent realista
- Delays entre requisições
- Retry automático em falhas

## 📝 Próximos Passos

1. Adicionar logging estruturado (Winston/Pino)
2. Implementar métricas (Prometheus)
3. Adicionar testes unitários
4. Integrar com sistema de filas (BullMQ)
5. Adicionar persistência em banco de dados
6. Dashboard de monitoramento

## 🤝 Contribuindo

1. Mantenha a separação de responsabilidades
2. Siga os princípios SOLID
3. Adicione testes para novas funcionalidades
4. Documente mudanças significativas
