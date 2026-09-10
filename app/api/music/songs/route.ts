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
  const { title, genre, key, artist, notes } = await req.json();
  try {
    const song = await prisma.song.create({
      data: {
        title: title.trim(),
        genre,
        key: key || null,
        artist: artist?.trim() || null,
        notes: notes?.trim() || null,
      },
      include: { ratings: true },
    });
    return NextResponse.json(song);
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'duplicate' }, { status: 409 });
    }
    throw e;
  }
}

export async function PATCH(req: Request) {
  const { id, ...patch } = await req.json();
  const cleaned: Record<string, unknown> = {};
  if ('title' in patch) cleaned.title = String(patch.title).trim();
  if ('artist' in patch) cleaned.artist = patch.artist?.trim() || null;
  if ('key' in patch) cleaned.key = patch.key || null;
  if ('notes' in patch) cleaned.notes = patch.notes?.trim() || null;
  try {
    const song = await prisma.song.update({
      where: { id },
      data: cleaned,
      include: { ratings: true },
    });
    return NextResponse.json(song);
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'duplicate' }, { status: 409 });
    }
    throw e;
  }
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });
  await prisma.song.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
