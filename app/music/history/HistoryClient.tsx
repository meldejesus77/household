'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

// ── Types ──────────────────────────────────────────────────────────────────
type User = 'kathy' | 'mel' | 'jo' | 'duo';
type Bucket = 'week' | 'month' | 'quarter';

interface Song {
  id: string;
  title: string;
  genre: string;
  key: string | null;
  tag: string;
  artist: string | null;
}
interface SessionSong {
  id: string;
  songId: string;
  playedAt: string;
  song?: Song;
}
interface PracticeSession {
  id: string;
  user: User;
  startedAt: string;
  endedAt: string | null;
  songs: SessionSong[];
}

const USERS: User[] = ['kathy', 'mel', 'jo', 'duo'];
const USER_COLORS: Record<User, string> = {
  kathy: '#d946ef', mel: '#0ea5e9', jo: '#f59e0b', duo: '#10b981',
};

// ── Helpers ────────────────────────────────────────────────────────────────
function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0=Sun
  x.setDate(x.getDate() - day);
  return x;
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1);
}
function bucketStart(d: Date, bucket: Bucket): Date {
  return bucket === 'week' ? startOfWeek(d)
       : bucket === 'month' ? startOfMonth(d)
       : startOfQuarter(d);
}
function bucketLabel(d: Date, bucket: Bucket): string {
  if (bucket === 'week') {
    const end = new Date(d); end.setDate(end.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `Week of ${d.toLocaleDateString('en-US', opts)}`;
  }
  if (bucket === 'month') {
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return '';
  const mins = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000);
  if (mins < 60) return `${mins} min`;
  return `${Math.round(mins / 60 * 10) / 10}h`;
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = `
  *, *::before, *::after { box-sizing: border-box; }
  .h-root { min-height: 100vh; background: #f7f7f8; color: #1a1a1a;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
  .h-header { position: sticky; top: 0; z-index: 20; background: #1a1a1a; color: #fff;
    padding: 10px 14px; display: flex; align-items: center; gap: 12px;
    padding-right: 44px; }
  .h-header a { color: #ccc; text-decoration: none; font-size: 0.85rem; }
  .h-header a:hover { color: #fff; }
  .h-header .title { font-weight: 600; font-size: 1rem; margin-left: auto; }

  .h-content { max-width: 900px; margin: 0 auto; padding: 12px 12px 80px; }

  .h-controls { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;
    padding: 10px; background: #fff; border-radius: 8px; border: 1px solid #e5e5e5; }
  .h-group { display: flex; gap: 4px; align-items: center; }
  .h-label { font-size: 0.72rem; color: #999; text-transform: uppercase;
    letter-spacing: 0.05em; margin-right: 4px; }
  .h-pill { padding: 5px 12px; border-radius: 999px; border: 1px solid #ddd;
    background: #fff; color: #666; font-size: 0.8rem; cursor: pointer; min-height: 32px; }
  .h-pill.active { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }
  .h-pill.user { border: 2px solid; }
  .h-pill.user.active { color: #fff; }

  .bucket { margin-bottom: 24px; }
  .bucket-title { font-weight: 600; font-size: 1.05rem; margin-bottom: 10px;
    color: #1a1a1a; padding-bottom: 6px; border-bottom: 2px solid #e5e5e5; }
  .bucket-stats { font-size: 0.8rem; color: #888; margin-left: 8px; font-weight: 400; }

  .session-card { background: #fff; border: 1px solid #e5e5e5; border-radius: 8px;
    padding: 12px 14px; margin-bottom: 8px; }
  .session-head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px;
    flex-wrap: wrap; }
  .session-user { padding: 2px 10px; border-radius: 999px; font-size: 0.75rem;
    font-weight: 600; color: #fff; text-transform: capitalize; }
  .session-date { font-size: 0.85rem; color: #555; }
  .session-dur { font-size: 0.75rem; color: #999; margin-left: auto; }
  .session-songs { font-size: 0.85rem; color: #666; }
  .song-chip { display: inline-block; background: #f3f4f6; border-radius: 4px;
    padding: 2px 8px; margin: 2px 4px 2px 0; font-size: 0.78rem; }

  .empty { text-align: center; color: #999; padding: 40px 20px; font-size: 0.9rem; }
`;

// ── Component ──────────────────────────────────────────────────────────────
export default function HistoryClient() {
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [bucket, setBucket] = useState<Bucket>('week');
  const [userFilter, setUserFilter] = useState<User | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/music/sessions');
      setSessions(await res.json());
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(
    () => userFilter ? sessions.filter(s => s.user === userFilter) : sessions,
    [sessions, userFilter],
  );

  // Group by bucket
  const grouped = useMemo(() => {
    const map = new Map<number, { start: Date; sessions: PracticeSession[] }>();
    filtered.forEach(s => {
      const b = bucketStart(new Date(s.startedAt), bucket);
      const key = b.getTime();
      if (!map.has(key)) map.set(key, { start: b, sessions: [] });
      map.get(key)!.sessions.push(s);
    });
    return Array.from(map.values()).sort((a, b) => b.start.getTime() - a.start.getTime());
  }, [filtered, bucket]);

  return (
    <div className="h-root">
      <style>{styles}</style>

      <header className="h-header">
        <Link href="/music">← Music</Link>
        <div className="title">📊 History</div>
      </header>

      <main className="h-content">
        <div className="h-controls">
          <div className="h-group">
            <span className="h-label">Bucket</span>
            {(['week', 'month', 'quarter'] as Bucket[]).map(b => (
              <button
                key={b}
                className={`h-pill ${bucket === b ? 'active' : ''}`}
                onClick={() => setBucket(b)}
              >
                {b === 'week' ? 'Week' : b === 'month' ? 'Month' : '3 Month'}
              </button>
            ))}
          </div>
          <div className="h-group">
            <span className="h-label">User</span>
            <button
              className={`h-pill ${!userFilter ? 'active' : ''}`}
              onClick={() => setUserFilter(null)}
            >
              All
            </button>
            {USERS.map(u => (
              <button
                key={u}
                className={`h-pill user ${userFilter === u ? 'active' : ''}`}
                style={{
                  borderColor: USER_COLORS[u],
                  background: userFilter === u ? USER_COLORS[u] : undefined,
                }}
                onClick={() => setUserFilter(u)}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="empty">Loading…</div>
        ) : grouped.length === 0 ? (
          <div className="empty">No practice sessions yet.</div>
        ) : (
          grouped.map(({ start, sessions }) => {
            const totalSongs = sessions.reduce((n, s) => n + s.songs.length, 0);
            return (
              <div key={start.getTime()} className="bucket">
                <div className="bucket-title">
                  {bucketLabel(start, bucket)}
                  <span className="bucket-stats">
                    · {sessions.length} session{sessions.length === 1 ? '' : 's'}
                    · {totalSongs} song{totalSongs === 1 ? '' : 's'}
                  </span>
                </div>
                {sessions.map(s => (
                  <div key={s.id} className="session-card">
                    <div className="session-head">
                      <span className="session-user" style={{ background: USER_COLORS[s.user] }}>
                        {s.user}
                      </span>
                      <span className="session-date">{fmtDate(s.startedAt)}</span>
                      <span className="session-dur">{fmtDuration(s.startedAt, s.endedAt)}</span>
                    </div>
                    <div className="session-songs">
                      {s.songs.length === 0
                        ? <em style={{ color: '#bbb' }}>no songs checked</em>
                        : s.songs.map(ss => (
                            <span key={ss.id} className="song-chip">
                              {ss.song?.title ?? '—'}
                              {ss.song?.key ? ` · ${ss.song.key}` : ''}
                            </span>
                          ))
                      }
                    </div>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
