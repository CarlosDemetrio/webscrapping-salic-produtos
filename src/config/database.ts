import { PrismaClient } from '@prisma/client';

// Singleton do Prisma Client
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Teste de conexão
prisma.$connect()
  .then(() => {
    console.log(' PostgreSQL conectado via Prisma');
  })
  .catch((err) => {
    console.error(' Erro ao conectar no PostgreSQL:', err);
    process.exit(1);
  });

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
