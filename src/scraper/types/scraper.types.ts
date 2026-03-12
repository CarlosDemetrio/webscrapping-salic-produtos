/**
 * Tipos e interfaces para o sistema de scraping
 */

export interface ProdutoParaScraping {
  id: string;
  nome: string;
}

export interface ItemExtraido {
  produto: string;
  item: string;
  unidade: string;
  uf: string;
  cidade: string;
  minimo: number;
  medio: number;
  maximo: number;
}

export interface ItemSelectOption {
  val: string;
  txt: string;
}

export interface WorkerConfig {
  workerId: number;
  maxRetries: number;
  timeoutMs: number;
}

export interface ScraperConfig {
  baseUrl: string;
  outputDir: string;
  maxWorkers: number;
  workerStartDelay: number;
}
