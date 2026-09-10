'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

// ── Types ──────────────────────────────────────────────────────────────────
type User = 'kathy' | 'mel' | 'jo' | 'duo';
type Genre = 'oldtime' | 'bluegrass' | 'jazz' | 'blues';
type Rating = 'unknown' | 'learning' | 'known';
type ListView = 'mine' | 'all';

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

const RATINGS: Rating[] = ['unknown', 'learning', 'known'];
const RATING_ORDER: Record<Rating, number> = { unknown: 0, learning: 1, known: 2 };
const RATING_LABEL: Record<Rating, string> = {
  unknown: 'Not on list',
  learning: 'Learning',
  known: 'Known',
};

const LS_USER = 'music_current_user';
const LS_LIST_VIEW = 'music_list_view';

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

function normalizeTitle(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
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
    padding-right: 44px;
  }
  .home-link { color: #ccc; text-decoration: none; font-size: 0.85rem; }
  .home-link:hover { color: #fff; }
  .header-title { font-weight: 600; font-size: 1rem; margin-left: auto; }
  .history-link {
    color: #ccc; text-decoration: none; font-size: 0.85rem;
    padding: 4px 10px; border-radius: 6px; background: rgba(255,255,255,0.08);
  }
  .history-link:hover { background: rgba(255,255,255,0.15); color: #fff; }

  /* User picker */
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
  .user-btn.active { color: #fff; border-color: rgba(255,255,255,0.2); }

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

  /* Big list toggle */
  .list-toggle {
    display: flex; background: #e5e5e5; border-radius: 10px; padding: 3px;
    margin-bottom: 12px; gap: 3px;
  }
  .list-toggle button {
    flex: 1; padding: 10px; border-radius: 8px; border: none;
    background: transparent; color: #555; font-size: 0.9rem; font-weight: 500;
    cursor: pointer; min-height: 40px;
  }
  .list-toggle button.active { background: #fff; color: #1a1a1a; font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,0.08); }
  .list-toggle .count { color: #999; font-weight: 400; margin-left: 4px; font-size: 0.85rem; }
  .list-toggle button.active .count { color: #666; }

  /* Filter bar */
  .filter-bar {
    display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;
    padding: 10px; background: #fff; border-radius: 8px;
    border: 1px solid #e5e5e5;
  }
  .filter-group { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
  .filter-label { font-size: 0.72rem; color: #999; text-transform: uppercase; letter-spacing: 0.05em; margin-right: 4px; }
  .pill {
    padding: 5px 12px; border-radius: 999px; border: 1px solid #ddd;
    background: #fff; color: #666; font-size: 0.8rem; cursor: pointer;
    min-height: 32px; display: inline-flex; align-items: center;
  }
  .pill:hover { border-color: #aaa; }
  .pill.active { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }

  /* Search */
  .search-input {
    flex: 1; min-width: 140px; padding: 6px 10px; border-radius: 6px;
    border: 1px solid #ddd; font-size: 0.85rem; min-height: 32px;
  }

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
    .add-song-form { grid-template-columns: 2fr 1fr 1fr auto auto; }
  }
  .add-song-form input, .add-song-form select {
    padding: 8px 10px; border-radius: 6px; border: 1px solid #ddd;
    font-size: 0.9rem; min-height: 36px;
  }
  .form-btn {
    padding: 8px 14px; border-radius: 6px; border: none;
    font-size: 0.9rem; font-weight: 500; cursor: pointer; min-height: 36px;
  }
  .form-btn.primary { background: #1a1a1a; color: #fff; }
  .form-btn.secondary { background: transparent; color: #666; }

  .form-error {
    grid-column: 1 / -1;
    color: #b91c1c; font-size: 0.85rem;
    padding: 6px 8px; background: #fee2e2; border-radius: 6px;
  }

  /* Song list */
  .song-list { display: flex; flex-direction: column; gap: 4px; }
  .song-row {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 12px; min-height: 52px;
    background: #fff; border: 1px solid #e5e5e5; border-radius: 8px;
    transition: border-color 0.1s;
  }
  .song-row.tap-check { cursor: pointer; }
  .song-row:hover { border-color: #bbb; }
  .song-row.checked { background: #ecfdf5; border-color: #6ee7b7; }

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

  /* Rating pill — clearly a state indicator, not a delete button */
  .rating-pill {
    padding: 4px 10px; border-radius: 999px;
    border: 1px solid transparent;
    font-size: 0.72rem; font-weight: 600;
    background: #f3f4f6; color: #888;
    cursor: pointer; white-space: nowrap;
    min-height: 28px; display: inline-flex; align-items: center; gap: 4px;
  }
  .rating-pill:hover { filter: brightness(0.96); }
  .rating-pill.learning { background: #fef3c7; color: #92400e; border-color: #fcd34d; }
  .rating-pill.known    { background: #d1fae5; color: #065f46; border-color: #6ee7b7; }
  .rating-pill.unknown  { background: #f3f4f6; color: #666; border-color: #ddd; }

  .add-to-list-btn {
    padding: 4px 10px; border-radius: 999px;
    border: 1px solid #1a1a1a; background: #fff; color: #1a1a1a;
    font-size: 0.72rem; font-weight: 600; cursor: pointer;
    white-space: nowrap; min-height: 28px;
  }
  .add-to-list-btn:hover { background: #1a1a1a; color: #fff; }

  /* Row action menu */
  .row-menu-wrap { position: relative; }
  .row-menu-btn {
    width: 30px; height: 30px; border-radius: 6px;
    border: 1px solid transparent; background: transparent;
    color: #888; cursor: pointer; font-size: 1.1rem;
    display: flex; align-items: center; justify-content: center;
  }
  .row-menu-btn:hover { background: #f3f4f6; color: #333; }
  .row-menu {
    position: absolute; top: 34px; right: 0; z-index: 30;
    background: #fff; border: 1px solid #e5e5e5; border-radius: 8px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.12);
    min-width: 140px; overflow: hidden;
  }
  .row-menu button {
    display: block; width: 100%; text-align: left;
    padding: 10px 14px; border: none; background: transparent;
    font-size: 0.85rem; color: #333; cursor: pointer;
  }
  .row-menu button:hover { background: #f3f4f6; }
  .row-menu button.danger { color: #b91c1c; }
  .row-menu button.danger:hover { background: #fee2e2; }

  /* Inline edit form */
  .edit-form {
    display: grid; grid-template-columns: 1fr; gap: 6px;
    padding: 12px; background: #fffbeb; border: 1px solid #fcd34d;
    border-radius: 8px; margin-bottom: 4px;
  }
  @media (min-width: 640px) {
    .edit-form { grid-template-columns: 2fr 1fr 1fr auto auto; }
  }
  .edit-form input {
    padding: 6px 8px; border-radius: 4px; border: 1px solid #ddd;
    font-size: 0.85rem;
  }

  /* Empty / loading */
  .empty {
    text-align: center; color: #999; padding: 40px 20px; font-size: 0.9rem;
    background: #fff; border: 1px dashed #ddd; border-radius: 10px;
  }
  .empty strong { display: block; color: #555; margin-bottom: 6px; }
  .empty a { color: #0ea5e9; cursor: pointer; }
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
  const [listView, setListView] = useState<ListView>('mine');
  const [search, setSearch] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [newSong, setNewSong] = useState({ title: '', key: '', artist: '' });
  const [addError, setAddError] = useState<string | null>(null);
  const [pendingAdd, setPendingAdd] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ title: '', key: '', artist: '' });
  const [editError, setEditError] = useState<string | null>(null);

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // ── Load from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem(LS_USER) as User | null;
    if (savedUser && USERS.some(u => u.value === savedUser)) setCurrentUser(savedUser);
    const savedView = localStorage.getItem(LS_LIST_VIEW) as ListView | null;
    if (savedView === 'mine' || savedView === 'all') setListView(savedView);
  }, []);

  useEffect(() => { localStorage.setItem(LS_USER, currentUser); }, [currentUser]);
  useEffect(() => { localStorage.setItem(LS_LIST_VIEW, listView); }, [listView]);

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

  // ── Close row menu on outside click
  useEffect(() => {
    if (!menuOpenId) return;
    function onDown(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (!t.closest('.row-menu-wrap')) setMenuOpenId(null);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpenId]);

  // ── Available keys for the current genre (only oldtime for now)
  const availableKeys = useMemo(() => {
    const keys = new Set<string>();
    songs.filter(s => s.genre === genre && s.key).forEach(s => keys.add(s.key!));
    return Array.from(keys).sort();
  }, [songs, genre]);

  useEffect(() => {
    if (keyFilter && !availableKeys.includes(keyFilter)) setKeyFilter(null);
  }, [availableKeys, keyFilter]);

  // Counts for the toggle
  const genreSongs = useMemo(
    () => songs.filter(s => s.genre === genre),
    [songs, genre],
  );
  const myCount = useMemo(
    () => genreSongs.filter(s => getUserRating(s, currentUser) !== 'unknown').length,
    [genreSongs, currentUser],
  );
  const allCount = genreSongs.length;

  // Visible songs
  const visibleSongs = useMemo(() => {
    const q = normalizeTitle(search);
    return genreSongs.filter(s => {
      if (keyFilter && s.key !== keyFilter) return false;
      if (listView === 'mine' && getUserRating(s, currentUser) === 'unknown') return false;
      if (q) {
        const hay = `${normalizeTitle(s.title)} ${normalizeTitle(s.artist ?? '')}`;
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      const ra = getUserRating(a, currentUser);
      const rb = getUserRating(b, currentUser);
      const rd = RATING_ORDER[rb] - RATING_ORDER[ra];
      if (rd !== 0) return rd;
      return a.title.localeCompare(b.title);
    });
  }, [genreSongs, keyFilter, listView, search, currentUser]);

  const checkedSongIds = useMemo(() => {
    return new Set(session?.songs.map(s => s.songId) ?? []);
  }, [session]);

  const showKeyCol = genre === 'oldtime' && !keyFilter;

  // ── Session actions
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

  // ── Rating (list membership + cycle)
  function applyRatingLocal(songId: string, next: Rating) {
    setSongs(prev => prev.map(s => {
      if (s.id !== songId) return s;
      const filtered = s.ratings.filter(r => r.user !== currentUser);
      if (next === 'unknown') return { ...s, ratings: filtered };
      return {
        ...s,
        ratings: [
          ...filtered,
          { id: `temp-${songId}-${currentUser}`, songId, user: currentUser, rating: next },
        ],
      };
    }));
  }

  async function setRating(songId: string, next: Rating) {
    applyRatingLocal(songId, next);
    await fetch('/api/music/ratings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId, user: currentUser, rating: next }),
    });
  }

  async function cycleRating(songId: string) {
    const song = songs.find(s => s.id === songId);
    if (!song) return;
    const current = getUserRating(song, currentUser);
    await setRating(songId, nextRating(current));
  }

  async function addToMyList(songId: string) {
    await setRating(songId, 'learning');
  }

  // ── Add song
  function resetAddForm() {
    setNewSong({ title: '', key: '', artist: '' });
    setAddError(null);
    setShowAddForm(false);
  }

  async function submitNewSong(e: React.FormEvent) {
    e.preventDefault();
    if (pendingAdd) return;
    setAddError(null);
    const title = newSong.title.trim();
    if (title.length < 2) {
      setAddError('Title is too short.');
      return;
    }

    // Client-side near-duplicate detection within same genre
    const norm = normalizeTitle(title);
    const near = songs.find(s => s.genre === genre && normalizeTitle(s.title) === norm);
    if (near) {
      const alreadyMine = getUserRating(near, currentUser) !== 'unknown';
      const proceed = confirm(
        `"${near.title}" already exists in ${genre}${near.artist ? ` (${near.artist})` : ''}.\n\n` +
        (alreadyMine
          ? `It's already on your list.\n\nAdd anyway as a new song?`
          : `Add it to your list instead of creating a new one?\n\nOK = add to my list. Cancel = keep typing.`),
      );
      if (!proceed) return;
      if (!alreadyMine) {
        await addToMyList(near.id);
        resetAddForm();
        return;
      }
      // else fall through and create a new (duplicate title) song via DB — will fail unique
    }

    setPendingAdd(true);
    const res = await fetch('/api/music/songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        genre,
        key: genre === 'oldtime' ? (newSong.key.trim() || null) : null,
        artist: newSong.artist.trim() || null,
      }),
    });
    setPendingAdd(false);

    if (!res.ok) {
      if (res.status === 409) {
        setAddError('A song with that title already exists in this genre.');
      } else {
        setAddError('Could not save. Try again.');
      }
      return;
    }

    const created: Song = await res.json();
    setSongs(prev => [...prev, { ...created, ratings: created.ratings ?? [] }]);
    // Auto-add to current user's list as "learning"
    await setRating(created.id, 'learning');
    resetAddForm();
  }

  // ── Edit song
  function startEdit(song: Song) {
    setEditingId(song.id);
    setEditDraft({
      title: song.title,
      key: song.key ?? '',
      artist: song.artist ?? '',
    });
    setEditError(null);
    setMenuOpenId(null);
  }
  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }
  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    const title = editDraft.title.trim();
    if (title.length < 2) {
      setEditError('Title is too short.');
      return;
    }
    const res = await fetch('/api/music/songs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingId,
        title,
        key: editDraft.key.trim() || null,
        artist: editDraft.artist.trim() || null,
      }),
    });
    if (!res.ok) {
      setEditError(res.status === 409 ? 'Another song has that title in this genre.' : 'Could not save.');
      return;
    }
    const updated: Song = await res.json();
    setSongs(prev => prev.map(s => s.id === updated.id ? { ...updated, ratings: updated.ratings ?? s.ratings } : s));
    cancelEdit();
  }

  // ── Delete song
  async function deleteSong(song: Song) {
    setMenuOpenId(null);
    if (!confirm(`Delete "${song.title}" from the library?\n\nThis removes it for everyone.`)) return;
    const res = await fetch(`/api/music/songs?id=${song.id}`, { method: 'DELETE' });
    if (!res.ok) {
      alert('Could not delete. Try again.');
      return;
    }
    setSongs(prev => prev.filter(s => s.id !== song.id));
  }

  const userColor = USERS.find(u => u.value === currentUser)?.color ?? '#333';

  return (
    <div className="music-root">
      <style>{styles}</style>

      <header className="music-header">
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
              style={currentUser === u.value ? { background: u.color, borderColor: 'rgba(255,255,255,0.2)' } : undefined}
              onClick={() => setCurrentUser(u.value)}
            >
              {u.label}
            </button>
          ))}
        </div>
      </header>

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

        <div className="list-toggle" role="tablist" aria-label="List view">
          <button
            className={listView === 'mine' ? 'active' : ''}
            onClick={() => setListView('mine')}
          >
            My list <span className="count">({myCount})</span>
          </button>
          <button
            className={listView === 'all' ? 'active' : ''}
            onClick={() => setListView('all')}
          >
            All songs <span className="count">({allCount})</span>
          </button>
        </div>

        <div className="filter-bar">
          <input
            className="search-input"
            placeholder="Search title or artist…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
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
        </div>

        {!session && (
          <div className="session-actions">
            <button
              className="btn-primary"
              onClick={startSession}
              style={{ background: userColor }}
            >
              ▶ Start practice as {USERS.find(u => u.value === currentUser)?.label}
            </button>
          </div>
        )}

        {!showAddForm ? (
          <button className="add-song-btn" onClick={() => { setShowAddForm(true); setAddError(null); }}>
            + Add a new song to the library
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
                placeholder="Key"
                value={newSong.key}
                onChange={e => setNewSong({ ...newSong, key: e.target.value.toUpperCase() })}
              />
            )}
            <input
              placeholder="Artist (optional)"
              value={newSong.artist}
              onChange={e => setNewSong({ ...newSong, artist: e.target.value })}
              list="artist-suggestions"
            />
            <button type="submit" className="form-btn primary" disabled={pendingAdd}>
              {pendingAdd ? 'Adding…' : 'Add'}
            </button>
            <button type="button" className="form-btn secondary" onClick={resetAddForm}>
              Cancel
            </button>
            {addError && <div className="form-error">{addError}</div>}
          </form>
        )}

        {loading ? (
          <div className="empty">Loading…</div>
        ) : visibleSongs.length === 0 ? (
          <div className="empty">
            {listView === 'mine' && genreSongs.length > 0 ? (
              <>
                <strong>Your {genre} list is empty.</strong>
                Switch to <a onClick={() => setListView('all')}>All songs</a> and tap
                {' '}“+ Add to my list” on anything you're working on, or add a new song above.
              </>
            ) : genreSongs.length === 0 ? (
              <><strong>No {genre} songs in the library yet.</strong> Add one above to get started.</>
            ) : (
              <>No songs match the current filters.</>
            )}
          </div>
        ) : (
          <div className="song-list">
            {visibleSongs.map(song => {
              const rating = getUserRating(song, currentUser);
              const checked = checkedSongIds.has(song.id);
              const canTap = !!session;
              const isEditing = editingId === song.id;

              if (isEditing) {
                return (
                  <form key={song.id} className="edit-form" onSubmit={submitEdit}>
                    <input
                      placeholder="Title"
                      value={editDraft.title}
                      onChange={e => setEditDraft({ ...editDraft, title: e.target.value })}
                      autoFocus
                      required
                    />
                    {genre === 'oldtime' && (
                      <input
                        placeholder="Key"
                        value={editDraft.key}
                        onChange={e => setEditDraft({ ...editDraft, key: e.target.value.toUpperCase() })}
                      />
                    )}
                    <input
                      placeholder="Artist"
                      value={editDraft.artist}
                      onChange={e => setEditDraft({ ...editDraft, artist: e.target.value })}
                    />
                    <button type="submit" className="form-btn primary">Save</button>
                    <button type="button" className="form-btn secondary" onClick={cancelEdit}>Cancel</button>
                    {editError && <div className="form-error">{editError}</div>}
                  </form>
                );
              }

              return (
                <div
                  key={song.id}
                  className={`song-row ${checked ? 'checked' : ''} ${canTap ? 'tap-check' : ''}`}
                  onClick={() => canTap && toggleCheck(song.id)}
                >
                  {session && (
                    <input
                      type="checkbox"
                      className="song-check"
                      checked={checked}
                      onChange={() => {/* row-click handles it */}}
                      onClick={e => e.stopPropagation()}
                      aria-label={`Check ${song.title}`}
                    />
                  )}
                  {showKeyCol && (
                    <div className="song-key">{song.key ?? '—'}</div>
                  )}
                  <div className="song-title-wrap">
                    <div className="song-title">{song.title}</div>
                    {song.artist && <div className="song-artist">{song.artist}</div>}
                  </div>

                  {rating === 'unknown' ? (
                    <button
                      className="add-to-list-btn"
                      onClick={e => { e.stopPropagation(); addToMyList(song.id); }}
                      title="Add to my list as Learning"
                    >
                      + Add to my list
                    </button>
                  ) : (
                    <button
                      className={`rating-pill ${rating}`}
                      onClick={e => { e.stopPropagation(); cycleRating(song.id); }}
                      title="Tap to cycle: Learning → Known → Remove"
                    >
                      {RATING_LABEL[rating]}
                    </button>
                  )}

                  <div className="row-menu-wrap">
                    <button
                      className="row-menu-btn"
                      onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === song.id ? null : song.id); }}
                      aria-label="Song actions"
                    >
                      ⋯
                    </button>
                    {menuOpenId === song.id && (
                      <div className="row-menu" onClick={e => e.stopPropagation()}>
                        <button onClick={() => startEdit(song)}>Edit</button>
                        {rating !== 'unknown' && (
                          <button onClick={() => { setMenuOpenId(null); setRating(song.id, 'unknown'); }}>
                            Remove from my list
                          </button>
                        )}
                        <button className="danger" onClick={() => deleteSong(song)}>Delete song</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <datalist id="artist-suggestions">
          {Array.from(new Set(songs.map(s => s.artist).filter(Boolean))).sort().map(a => (
            <option key={a!} value={a!} />
          ))}
        </datalist>
      </main>
    </div>
  );
}
