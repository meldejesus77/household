import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/packing/trips  → list all trips (metadata only)
export async function GET() {
  try {
    const trips = await prisma.packingTrip.findMany({
      orderBy: { tripDate: 'desc' },
      select: { id: true, name: true, tripDate: true, camping: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json(trips);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[packing trips GET]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/packing/trips  body: { name, tripDate, camping }
export async function POST(req: Request) {
  try {
    const { name, tripDate, camping } = await req.json();
    if (!name?.trim() || !tripDate) {
      return NextResponse.json({ error: 'name and tripDate required' }, { status: 400 });
    }
    const trip = await prisma.packingTrip.create({
      data: {
        name: name.trim(),
        tripDate: new Date(tripDate),
        camping: !!camping,
        state: {},
      },
    });
    return NextResponse.json(trip);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[packing trips POST]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
