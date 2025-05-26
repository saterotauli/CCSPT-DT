import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Intenta acceder directamente al modelo
    const edificis = await prisma.$queryRaw`SELECT * FROM "patrimoni"."edificis"`;
    console.log('Edificis:', edificis);
  } catch (error) {
    console.error('Error al consultar edificis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();