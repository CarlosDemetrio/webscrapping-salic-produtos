# Diagrama de Arquitetura - Sistema de Scraping

## Diagrama de Classes (Simplificado)

```
┌─────────────────────────────────────────────────────────────────┐
│                         index.ts (Main)                          │
│                    - iniciarScraping()                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ClusterOrchestrator                           │
│  - config: ScraperConfig                                         │
│  - produtoQueue: ProdutoQueue                                    │
│  - fileManager: FileManager                                      │
│  ────────────────────────────────────────────────────────────   │
│  + iniciar(): Promise<void>                                      │
│  - criarEIniciarWorker(id): Promise<void>                        │
└────────────┬────────────────────────────────────────────────────┘
             │ cria N instâncias
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       ScraperWorker                              │
│  - config: WorkerConfig                                          │
│  - browserService: BrowserService                                │
│  - fileManager: FileManager                                      │
│  - produtoQueue: ProdutoQueue                                    │
│  - driver: WebDriver                                             │
│  ────────────────────────────────────────────────────────────   │
│  + iniciar(): Promise<void>                                      │
│  - processarProduto(produto): Promise<void>                      │
└────────┬────────────────────────┬───────────────────────────────┘
         │                        │
         │ usa                    │ usa
         ▼                        ▼
┌──────────────────────┐  ┌─────────────────────────────────────┐
│   BrowserService     │  │   ProdutoScraperService             │
│  ──────────────────  │  │  - driver: WebDriver                │
│  + criarNavegador()  │  │  - pageScraperService: PageScraper  │
│  + fecharNavegador() │  │  ─────────────────────────────────  │
└──────────────────────┘  │  + scrapeProduto(): ItemExtraido[]  │
                          └─────────┬───────────────────────────┘
                                    │ usa
                                    ▼
                          ┌─────────────────────────────────────┐
                          │   PageScraperService                │
                          │  - driver: WebDriver                │
                          │  ─────────────────────────────────  │
                          │  + navegarParaBase()                │
                          │  + selecionarProduto()              │
                          │  + aguardarCarregamentoItens()      │
                          │  + obterItensDisponiveis()          │
                          │  + selecionarESubmeterItem()        │
                          │  + extrairDadosGrid()               │
                          │  + resetarPaginaComProduto()        │
                          └─────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      Componentes Auxiliares                      │
├─────────────────────────────────────────────────────────────────┤
│  ProdutoQueue              │  FileManager                        │
│  - fila: Produto[]         │  + criarDiretorio()                │
│  + temProdutos()           │  + arquivoExiste()                 │
│  + proximoProduto()        │  + gerarNomeArquivo()              │
│  + devolverProduto()       │  + salvarJSON()                    │
│  + tamanho()               │                                    │
├────────────────────────────┴────────────────────────────────────┤
│  ValueParser (Utils)                                            │
│  + limparValor(txt): number                                     │
│  + sanitizarNomeArquivo(nome): string                           │
└─────────────────────────────────────────────────────────────────┘
```

## Fluxo de Dados

```
PRODUTOS (data)
    ↓
ProdutoQueue ←──────────────┐
    ↓                       │
    │                       │ retry
    └→ Worker 1 ────────────┤
    └→ Worker 2 ────────────┤
    └→ Worker N ────────────┘
         ↓
    [BrowserService]
         ↓
    [ProdutoScraperService]
         ↓
    [PageScraperService]
         ↓
    [ItemExtraido[]]
         ↓
    [FileManager]
         ↓
    arquivo.json
```

## Camadas da Aplicação

```
┌─────────────────────────────────────────────────────────┐
│              CAMADA DE ORQUESTRAÇÃO                      │
│         (ClusterOrchestrator, index.ts)                  │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│              CAMADA DE WORKERS                           │
│              (ScraperWorker)                             │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│              CAMADA DE SERVIÇOS                          │
│   (BrowserService, ProdutoScraperService,                │
│    PageScraperService)                                   │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│              CAMADA DE UTILIDADES                        │
│   (FileManager, ValueParser, ProdutoQueue)               │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│         CAMADA DE INFRAESTRUTURA                         │
│   (Selenium WebDriver, File System, Cheerio)             │
└─────────────────────────────────────────────────────────┘
```

## Responsabilidades por Camada

### 1. Orquestração
- **Responsabilidade**: Coordenar todo o processo
- **Componentes**: `ClusterOrchestrator`, `index.ts`
- **Decisões**: Quantos workers, quando iniciar, quando terminar

### 2. Workers
- **Responsabilidade**: Executar scraping em paralelo
- **Componentes**: `ScraperWorker`
- **Decisões**: Qual produto processar, quando fazer retry

### 3. Serviços
- **Responsabilidade**: Lógica de negócio do scraping
- **Componentes**: `BrowserService`, `ProdutoScraperService`, `PageScraperService`
- **Decisões**: Como navegar, como extrair dados, como lidar com erros

### 4. Utilidades
- **Responsabilidade**: Operações auxiliares
- **Componentes**: `FileManager`, `ValueParser`, `ProdutoQueue`
- **Decisões**: Como persistir, como parsear, como gerenciar fila

### 5. Infraestrutura
- **Responsabilidade**: Interação com sistemas externos
- **Componentes**: Selenium, File System, Cheerio
- **Decisões**: (Delegadas às bibliotecas externas)
