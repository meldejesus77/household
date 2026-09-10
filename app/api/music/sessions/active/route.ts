import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const STALE_MS = 6 * 60 * 60 * 1000; // 6h
const REOPEN_MS = 30 * 60 * 1000;    // 30 min

// GET /api/music/sessions/active?user=mel
// Returns { active: PracticeSession | null, reopenable: PracticeSession | null }
// - active: the current open session (if any). Auto-finalizes sessions older than 6h.
// - reopenable: the most recently ended session (within 30 min) that can be reopened.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const user = searchParams.get('user');
  if (!user) return NextResponse.json({ error: 'user required' }, { status: 400 });

  // Fetch any open session
  let active = await prisma.practiceSession.findFirst({
    where: { user, endedAt: null },
    orderBy: { startedAt: 'desc' },
    include: { songs: { include: { song: true } } },
  });

  // Auto-finalize stale
  if (active && Date.now() - active.startedAt.getTime() > STALE_MS) {
    const lastPlayed = active.songs.at(-1)?.playedAt ?? active.startedAt;
    await prisma.practiceSession.update({
      where: { id: active.id },
      data: { endedAt: lastPlayed },
    });
    active = null;
  }

  // If no active, look for a recently-ended session that could be reopened
  let reopenable = null;
  if (!active) {
    const cutoff = new Date(Date.now() - REOPEN_MS);
    reopenable = await prisma.practiceSession.findFirst({
      where: { user, endedAt: { gte: cutoff, not: null } },
      orderBy: { endedAt: 'desc' },
      include: { songs: { include: { song: true } } },
    });
  }

  return NextResponse.json({ active, reopenable });
}
