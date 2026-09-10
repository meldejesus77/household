import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const songs = await prisma.song.findMany({
    include: { ratings: true },
    orderBy: [{ genre: 'asc' }, { key: 'asc' }, { title: 'asc' }],
  });
  return NextResponse.json(songs);
}

export async function POST(req: Request) {
  const { title, genre, key, tag, artist, notes } = await req.json();
  const song = await prisma.song.create({
    data: {
      title: title.trim(),
      genre,
      key: key || null,
      tag: tag || 'duo',
      artist: artist || null,
      notes: notes || null,
    },
    include: { ratings: true },
  });
  return NextResponse.json(song);
}

export async function PATCH(req: Request) {
  const { id, ...patch } = await req.json();
  const song = await prisma.song.update({
    where: { id },
    data: patch,
    include: { ratings: true },
  });
  return NextResponse.json(song);
}
