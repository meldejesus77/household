import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/music/sessions/[id]/songs  { songId }
// Adds a song to the session (a "check"). Idempotent — upsert on (sessionId, songId).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { songId } = await req.json();

  const row = await prisma.sessionSong.upsert({
    where: { sessionId_songId: { sessionId: id, songId } },
    update: {},
    create: { sessionId: id, songId },
    include: { song: true },
  });
  return NextResponse.json(row);
}

// DELETE /api/music/sessions/[id]/songs?songId=xxx  (an "uncheck")
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const songId = searchParams.get('songId');
  if (!songId) return NextResponse.json({ error: 'songId required' }, { status: 400 });

  await prisma.sessionSong.deleteMany({
    where: { sessionId: id, songId },
  });
  return NextResponse.json({ ok: true });
}
