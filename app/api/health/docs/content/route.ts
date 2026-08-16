import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const person = searchParams.get('person') ?? 'mel';
    const file = searchParams.get('file') ?? '';
    if (!file || file.includes('..')) return NextResponse.json({ error: 'invalid' }, { status: 400 });
    const filePath = path.join(process.cwd(), 'public', 'health', person, file);
    if (!fs.existsSync(filePath)) return NextResponse.json({ error: 'not found' }, { status: 404 });
    const content = fs.readFileSync(filePath, 'utf-8');
    return NextResponse.json({ content });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
