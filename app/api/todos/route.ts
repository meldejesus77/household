import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const todos = await prisma.todo.findMany({
    include: { subItems: true },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(todos);
}

export async function POST(req: Request) {
  const { text, tag, subItems = [] } = await req.json();
  const todo = await prisma.todo.create({
    data: {
      text,
      tag,
      subItems: { create: subItems.map((s: { text: string }) => ({ text: s.text })) },
    },
    include: { subItems: true },
  });
  return NextResponse.json(todo);
}
