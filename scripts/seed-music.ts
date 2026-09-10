/**
 * Seed oldtime songs from Obsidian Jon-*.md files.
 * Run: `npx tsx scripts/seed-music.ts` from household/.
 *
 * Parses each file line-by-line. Ignores markdown headers, bold labels,
 * <u>-wrapped sub-sections, key-name lines, and other structural noise.
 * Splits on em dash (—) to extract artist.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();

const OBSIDIAN_DIR =
  '/Users/meldejesus/Library/Mobile Documents/iCloud~md~obsidian/Documents/Music/Oldtime';

const FILES: Array<{ file: string; key: string }> = [
  { file: 'Jon-A.md',         key: 'A' },
  { file: 'Jon-C-calico.md',  key: 'C' },
  { file: 'Jon-D.md',         key: 'D' },
  { file: 'Jon-G.md',         key: 'G' },
];

// Lines that look like section headers or key labels, not song titles.
const SKIP_PATTERNS = [
  /^$/,                                      // blank
  /^#/,                                      // markdown heading (#oldtime, #keyD, # Mark ...)
  /^\*\*.+\*\*:?\s*$/,                       // **Kathy** / **Kathy:**
  /^<u>.*<\/u>\s*$/,                         // <u>**Other?**</u>
  /^<u>\*\*.*\*\*<\/u>\s*$/,                 // just in case
  /^(Key of |key of )/i,                     // "Key of C", "Key of D"
  /^[A-G]$/,                                 // single-letter key rows
  /^[A-G] modal$/i,                          // "A modal"
  /^(Crooked|Straight|Straight:|Modal):?$/i, // section words
  /^\s*[A-G]\s+[a-z]{1,3}\s*$/i,             // "G d " or "Gcd..."
];

function isJunk(line: string): boolean {
  return SKIP_PATTERNS.some(p => p.test(line));
}

function stripListMarker(line: string): string {
  return line
    .replace(/^\s*[-*+]\s+/, '')       // "- foo" / "* foo"
    .replace(/^\s*\d+\.\s+/, '');      // "1. foo"
}

function stripTrailingNotes(line: string): string {
  // Drop trailing "(learning)", "(A - SM)", trailing "?", etc.
  return line
    .replace(/\s*\(.*?\)\s*$/g, '')
    .replace(/\s*\?+\s*$/, '')
    .trim();
}

function parseLine(raw: string): { title: string; artist: string | null } | null {
  const trimmed = raw.trim();
  if (isJunk(trimmed)) return null;

  const stripped = stripTrailingNotes(stripListMarker(trimmed));
  if (!stripped || stripped.length < 3) return null;
  if (isJunk(stripped)) return null;

  // Split on em dash for artist. Fall back to trimming if hyphen only, but
  // hyphens are too ambiguous (used inline in structure), so we only split on —.
  const parts = stripped.split(/\s+—\s+/);
  const title = parts[0].trim();
  const artist = parts[1]?.trim() || null;

  if (!title || title.length < 3) return null;
  // One more junk check on the cleaned title
  if (isJunk(title)) return null;

  return { title, artist };
}

async function main() {
  let created = 0;
  let skipped = 0;

  for (const { file, key } of FILES) {
    const full = path.join(OBSIDIAN_DIR, file);
    if (!fs.existsSync(full)) {
      console.warn(`Missing file: ${full}`);
      continue;
    }
    const contents = fs.readFileSync(full, 'utf8');
    const lines = contents.split(/\r?\n/);
    console.log(`\n${file} (key=${key}) — ${lines.length} lines`);

    for (const line of lines) {
      const parsed = parseLine(line);
      if (!parsed) continue;

      try {
        await prisma.song.create({
          data: {
            title: parsed.title,
            genre: 'oldtime',
            key,
            artist: parsed.artist,
          },
        });
        created++;
      } catch (e: unknown) {
        // Unique-constraint duplicate — silently skip. Log anything else.
        const err = e as { code?: string; message?: string };
        if (err.code === 'P2002') {
          skipped++;
        } else {
          console.error(`  ! ${parsed.title}: ${err.message ?? e}`);
        }
      }
    }
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped} duplicates.`);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
