/**
 * Ingest Obsidian all-tunes.md (TSV of the full oldtime library).
 *
 * Two outputs:
 *   1. Backfill: for every DB Song without an artist (and optionally without
 *      a key), look up by normalized title in all-tunes.md and fill in.
 *   2. public/music/artists.json: deduped, sorted list of unique artist names
 *      for the Add-song artist autocomplete.
 *
 * Run: `npx tsx scripts/ingest-all-tunes.ts` from household/.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();

const SOURCE =
  '/Users/meldejesus/Library/Mobile Documents/iCloud~md~obsidian/Documents/Music/Oldtime/all-tunes.md';

const ARTISTS_OUT = path.join(process.cwd(), 'public', 'music', 'artists.json');

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// Extract a canonical single-letter key from raw column values like "A", "A & E",
// "A Modal", "D & A", "C & G". Returns null if empty or unrecognized.
function parseKey(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const m = t.match(/^([A-G])(b|#)?/i);
  return m ? m[1].toUpperCase() : null;
}

interface Row {
  title: string;
  artist: string | null;
  key: string | null;
}

function parseAllTunes(): Row[] {
  const contents = fs.readFileSync(SOURCE, 'utf8');
  const lines = contents.split(/\r?\n/);
  const rows: Row[] = [];
  // First line is a header ("Title\tArtist\tBand\tKey\tTuning").
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const parts = line.split('\t');
    const title = parts[0]?.trim();
    if (!title) continue;
    const artist = parts[1]?.trim() || null;
    // parts[2] is Band, parts[3] is Key, parts[4] is Tuning
    const key = parseKey(parts[3] ?? '');
    rows.push({ title, artist, key });
  }
  return rows;
}

// Build a title-normalized index. Multiple rows can share the same title —
// pick the first one that has an artist (preferring "richer" data).
function buildIndex(rows: Row[]): Map<string, Row> {
  const idx = new Map<string, Row>();
  for (const r of rows) {
    const key = normalize(r.title);
    const existing = idx.get(key);
    if (!existing) {
      idx.set(key, r);
    } else if (!existing.artist && r.artist) {
      idx.set(key, r); // upgrade to one with an artist
    } else if (existing.artist && !existing.key && r.key) {
      // fill in missing key from a same-title row
      idx.set(key, { ...existing, key: r.key });
    }
  }
  return idx;
}

async function backfill(idx: Map<string, Row>) {
  const songs = await prisma.song.findMany({
    where: { genre: 'oldtime' },
    select: { id: true, title: true, artist: true, key: true },
  });

  let filledArtist = 0;
  let filledKey = 0;
  let missed = 0;

  for (const s of songs) {
    const hit = idx.get(normalize(s.title));
    if (!hit) { missed++; continue; }

    const patch: { artist?: string; key?: string } = {};
    if (!s.artist && hit.artist) patch.artist = hit.artist;
    if (!s.key && hit.key)       patch.key = hit.key;
    if (Object.keys(patch).length === 0) continue;

    await prisma.song.update({ where: { id: s.id }, data: patch });
    if (patch.artist) filledArtist++;
    if (patch.key)    filledKey++;
  }

  console.log(`Backfill: +${filledArtist} artists, +${filledKey} keys, ${missed} titles not found in library.`);
}

function writeArtists(rows: Row[]) {
  const artists = new Set<string>();
  for (const r of rows) {
    if (r.artist) artists.add(r.artist);
  }
  const sorted = Array.from(artists).sort((a, b) => a.localeCompare(b));

  fs.mkdirSync(path.dirname(ARTISTS_OUT), { recursive: true });
  fs.writeFileSync(ARTISTS_OUT, JSON.stringify(sorted));
  const bytes = fs.statSync(ARTISTS_OUT).size;
  console.log(`Artists: wrote ${sorted.length} unique names to ${ARTISTS_OUT} (${(bytes / 1024).toFixed(1)} KB)`);
}

async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`Missing source: ${SOURCE}`);
    process.exit(1);
  }
  const rows = parseAllTunes();
  console.log(`Parsed ${rows.length} rows from all-tunes.md`);

  const idx = buildIndex(rows);
  console.log(`Built index of ${idx.size} unique titles`);

  await backfill(idx);
  writeArtists(rows);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
