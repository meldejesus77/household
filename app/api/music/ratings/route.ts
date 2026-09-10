import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(req: Request) {
  const { songId, user, rating } = await req.json();

  // rating === 'unknown' means the song is not on this user's list.
  // Delete the row so the DB stores only real list members.
  if (rating === 'unknown') {
    await prisma.songRating.deleteMany({
      where: { songId, user },
    });
    return NextResponse.json({ songId, user, rating: 'unknown', removed: true });
  }

  const row = await prisma.songRating.upsert({
    where: { songId_user: { songId, user } },
    update: { rating },
    create: { songId, user, rating },
  });
  return NextResponse.json(row);
}
