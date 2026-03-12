export interface ItemOrcamentarioDTO {
  produto: string;
  item: string;
  unidade: string;
  uf: string;
  cidade: string;
  valor_minimo: number;
  valor_medio: number;
  valor_maximo: number;
  caminho_referencia?: string;
}

export interface ItemExtraidoScraper {
  produto: string;
  item: string;
  unidade: string;
  uf: string;
  cidade: string;
  minimo: number;
  medio: number;
  maximo: number;
}
