import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const person = searchParams.get('person') ?? 'mel';
    const days = parseInt(searchParams.get('days') ?? '7');
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const events = await prisma.healthEvent.findMany({
      where: { person, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
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
    const { person, text, type, tag } = await req.json();
    const event = await prisma.healthEvent.create({
      data: { person, text, type, tag },
    });
    return NextResponse.json(event);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[health events POST]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
