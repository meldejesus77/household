import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/music/sessions  → all ended sessions (for history view)
export async function GET() {
  const sessions = await prisma.practiceSession.findMany({
    where: { endedAt: { not: null } },
    orderBy: { startedAt: 'desc' },
    include: { songs: { include: { song: true } } },
  });
  return NextResponse.json(sessions);
}

// POST /api/music/sessions  { user }
// Creates a new open session for the user. If one exists already (shouldn't
// happen because UI checks first), returns the existing one instead of erroring.
export async function POST(req: Request) {
  const { user } = await req.json();
  if (!user) return NextResponse.json({ error: 'user required' }, { status: 400 });

  const existing = await prisma.practiceSession.findFirst({
    where: { user, endedAt: null },
    include: { songs: { include: { song: true } } },
  });
  if (existing) return NextResponse.json(existing);

  const session = await prisma.practiceSession.create({
    data: { user },
    include: { songs: { include: { song: true } } },
  });
  return NextResponse.json(session);
}

// PATCH /api/music/sessions  { id, action: "end" | "reopen" }
export async function PATCH(req: Request) {
  const { id, action } = await req.json();
  if (!id || !action) return NextResponse.json({ error: 'id and action required' }, { status: 400 });

  const data = action === 'end' ? { endedAt: new Date() } : { endedAt: null };
  const session = await prisma.practiceSession.update({
    where: { id },
    data,
    include: { songs: { include: { song: true } } },
  });
  return NextResponse.json(session);
}
