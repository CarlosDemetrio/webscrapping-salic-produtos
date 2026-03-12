import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

prisma.$connect().catch((_err) => {
  process.exit(1);
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
