import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/packing/templates  → { shared, mel, kathy } (nulls where missing)
export async function GET() {
  try {
    const rows = await prisma.packingTemplate.findMany({
      where: { id: { in: ['shared', 'mel', 'kathy'] } },
    });
    const byId: Record<string, unknown> = { shared: null, mel: null, kathy: null };
    for (const r of rows) byId[r.id] = r.data;
    return NextResponse.json(byId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[packing templates GET]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PUT /api/packing/templates  body: { id: "shared"|"mel"|"kathy", data: {...} }
export async function PUT(req: Request) {
  try {
    const { id, data } = await req.json();
    if (id !== 'shared' && id !== 'mel' && id !== 'kathy') {
      return NextResponse.json({ error: 'invalid template id' }, { status: 400 });
    }
    const row = await prisma.packingTemplate.upsert({
      where: { id },
      update: { data },
      create: { id, data },
    });
    return NextResponse.json(row);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[packing templates PUT]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
