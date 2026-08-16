import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

// Pass the URL explicitly so Prisma doesn't look it up via schema env validation.
// process.env.DATABASE_URL is inlined by Next.js/webpack at build time (from next.config env),
// which ensures it's available inside Amplify Lambda containers even when the runtime
// environment doesn't carry the variable.
const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
export default prisma;
