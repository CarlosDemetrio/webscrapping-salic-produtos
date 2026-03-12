/**
 * Testes unitários para FileManager
 * Testa operações de arquivo baseadas no script original
 */

import { FileManager } from '../../../src/scraper/utils/file.manager';
import { ItemExtraido } from '../../../src/scraper/types/scraper.types';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('FileManager', () => {
  const fileManager = new FileManager();
  const testDir = './test-temp-scraper';
  const testFile = path.join(testDir, 'test-produto.json');

  beforeAll(async () => {
    // Limpa diretório de teste antes dos testes
    try {
      await fs.rm(testDir, { recursive: true });
    } catch (error) {
      // Ignora se não existir
    }
  });

  afterAll(async () => {
    // Limpa diretório de teste após os testes
    try {
      await fs.rm(testDir, { recursive: true });
    } catch (error) {
      // Ignora erros de limpeza
    }
  });

  describe('criarDiretorio', () => {
    it('deve criar diretório que não existe', async () => {
      await fileManager.criarDiretorio(testDir);

      const stats = await fs.stat(testDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('deve ignorar se diretório já existe', async () => {
      await fileManager.criarDiretorio(testDir);

      // Não deve lançar erro ao tentar criar novamente
      await expect(fileManager.criarDiretorio(testDir)).resolves.not.toThrow();
    });

    it('deve criar diretórios aninhados', async () => {
      const nestedDir = path.join(testDir, 'nivel1', 'nivel2');
      await fileManager.criarDiretorio(nestedDir);

      const stats = await fs.stat(nestedDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('deve replicar comportamento do script original (criarPasta)', async () => {
      // Script original:
      // async function criarPasta() {
      //   try { await fs.mkdir(PASTA_DESTINO); } catch (e) {}
      // }

      const novoDir = path.join(testDir, 'original-behavior');
      await fileManager.criarDiretorio(novoDir);

      expect(await fileManager.arquivoExiste(novoDir)).toBe(true);
    });
  });

  describe('arquivoExiste', () => {
    it('deve retornar true para arquivo existente', async () => {
      await fileManager.criarDiretorio(testDir);
      await fs.writeFile(testFile, 'test');

      const existe = await fileManager.arquivoExiste(testFile);
      expect(existe).toBe(true);
    });

    it('deve retornar false para arquivo inexistente', async () => {
      const existe = await fileManager.arquivoExiste(path.join(testDir, 'nao-existe.json'));
      expect(existe).toBe(false);
    });

    it('deve replicar comportamento do script original para pular arquivo', async () => {
      // Script original:
      // try {
      //   await fs.access(nomeArquivo);
      //   console.log('Pulando produto (Já extraído)');
      //   continue;
      // } catch (e) {}

      await fileManager.criarDiretorio(testDir);
      const arquivoTeste = path.join(testDir, 'produto-extraido.json');

      // Primeira vez: não existe
      expect(await fileManager.arquivoExiste(arquivoTeste)).toBe(false);

      // Cria arquivo
      await fs.writeFile(arquivoTeste, '[]');

      // Segunda vez: existe (deve pular)
      expect(await fileManager.arquivoExiste(arquivoTeste)).toBe(true);
    });
  });

  describe('gerarNomeArquivo', () => {
    it('deve gerar nome de arquivo correto', () => {
      const nome = fileManager.gerarNomeArquivo(
        '154',
        'Aplicativo Cultural - AUDIOVISUAL',
        testDir
      );

      expect(nome).toBe(path.join(testDir, 'Produto_154_Aplicativo Cultural - AUDIOVISUAL.json'));
    });

    it('deve sanitizar caracteres inválidos no nome', () => {
      const nome = fileManager.gerarNomeArquivo(
        '51',
        'Produto/Com\\Caracteres:Inválidos',
        testDir
      );

      // Pega apenas o nome do arquivo (sem o caminho do diretório)
      const nomeArquivo = path.basename(nome);

      expect(nomeArquivo).toContain('Produto-Com-Caracteres-Inválidos');
      expect(nomeArquivo).not.toContain('/');
      expect(nomeArquivo).not.toContain('\\');
      expect(nomeArquivo).not.toContain(':');
    });

    it('deve incluir ID do produto', () => {
      const nome = fileManager.gerarNomeArquivo('999', 'Teste', testDir);
      expect(nome).toContain('Produto_999_');
    });

    it('deve ter extensão .json', () => {
      const nome = fileManager.gerarNomeArquivo('1', 'Teste', testDir);
      expect(nome).toMatch(/\.json$/);
    });

    it('deve replicar comportamento do script original', () => {
      // Script original:
      // const nomeLimpo = produto.nome.replace(/[/\\?%*:|"<>]/g, '-');
      // const nomeArquivo = path.join(PASTA_DESTINO, `Produto_${produto.id}_${nomeLimpo}.json`);

      const nome = fileManager.gerarNomeArquivo(
        '154',
        'Aplicativo Cultural - AUDIOVISUAL',
        './extracao_salicneet-teste'
      );

      expect(nome).toBe(
        path.join('./extracao_salicneet-teste', 'Produto_154_Aplicativo Cultural - AUDIOVISUAL.json')
      );
    });
  });

  describe('salvarJSON', () => {
    const dadosMock: ItemExtraido[] = [
      {
        produto: 'Produto Teste',
        item: 'Item 1',
        unidade: 'UN',
        uf: 'SP',
        cidade: 'São Paulo',
        minimo: 100,
        medio: 150,
        maximo: 200,
      },
      {
        produto: 'Produto Teste',
        item: 'Item 2',
        unidade: 'KG',
        uf: 'RJ',
        cidade: 'Rio de Janeiro',
        minimo: 50,
        medio: 75,
        maximo: 100,
      },
    ];

    beforeEach(async () => {
      await fileManager.criarDiretorio(testDir);
    });

    it('deve salvar dados em arquivo JSON', async () => {
      const arquivo = path.join(testDir, 'teste-salvar.json');
      await fileManager.salvarJSON(arquivo, dadosMock);

      const conteudo = await fs.readFile(arquivo, 'utf-8');
      const dados = JSON.parse(conteudo);

      expect(dados).toHaveLength(2);
      expect(dados[0].produto).toBe('Produto Teste');
    });

    it('deve formatar JSON com indentação', async () => {
      const arquivo = path.join(testDir, 'teste-formatado.json');
      await fileManager.salvarJSON(arquivo, dadosMock);

      const conteudo = await fs.readFile(arquivo, 'utf-8');

      // JSON formatado deve ter quebras de linha
      expect(conteudo).toContain('\n');
      expect(conteudo).toContain('  '); // 2 espaços de indentação
    });

    it('deve sobrescrever arquivo existente', async () => {
      const arquivo = path.join(testDir, 'teste-sobrescrever.json');

      // Salva primeira vez
      await fileManager.salvarJSON(arquivo, [dadosMock[0]]);
      let conteudo = await fs.readFile(arquivo, 'utf-8');
      expect(JSON.parse(conteudo)).toHaveLength(1);

      // Salva novamente com mais dados
      await fileManager.salvarJSON(arquivo, dadosMock);
      conteudo = await fs.readFile(arquivo, 'utf-8');
      expect(JSON.parse(conteudo)).toHaveLength(2);
    });

    it('deve salvar array vazio', async () => {
      const arquivo = path.join(testDir, 'teste-vazio.json');
      await fileManager.salvarJSON(arquivo, []);

      const conteudo = await fs.readFile(arquivo, 'utf-8');
      expect(JSON.parse(conteudo)).toEqual([]);
    });

    it('deve replicar comportamento do script original', async () => {
      // Script original:
      // await fs.writeFile(nomeArquivo, JSON.stringify(dadosDoProduto, null, 2));
      // console.log(`💾 Salvo: ${produto.nome} (${dadosDoProduto.length} registros)`);

      const arquivo = path.join(testDir, 'comportamento-original.json');
      await fileManager.salvarJSON(arquivo, dadosMock);

      const conteudo = await fs.readFile(arquivo, 'utf-8');
      const dados = JSON.parse(conteudo);

      expect(dados).toHaveLength(dadosMock.length);
      expect(conteudo).toBe(JSON.stringify(dadosMock, null, 2));
    });

    it('deve preservar estrutura completa dos dados', async () => {
      const arquivo = path.join(testDir, 'teste-estrutura.json');
      await fileManager.salvarJSON(arquivo, dadosMock);

      const conteudo = await fs.readFile(arquivo, 'utf-8');
      const dados = JSON.parse(conteudo) as ItemExtraido[];

      // Verifica todos os campos
      expect(dados[0]).toHaveProperty('produto');
      expect(dados[0]).toHaveProperty('item');
      expect(dados[0]).toHaveProperty('unidade');
      expect(dados[0]).toHaveProperty('uf');
      expect(dados[0]).toHaveProperty('cidade');
      expect(dados[0]).toHaveProperty('minimo');
      expect(dados[0]).toHaveProperty('medio');
      expect(dados[0]).toHaveProperty('maximo');

      expect(dados[0].minimo).toBe(100);
      expect(dados[0].medio).toBe(150);
      expect(dados[0].maximo).toBe(200);
    });
  });

  describe('Integração com fluxo completo', () => {
    it('deve simular fluxo completo do script original', async () => {
      // Script original:
      // 1. Cria pasta
      // 2. Verifica se arquivo existe
      // 3. Se não existe, faz scraping
      // 4. Salva arquivo JSON

      const produtoId = '154';
      const produtoNome = 'Aplicativo Cultural - AUDIOVISUAL';

      // 1. Cria pasta
      await fileManager.criarDiretorio(testDir);

      // 2. Gera nome do arquivo
      const nomeArquivo = fileManager.gerarNomeArquivo(produtoId, produtoNome, testDir);

      // 3. Verifica se existe (primeira execução)
      const existePrimeira = await fileManager.arquivoExiste(nomeArquivo);
      expect(existePrimeira).toBe(false);

      // 4. Salva dados (simula scraping)
      const dados: ItemExtraido[] = [
        {
          produto: produtoNome,
          item: 'Item Teste',
          unidade: 'UN',
          uf: 'SP',
          cidade: 'São Paulo',
          minimo: 10,
          medio: 15,
          maximo: 20,
        },
      ];
      await fileManager.salvarJSON(nomeArquivo, dados);

      // 5. Verifica se existe (segunda execução - deve pular)
      const existeSegunda = await fileManager.arquivoExiste(nomeArquivo);
      expect(existeSegunda).toBe(true);

      // 6. Verifica conteúdo salvo
      const conteudo = await fs.readFile(nomeArquivo, 'utf-8');
      const dadosSalvos = JSON.parse(conteudo);
      expect(dadosSalvos).toHaveLength(1);
      expect(dadosSalvos[0].produto).toBe(produtoNome);
    });
  });
});
