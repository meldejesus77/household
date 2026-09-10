'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

// ── Types ──────────────────────────────────────────────────────────────────
type User = 'kathy' | 'mel' | 'jo' | 'duo';
type Genre = 'oldtime' | 'bluegrass' | 'jazz' | 'blues';
type Rating = 'unknown' | 'learning' | 'known';
type Tag = 'duo' | 'kathy' | 'mel' | 'jo';
type RatingView = 'practice' | 'all' | 'new';

interface SongRating {
  id: string;
  songId: string;
  user: User;
  rating: Rating;
}

interface Song {
  id: string;
  title: string;
  genre: Genre;
  key: string | null;
  tag: Tag;
  artist: string | null;
  notes: string | null;
  ratings: SongRating[];
}

interface SessionSong {
  id: string;
  sessionId: string;
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

// ── Constants ──────────────────────────────────────────────────────────────
const USERS: { value: User; label: string; color: string }[] = [
  { value: 'kathy', label: 'Kathy', color: '#d946ef' },
  { value: 'mel',   label: 'Mel',   color: '#0ea5e9' },
  { value: 'jo',    label: 'Jo',    color: '#f59e0b' },
  { value: 'duo',   label: 'Duo',   color: '#10b981' },
];

const GENRES: { value: Genre; label: string }[] = [
  { value: 'oldtime',   label: 'Oldtime' },
  { value: 'bluegrass', label: 'Bluegrass' },
  { value: 'jazz',      label: 'Jazz' },
  { value: 'blues',     label: 'Blues' },
];

const TAGS: Tag[] = ['duo', 'kathy', 'mel', 'jo'];
const RATINGS: Rating[] = ['unknown', 'learning', 'known'];
const RATING_ORDER: Record<Rating, number> = { unknown: 0, learning: 1, known: 2 };
const RATING_MARK: Record<Rating, string> = { unknown: '·', learning: '◐', known: '●' };

const LS_USER = 'music_current_user';
const LS_RATING_VIEW = 'music_rating_view';

// ── Helpers ────────────────────────────────────────────────────────────────
function getUserRating(song: Song, user: User): Rating {
  return song.ratings.find(r => r.user === user)?.rating ?? 'unknown';
}

function nextRating(r: Rating): Rating {
  return RATINGS[(RATINGS.indexOf(r) + 1) % RATINGS.length];
}

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = `
  *, *::before, *::after { box-sizing: border-box; }

  .music-root {
    min-height: 100vh;
    background: #f7f7f8;
    color: #1a1a1a;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  }

  /* Sticky top bar */
  .music-header {
    position: sticky; top: 0; z-index: 20;
    background: #1a1a1a; color: #fff;
    padding: 10px 14px 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  .music-header-top {
    display: flex; align-items: center; gap: 12px; margin-bottom: 10px;
    padding-right: 44px; /* room for hamburger */
  }
  .home-link { color: #ccc; text-decoration: none; font-size: 0.85rem; }
  .home-link:hover { color: #fff; }
  .header-title { font-weight: 600; font-size: 1rem; margin-left: auto; }
  .history-link {
    color: #ccc; text-decoration: none; font-size: 0.85rem;
    padding: 4px 10px; border-radius: 6px; background: rgba(255,255,255,0.08);
  }
  .history-link:hover { background: rgba(255,255,255,0.15); color: #fff; }

  /* User picker (4 pills) */
  .user-picker { display: flex; gap: 6px; flex-wrap: wrap; }
  .user-btn {
    flex: 1 1 60px;
    padding: 8px 12px; border-radius: 8px;
    border: 2px solid transparent; background: rgba(255,255,255,0.08);
    color: #ddd; font-size: 0.85rem; font-weight: 500;
    cursor: pointer; transition: all 0.15s;
    min-height: 40px;
  }
  .user-btn:hover { background: rgba(255,255,255,0.14); }
  .user-btn.active { background: var(--user-color); color: #fff; border-color: rgba(255,255,255,0.2); }

  /* Session banner */
  .session-banner {
    background: #fef3c7; border: 1px solid #fcd34d;
    padding: 12px 14px; margin: 12px; border-radius: 10px;
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  }
  .session-banner.active { background: #d1fae5; border-color: #6ee7b7; }
  .session-banner-text { flex: 1; min-width: 200px; font-size: 0.9rem; }
  .session-banner-btn {
    padding: 6px 14px; border-radius: 6px; border: none; cursor: pointer;
    font-size: 0.85rem; font-weight: 500;
  }
  .session-banner-btn.primary { background: #1a1a1a; color: #fff; }
  .session-banner-btn.secondary { background: transparent; color: #555; }
  .session-banner-btn.danger { background: #fee2e2; color: #991b1b; }

  /* Content */
  .music-content { max-width: 900px; margin: 0 auto; padding: 12px 12px 80px; }

  /* Genre tabs */
  .genre-tabs {
    display: flex; gap: 4px; overflow-x: auto; margin-bottom: 12px;
    -webkit-overflow-scrolling: touch;
  }
  .genre-tab {
    padding: 8px 14px; border-radius: 8px 8px 0 0;
    border: none; background: transparent; color: #666;
    font-size: 0.88rem; cursor: pointer; white-space: nowrap;
    border-bottom: 3px solid transparent;
  }
  .genre-tab.active { color: #1a1a1a; font-weight: 600; border-bottom-color: #1a1a1a; background: #fff; }

  /* Filter bar */
  .filter-bar {
    display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;
    padding: 10px; background: #fff; border-radius: 8px;
    border: 1px solid #e5e5e5;
  }
  .filter-group { display: flex; gap: 4px; align-items: center; }
  .filter-label { font-size: 0.72rem; color: #999; text-transform: uppercase; letter-spacing: 0.05em; margin-right: 4px; }
  .pill {
    padding: 5px 12px; border-radius: 999px; border: 1px solid #ddd;
    background: #fff; color: #666; font-size: 0.8rem; cursor: pointer;
    min-height: 32px; display: inline-flex; align-items: center;
  }
  .pill:hover { border-color: #aaa; }
  .pill.active { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }

  /* Start / End button */
  .session-actions { margin-bottom: 12px; }
  .btn-primary {
    width: 100%; padding: 14px; border-radius: 10px;
    border: none; background: #1a1a1a; color: #fff;
    font-size: 1rem; font-weight: 600; cursor: pointer;
    min-height: 48px;
  }
  .btn-primary.danger { background: #dc2626; }
  .btn-primary:hover { opacity: 0.9; }
  @media (min-width: 640px) {
    .btn-primary { width: auto; padding: 12px 28px; }
  }

  .add-song-btn {
    padding: 8px 14px; border-radius: 8px;
    border: 1px dashed #aaa; background: transparent;
    color: #666; font-size: 0.85rem; cursor: pointer; margin-bottom: 12px;
    width: 100%;
  }
  .add-song-btn:hover { border-color: #666; color: #333; background: #fff; }
  @media (min-width: 640px) { .add-song-btn { width: auto; } }

  /* Add song form */
  .add-song-form {
    background: #fff; border: 1px solid #ddd; border-radius: 10px;
    padding: 12px; margin-bottom: 12px;
    display: grid; grid-template-columns: 1fr; gap: 8px;
  }
  @media (min-width: 640px) {
    .add-song-form { grid-template-columns: 2fr 1fr 1fr 1fr auto; }
  }
  .add-song-form input, .add-song-form select {
    padding: 8px 10px; border-radius: 6px; border: 1px solid #ddd;
    font-size: 0.9rem; min-height: 36px;
  }

  /* Song list */
  .song-list { display: flex; flex-direction: column; gap: 4px; }
  .song-row {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 12px; min-height: 52px;
    background: #fff; border: 1px solid #e5e5e5; border-radius: 8px;
    cursor: pointer; transition: border-color 0.1s;
  }
  .song-row:hover { border-color: #bbb; }
  .song-row.checked { background: #ecfdf5; border-color: #6ee7b7; }
  .song-row.disabled { opacity: 0.55; cursor: not-allowed; }

  .song-check {
    width: 22px; height: 22px; flex-shrink: 0; accent-color: #10b981;
    cursor: pointer;
  }

  .song-title-wrap { flex: 1; min-width: 0; }
  .song-title { font-size: 0.95rem; color: #1a1a1a; }
  .song-artist { font-size: 0.75rem; color: #888; margin-top: 2px; }

  .song-key {
    padding: 2px 8px; border-radius: 4px; background: #f3f4f6;
    font-size: 0.75rem; font-weight: 600; color: #555;
    min-width: 28px; text-align: center;
  }

  .song-tag {
    padding: 3px 8px; border-radius: 999px;
    font-size: 0.7rem; font-weight: 600;
    border: none; cursor: pointer;
    text-transform: capitalize;
  }

  .song-rating {
    width: 32px; height: 32px; border-radius: 50%;
    border: 2px solid #ddd; background: #fff;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; font-size: 1rem;
    color: #999;
    flex-shrink: 0;
  }
  .song-rating.learning { border-color: #f59e0b; color: #f59e0b; }
  .song-rating.known { border-color: #10b981; color: #10b981; background: #ecfdf5; }
  .song-rating:hover { transform: scale(1.05); }

  /* Empty / loading */
  .empty { text-align: center; color: #999; padding: 40px 20px; font-size: 0.9rem; }

  /* Tag colors */
  .tag-duo   { background: #d1fae5; color: #065f46; }
  .tag-kathy { background: #fce7f3; color: #9d174d; }
  .tag-mel   { background: #dbeafe; color: #1e40af; }
  .tag-jo    { background: #fef3c7; color: #92400e; }
`;

// ── Component ──────────────────────────────────────────────────────────────
export default function MusicClient() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [reopenable, setReopenable] = useState<PracticeSession | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState<User>('mel');
  const [genre, setGenre] = useState<Genre>('oldtime');
  const [keyFilter, setKeyFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<Tag | null>(null);
  const [ratingView, setRatingView] = useState<RatingView>('practice');

  const [showAddForm, setShowAddForm] = useState(false);
  const [newSong, setNewSong] = useState({
    title: '', key: '', tag: 'duo' as Tag, artist: '',
  });

  // ── Load from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem(LS_USER) as User | null;
    if (savedUser && USERS.some(u => u.value === savedUser)) setCurrentUser(savedUser);
    const savedView = localStorage.getItem(LS_RATING_VIEW) as RatingView | null;
    if (savedView && ['practice', 'all', 'new'].includes(savedView)) setRatingView(savedView);
  }, []);

  // ── Persist to localStorage on change
  useEffect(() => { localStorage.setItem(LS_USER, currentUser); }, [currentUser]);
  useEffect(() => { localStorage.setItem(LS_RATING_VIEW, ratingView); }, [ratingView]);

  // ── Load songs once
  useEffect(() => {
    (async () => {
      const res = await fetch('/api/music/songs');
      setSongs(await res.json());
      setLoading(false);
    })();
  }, []);

  // ── Load active session (and reopenable) whenever user changes
  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/music/sessions/active?user=${currentUser}`);
      const { active, reopenable } = await res.json();
      setSession(active);
      setReopenable(reopenable);
    })();
  }, [currentUser]);

  // ── Available keys for the current genre (only oldtime for now)
  const availableKeys = useMemo(() => {
    const keys = new Set<string>();
    songs.filter(s => s.genre === genre && s.key).forEach(s => keys.add(s.key!));
    return Array.from(keys).sort();
  }, [songs, genre]);

  // Reset key filter when switching to a genre that doesn't have it
  useEffect(() => {
    if (keyFilter && !availableKeys.includes(keyFilter)) setKeyFilter(null);
  }, [availableKeys, keyFilter]);

  // ── Visible songs
  const visibleSongs = useMemo(() => {
    return songs.filter(s => {
      if (s.genre !== genre) return false;
      if (keyFilter && s.key !== keyFilter) return false;
      if (tagFilter && s.tag !== tagFilter) return false;
      if (ratingView !== 'all') {
        const r = getUserRating(s, currentUser);
        if (ratingView === 'practice' && r === 'unknown') return false;
        if (ratingView === 'new' && r !== 'unknown') return false;
      }
      return true;
    }).sort((a, b) => {
      // Sort: learning first, then known, then unknown; alpha within
      const ra = getUserRating(a, currentUser);
      const rb = getUserRating(b, currentUser);
      const rd = RATING_ORDER[rb] - RATING_ORDER[ra];
      if (rd !== 0) return rd;
      return a.title.localeCompare(b.title);
    });
  }, [songs, genre, keyFilter, tagFilter, ratingView, currentUser]);

  const checkedSongIds = useMemo(() => {
    return new Set(session?.songs.map(s => s.songId) ?? []);
  }, [session]);

  // Column visibility (contextual)
  const showKeyCol = genre === 'oldtime' && !keyFilter;
  const showTagCol = !tagFilter;

  // ── Actions
  async function startSession() {
    const res = await fetch('/api/music/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: currentUser }),
    });
    setSession(await res.json());
    setReopenable(null);
  }

  async function endSession() {
    if (!session) return;
    const res = await fetch('/api/music/sessions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: session.id, action: 'end' }),
    });
    const ended = await res.json();
    setSession(null);
    setReopenable(ended);
  }

  async function reopenSession() {
    if (!reopenable) return;
    const res = await fetch('/api/music/sessions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reopenable.id, action: 'reopen' }),
    });
    setSession(await res.json());
    setReopenable(null);
  }

  async function toggleCheck(songId: string) {
    if (!session) return;
    const alreadyChecked = checkedSongIds.has(songId);
    // Optimistic
    if (alreadyChecked) {
      setSession({ ...session, songs: session.songs.filter(s => s.songId !== songId) });
      await fetch(`/api/music/sessions/${session.id}/songs?songId=${songId}`, { method: 'DELETE' });
    } else {
      const optimistic: SessionSong = {
        id: `temp-${songId}`, sessionId: session.id, songId, playedAt: new Date().toISOString(),
      };
      setSession({ ...session, songs: [...session.songs, optimistic] });
      const res = await fetch(`/api/music/sessions/${session.id}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId }),
      });
      const saved = await res.json();
      setSession(prev => prev && {
        ...prev,
        songs: prev.songs.map(s => s.id === optimistic.id ? saved : s),
      });
    }
  }

  async function cycleRating(songId: string) {
    const song = songs.find(s => s.id === songId);
    if (!song) return;
    const current = getUserRating(song, currentUser);
    const next = nextRating(current);
    // Optimistic
    setSongs(prev => prev.map(s => s.id !== songId ? s : {
      ...s,
      ratings: [
        ...s.ratings.filter(r => r.user !== currentUser),
        { id: `temp-${songId}-${currentUser}`, songId, user: currentUser, rating: next },
      ],
    }));
    await fetch('/api/music/ratings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId, user: currentUser, rating: next }),
    });
  }

  async function updateTag(songId: string, tag: Tag) {
    setSongs(prev => prev.map(s => s.id === songId ? { ...s, tag } : s));
    await fetch('/api/music/songs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: songId, tag }),
    });
  }

  async function submitNewSong(e: React.FormEvent) {
    e.preventDefault();
    if (!newSong.title.trim()) return;
    const res = await fetch('/api/music/songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newSong.title.trim(),
        genre,
        key: genre === 'oldtime' ? (newSong.key || null) : null,
        tag: newSong.tag,
        artist: newSong.artist.trim() || null,
      }),
    });
    const created: Song = await res.json();
    setSongs(prev => [...prev, created]);
    setNewSong({ title: '', key: '', tag: 'duo', artist: '' });
    setShowAddForm(false);
  }

  const userColor = USERS.find(u => u.value === currentUser)?.color ?? '#333';

  return (
    <div className="music-root">
      <style>{styles}</style>

      {/* Sticky header */}
      <header className="music-header" style={{ '--user-color': userColor } as React.CSSProperties}>
        <div className="music-header-top">
          <Link href="/" className="home-link">← Home</Link>
          <div className="header-title">🎵 Music</div>
          <Link href="/music/history" className="history-link">History</Link>
        </div>
        <div className="user-picker">
          {USERS.map(u => (
            <button
              key={u.value}
              className={`user-btn ${currentUser === u.value ? 'active' : ''}`}
              style={currentUser === u.value ? { '--user-color': u.color, background: u.color, borderColor: 'rgba(255,255,255,0.2)' } as React.CSSProperties : undefined}
              onClick={() => setCurrentUser(u.value)}
            >
              {u.label}
            </button>
          ))}
        </div>
      </header>

      {/* Session banners */}
      {session && (
        <div className="session-banner active">
          <div className="session-banner-text">
            <strong>Session in progress</strong> — started {fmtRelative(session.startedAt)} · {session.songs.length} song{session.songs.length === 1 ? '' : 's'} checked
          </div>
          <button className="session-banner-btn primary" onClick={endSession}>End session</button>
        </div>
      )}
      {!session && reopenable && (
        <div className="session-banner">
          <div className="session-banner-text">
            Last session ended {fmtRelative(reopenable.endedAt!)}. Ended by accident?
          </div>
          <button className="session-banner-btn secondary" onClick={reopenSession}>Reopen</button>
        </div>
      )}

      <main className="music-content">
        {/* Genre tabs */}
        <div className="genre-tabs">
          {GENRES.map(g => (
            <button
              key={g.value}
              className={`genre-tab ${genre === g.value ? 'active' : ''}`}
              onClick={() => setGenre(g.value)}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className="filter-bar">
          <div className="filter-group">
            <span className="filter-label">Show</span>
            {(['practice', 'all', 'new'] as RatingView[]).map(v => (
              <button
                key={v}
                className={`pill ${ratingView === v ? 'active' : ''}`}
                onClick={() => setRatingView(v)}
              >
                {v === 'practice' ? 'Practice' : v === 'all' ? 'All' : 'New'}
              </button>
            ))}
          </div>

          {genre === 'oldtime' && availableKeys.length > 0 && (
            <div className="filter-group">
              <span className="filter-label">Key</span>
              <button
                className={`pill ${!keyFilter ? 'active' : ''}`}
                onClick={() => setKeyFilter(null)}
              >
                All
              </button>
              {availableKeys.map(k => (
                <button
                  key={k}
                  className={`pill ${keyFilter === k ? 'active' : ''}`}
                  onClick={() => setKeyFilter(k)}
                >
                  {k}
                </button>
              ))}
            </div>
          )}

          <div className="filter-group">
            <span className="filter-label">Tag</span>
            <button
              className={`pill ${!tagFilter ? 'active' : ''}`}
              onClick={() => setTagFilter(null)}
            >
              All
            </button>
            {TAGS.map(t => (
              <button
                key={t}
                className={`pill ${tagFilter === t ? 'active' : ''}`}
                onClick={() => setTagFilter(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Start session (only shown when no active session) */}
        {!session && (
          <div className="session-actions">
            <button className="btn-primary" onClick={startSession}>
              ▶ Start practice session
            </button>
          </div>
        )}

        {/* Add song */}
        {!showAddForm ? (
          <button className="add-song-btn" onClick={() => setShowAddForm(true)}>
            + Add song
          </button>
        ) : (
          <form className="add-song-form" onSubmit={submitNewSong}>
            <input
              placeholder="Song title"
              value={newSong.title}
              onChange={e => setNewSong({ ...newSong, title: e.target.value })}
              autoFocus
              required
            />
            {genre === 'oldtime' && (
              <input
                placeholder="Key (C, A, G…)"
                value={newSong.key}
                onChange={e => setNewSong({ ...newSong, key: e.target.value.toUpperCase() })}
              />
            )}
            <select value={newSong.tag} onChange={e => setNewSong({ ...newSong, tag: e.target.value as Tag })}>
              {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              placeholder="Artist (optional)"
              value={newSong.artist}
              onChange={e => setNewSong({ ...newSong, artist: e.target.value })}
            />
            <button type="submit" className="pill active">Add</button>
          </form>
        )}

        {/* Song list */}
        {loading ? (
          <div className="empty">Loading…</div>
        ) : visibleSongs.length === 0 ? (
          <div className="empty">
            {songs.filter(s => s.genre === genre).length === 0
              ? `No ${genre} songs yet. Add one above.`
              : 'No songs match the current filters.'}
          </div>
        ) : (
          <div className="song-list">
            {visibleSongs.map(song => {
              const rating = getUserRating(song, currentUser);
              const checked = checkedSongIds.has(song.id);
              const rowDisabled = !session;
              return (
                <div
                  key={song.id}
                  className={`song-row ${checked ? 'checked' : ''} ${rowDisabled ? 'disabled' : ''}`}
                  onClick={() => !rowDisabled && toggleCheck(song.id)}
                >
                  <input
                    type="checkbox"
                    className="song-check"
                    checked={checked}
                    disabled={rowDisabled}
                    onChange={() => {/* row-click handles it */}}
                    onClick={e => e.stopPropagation()}
                    aria-label={`Check ${song.title}`}
                  />
                  {showKeyCol && (
                    <div className="song-key">{song.key ?? '—'}</div>
                  )}
                  <div className="song-title-wrap">
                    <div className="song-title">{song.title}</div>
                    {song.artist && <div className="song-artist">{song.artist}</div>}
                  </div>
                  {showTagCol && (
                    <select
                      className={`song-tag tag-${song.tag}`}
                      value={song.tag}
                      onClick={e => e.stopPropagation()}
                      onChange={e => updateTag(song.id, e.target.value as Tag)}
                    >
                      {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  )}
                  <button
                    className={`song-rating ${rating}`}
                    onClick={e => { e.stopPropagation(); cycleRating(song.id); }}
                    title={`${currentUser}: ${rating} (tap to cycle)`}
                  >
                    {RATING_MARK[rating]}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
