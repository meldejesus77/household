import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: Promise<{ profile: string }> }) {
  const { profile } = await params;
  const row = await prisma.budgetSnapshot.findUnique({ where: { id: profile } });
  return NextResponse.json(row?.data ?? null);
}

export async function PUT(req: Request, { params }: { params: Promise<{ profile: string }> }) {
  const { profile } = await params;
  const data = await req.json();
  const row = await prisma.budgetSnapshot.upsert({
    where: { id: profile },
    update: { data },
    create: { id: profile, data },
  });
  return NextResponse.json(row.data);
}
