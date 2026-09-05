import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const person = searchParams.get('person') ?? 'mel';
    const days = parseInt(searchParams.get('days') ?? '7');
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const events = await prisma.healthEvent.findMany({
      where: { person, occurredAt: { gte: since } },
      orderBy: { occurredAt: 'desc' },
    });
    return NextResponse.json(events);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[health events GET]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { person, text, type, tag, data, occurredAt } = await req.json();
    const event = await prisma.healthEvent.create({
      data: {
        person,
        text,
        type,
        tag,
        data: data ?? undefined,
        occurredAt: occurredAt ? new Date(occurredAt) : undefined,
      },
    });
    return NextResponse.json(event);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[health events POST]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/health/events?id=<id>            → delete one event
// DELETE /api/health/events?person=<p>&all=1   → delete all events for person
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const person = searchParams.get('person');
    const all = searchParams.get('all');

    if (id) {
      await prisma.healthEvent.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }
    if (person && all === '1') {
      const result = await prisma.healthEvent.deleteMany({ where: { person } });
      return NextResponse.json({ ok: true, count: result.count });
    }
    return NextResponse.json({ error: 'Missing id or (person + all=1)' }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[health events DELETE]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
