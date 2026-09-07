import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const trip = await prisma.packingTrip.findUnique({ where: { id } });
    if (!trip) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json(trip);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[packing trip GET]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PUT /api/packing/trips/[id]  body: { name?, tripDate?, camping?, state? }
export async function PUT(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (typeof body.name === 'string') data.name = body.name.trim();
    if (body.tripDate) data.tripDate = new Date(body.tripDate);
    if (typeof body.camping === 'boolean') data.camping = body.camping;
    if (body.state && typeof body.state === 'object') data.state = body.state;
    const trip = await prisma.packingTrip.update({ where: { id }, data });
    return NextResponse.json(trip);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[packing trip PUT]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await prisma.packingTrip.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[packing trip DELETE]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
