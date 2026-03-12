// Setup global para testes
import 'dotenv/config';

// Configurar timeout global
jest.setTimeout(30000);

// Mock de console para testes mais limpos (opcional)
global.console = {
  ...console,
  // Descomente para silenciar logs durante testes
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
};
