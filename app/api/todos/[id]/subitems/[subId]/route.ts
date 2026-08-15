import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; subId: string }> }) {
  const { subId } = await params;
  const body = await req.json();
  const sub = await prisma.todoSubItem.update({ where: { id: subId }, data: body });
  return NextResponse.json(sub);
}
