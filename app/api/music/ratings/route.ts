import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(req: Request) {
  const { songId, user, rating } = await req.json();
  const row = await prisma.songRating.upsert({
    where: { songId_user: { songId, user } },
    update: { rating },
    create: { songId, user, rating },
  });
  return NextResponse.json(row);
}
