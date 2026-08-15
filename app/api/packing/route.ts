import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const row = await prisma.packingState.findUnique({ where: { id: 'family' } });
  return NextResponse.json(row?.data ?? null);
}

export async function PUT(req: Request) {
  const data = await req.json();
  const row = await prisma.packingState.upsert({
    where: { id: 'family' },
    update: { data },
    create: { id: 'family', data },
  });
  return NextResponse.json(row.data);
}
