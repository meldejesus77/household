/**
 * Reset all SongRating rows (empty start for every user).
 * Run: `npx tsx scripts/reset-ratings.ts` from household/.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const { count } = await prisma.songRating.deleteMany({});
  console.log(`Deleted ${count} rating rows.`);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
