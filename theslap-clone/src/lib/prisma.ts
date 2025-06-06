// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-unused-vars
var prisma: PrismaClient | undefined;
}

export const prisma =
global.prisma ||
new PrismaClient({
    // log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : [],
});

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export default prisma;