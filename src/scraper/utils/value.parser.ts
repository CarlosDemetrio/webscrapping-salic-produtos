/**
 * Utilitário para parsing de valores
 * Princípio: Single Responsibility - apenas parsing de valores
 */

/**
 * Limpa e converte string de valor monetário para número
 * @param txt - String com valor monetário
 * @returns Número parseado ou 0 se inválido
 */
export function limparValor(txt: string | null | undefined): number {
  if (!txt || txt.includes('&nbsp;')) {
    return 0;
  }

  const valorLimpo = txt.replace(/[^0-9,]/g, '').replace(',', '.');
  return parseFloat(valorLimpo) || 0;
}

/**
 * Limpa nome de arquivo removendo caracteres inválidos
 * @param nome - Nome original
 * @returns Nome sanitizado
 */
export function sanitizarNomeArquivo(nome: string): string {
  return nome.replace(/[/\\?%*:|"<>]/g, '-');
}
