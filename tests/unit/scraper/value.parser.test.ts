/**
 * Testes unitários para ValueParser
 * Testa o comportamento de parsing baseado no script original
 */

import { limparValor, sanitizarNomeArquivo } from '../../../src/scraper/utils/value.parser';

describe('ValueParser', () => {
  describe('limparValor', () => {
    it('deve converter string de valor monetário em número', () => {
      expect(limparValor('R$ 1.500,50')).toBe(1500.50);
      expect(limparValor('R$ 100,00')).toBe(100.00);
      expect(limparValor('15.250,75')).toBe(15250.75);
    });

    it('deve retornar 0 para valores inválidos', () => {
      expect(limparValor('&nbsp;')).toBe(0);
      expect(limparValor('')).toBe(0);
      expect(limparValor(null)).toBe(0);
      expect(limparValor(undefined)).toBe(0);
    });

    it('deve lidar com valores sem centavos', () => {
      expect(limparValor('R$ 1.500')).toBe(1500);
      expect(limparValor('1500')).toBe(1500);
    });

    it('deve lidar com valores zerados', () => {
      expect(limparValor('R$ 0,00')).toBe(0);
      expect(limparValor('0')).toBe(0);
    });

    it('deve remover todos os caracteres não numéricos exceto vírgula', () => {
      expect(limparValor('R$ 1.234.567,89')).toBe(1234567.89);
      expect(limparValor('ABC 999,99 DEF')).toBe(999.99);
    });

    it('deve converter vírgula em ponto decimal', () => {
      expect(limparValor('123,45')).toBe(123.45);
      expect(limparValor('1,5')).toBe(1.5);
    });

    it('deve replicar comportamento do script original', () => {
      // Comportamento exato do script original:
      // if (!txt || txt.includes('&nbsp;')) return 0;
      // return parseFloat(txt.replace(/[^0-9,]/g, '').replace(',', '.'));

      const testCases = [
        { input: 'R$ 150,00', expected: 150.00 },
        { input: '&nbsp;', expected: 0 },
        { input: 'Valor: R$ 1.200,50', expected: 1200.50 },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(limparValor(input)).toBe(expected);
      });
    });
  });

  describe('sanitizarNomeArquivo', () => {
    it('deve remover caracteres inválidos para nomes de arquivo', () => {
      expect(sanitizarNomeArquivo('Produto/Teste')).toBe('Produto-Teste');
      expect(sanitizarNomeArquivo('Nome\\Arquivo')).toBe('Nome-Arquivo');
      expect(sanitizarNomeArquivo('Arquivo?')).toBe('Arquivo-');
      expect(sanitizarNomeArquivo('Test%File')).toBe('Test-File');
    });

    it('deve substituir todos os caracteres inválidos por hífen', () => {
      const caracteresInvalidos = ['/','\\','?','%','*',':','|','"','<','>'];
      caracteresInvalidos.forEach(char => {
        expect(sanitizarNomeArquivo(`Teste${char}Nome`)).toBe('Teste-Nome');
      });
    });

    it('deve manter caracteres válidos', () => {
      expect(sanitizarNomeArquivo('Produto ABC 123')).toBe('Produto ABC 123');
      expect(sanitizarNomeArquivo('Nome-Válido')).toBe('Nome-Válido');
    });

    it('deve replicar comportamento do script original', () => {
      // Comportamento exato: produto.nome.replace(/[/\\?%*:|"<>]/g, '-')
      const nome = 'Aplicativo/Cultural\\AUDIOVISUAL:Teste';
      expect(sanitizarNomeArquivo(nome)).toBe('Aplicativo-Cultural-AUDIOVISUAL-Teste');
    });
  });
});
