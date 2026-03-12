/**
 * Gerenciador de arquivos
 * Princípio: Single Responsibility - apenas operações de arquivo
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { ItemExtraido } from '../types/scraper.types';
import { sanitizarNomeArquivo } from './value.parser';

export class FileManager {
  /**
   * Cria diretório se não existir
   */
  async criarDiretorio(caminho: string): Promise<void> {
    try {
      await fs.mkdir(caminho, { recursive: true });
    } catch (error) {
      // Diretório já existe, ignora erro
    }
  }

  /**
   * Verifica se arquivo já existe
   */
  async arquivoExiste(caminho: string): Promise<boolean> {
    try {
      await fs.access(caminho);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gera nome de arquivo para um produto
   */
  gerarNomeArquivo(produtoId: string, produtoNome: string, pastaDestino: string): string {
    const nomeLimpo = sanitizarNomeArquivo(produtoNome);
    return path.join(pastaDestino, `Produto_${produtoId}_${nomeLimpo}.json`);
  }

  /**
   * Salva dados em arquivo JSON
   */
  async salvarJSON(caminho: string, dados: ItemExtraido[]): Promise<void> {
    await fs.writeFile(caminho, JSON.stringify(dados, null, 2), 'utf-8');
  }
}
