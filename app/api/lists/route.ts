import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const row = await prisma.listsState.findUnique({ where: { id: 'family' } });
    return NextResponse.json(row?.data ?? null);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[lists GET]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const data = await req.json();
    const row = await prisma.listsState.upsert({
      where: { id: 'family' },
      update: { data },
      create: { id: 'family', data },
    });
    return NextResponse.json(row.data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[lists PUT]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
