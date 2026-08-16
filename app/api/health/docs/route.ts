import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const person = searchParams.get('person') ?? 'mel';
    const dir = path.join(process.cwd(), 'public', 'health', person);
    if (!fs.existsSync(dir)) return NextResponse.json([]);
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort();
    return NextResponse.json(files);
  } catch (e) {
    return NextResponse.json([]);
  }
}
