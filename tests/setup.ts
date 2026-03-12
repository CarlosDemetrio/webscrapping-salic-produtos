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

// Teardown global - fechar conexões após todos os testes
afterAll(async () => {
  // Fechar conexão do Prisma se existir
  try {
    const { default: prisma } = await import('../src/config/database');
    await prisma.$disconnect();
  } catch (error) {
    // Ignorar erros se o prisma não foi importado
  }

  // Aguardar um pouco para garantir que tudo foi limpo
  await new Promise(resolve => setTimeout(resolve, 500));
});
