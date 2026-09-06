'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getHolidays, type Holiday } from '@/lib/holidays';

interface CalendarItem {
  id: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;  // YYYY-MM-DD (inclusive); omit for single-day
}

interface CalendarState {
  items: CalendarItem[];
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tues', 'Weds', 'Thurs', 'Fri', 'Sat'];

const WINDOW_MONTHS = 12;
const FUTURE_YEARS = 10;

// ── date helpers ──────────────────────────────────────────────────────────────
function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function weekdayLabel(iso: string): string {
  return WEEKDAY_SHORT[parseISO(iso).getDay()];
}

function monthOf(iso: string): number { return Number(iso.slice(5, 7)); }
function dayOf(iso: string): number { return Number(iso.slice(8, 10)); }
function yearOf(iso: string): number { return Number(iso.slice(0, 4)); }

function pad2(n: number): string { return String(n).padStart(2, '0'); }

function firstOfMonth(year: number, month: number): string {
  return `${year}-${pad2(month)}-01`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function lastOfMonth(year: number, month: number): string {
  return `${year}-${pad2(month)}-${pad2(daysInMonth(year, month))}`;
}

// Add N months to a (year, month) 1-indexed pair. Returns [year, month].
function addMonths(year: number, month: number, delta: number): [number, number] {
  const zeroIdx = (month - 1) + delta;
  const y = year + Math.floor(zeroIdx / 12);
  const m = ((zeroIdx % 12) + 12) % 12 + 1;
  return [y, m];
}

function formatShort(iso: string): string {
  const m = MONTHS[monthOf(iso) - 1].slice(0, 3);
  return `${m} ${dayOf(iso)}`;
}

// ── row + window types ───────────────────────────────────────────────────────
interface Row {
  key: string;
  date: string; // ISO for the row's display slot
  day: number;
  weekday: string;
  label: string;
  kind: 'holiday-federal' | 'holiday-catholic' | 'item' | 'item-range' | 'today';
  itemId?: string;
  isToday?: boolean;
}

interface MonthSlot {
  year: number;
  month: number;   // 1-indexed
  key: string;     // YYYY-MM
  title: string;   // e.g. "August 2026"
}

function buildWindow(startYear: number, startMonth: number): MonthSlot[] {
  const out: MonthSlot[] = [];
  for (let i = 0; i < WINDOW_MONTHS; i++) {
    const [y, m] = addMonths(startYear, startMonth, i);
    out.push({
      year: y,
      month: m,
      key: `${y}-${pad2(m)}`,
      title: `${MONTHS[m - 1]} ${y}`,
    });
  }
  return out;
}

function buildRowsByMonth(
  items: CalendarItem[],
  holidays: Holiday[],
  window: MonthSlot[],
  today: string,
): Map<string, Row[]> {
  const map = new Map<string, Row[]>();
  const validKeys = new Set(window.map(s => s.key));
  for (const s of window) map.set(s.key, []);

  // Holidays
  for (const h of holidays) {
    const key = h.date.slice(0, 7);
    if (!validKeys.has(key)) continue;
    map.get(key)!.push({
      key: `h-${h.kind}-${h.date}-${h.name}`,
      date: h.date,
      day: dayOf(h.date),
      weekday: weekdayLabel(h.date),
      label: h.name,
      kind: h.kind === 'federal' ? 'holiday-federal' : 'holiday-catholic',
    });
  }

  // Items — one row per month it touches
  for (const item of items) {
    const start = item.startDate;
    const end = item.endDate ?? item.startDate;
    const isRange = item.endDate && item.endDate !== item.startDate;

    for (const s of window) {
      const mStart = firstOfMonth(s.year, s.month);
      const mEnd = lastOfMonth(s.year, s.month);
      if (start > mEnd || end < mStart) continue; // no overlap

      // Row anchors on the item's start day if in this month, else the 1st.
      const anchoredIso = (start >= mStart && start <= mEnd) ? start : mStart;
      const label = isRange
        ? `${item.title} (${formatShort(start)} – ${formatShort(end)})`
        : item.title;

      map.get(s.key)!.push({
        key: `i-${item.id}-${s.key}`,
        date: anchoredIso,
        day: dayOf(anchoredIso),
        weekday: weekdayLabel(anchoredIso),
        label,
        kind: isRange ? 'item-range' : 'item',
        itemId: item.id,
      });
    }
  }

  // Today marker: if current month is in the window, either flag existing
  // rows on today's date or insert a synthetic marker row.
  const todayKey = today.slice(0, 7);
  if (validKeys.has(todayKey)) {
    const rows = map.get(todayKey)!;
    const matches = rows.filter(r => r.date === today);
    if (matches.length > 0) {
      for (const r of matches) r.isToday = true;
    } else {
      rows.push({
        key: `today-${today}`,
        date: today,
        day: dayOf(today),
        weekday: weekdayLabel(today),
        label: 'Today',
        kind: 'today',
        isToday: true,
      });
    }
  }

  // Sort: by day, then today marker before other same-day rows, then label.
  for (const key of map.keys()) {
    map.get(key)!.sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      if (a.kind === 'today' && b.kind !== 'today') return -1;
      if (b.kind === 'today' && a.kind !== 'today') return 1;
      return a.label.localeCompare(b.label);
    });
  }
  return map;
}

// ── component ────────────────────────────────────────────────────────────────
export default function CalendarClient() {
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const today = todayISO();

  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  const [startYear, setStartYear] = useState(currentYear);
  const [editMode, setEditMode] = useState(false);
  const [showFederal, setShowFederal] = useState(true);
  const [showCatholic, setShowCatholic] = useState(true);

  // Add-item form state
  const [newTitle, setNewTitle] = useState('');
  const [newStart, setNewStart] = useState(today);
  const [newEnd, setNewEnd] = useState('');
  const [rangeMode, setRangeMode] = useState(false);

  // Load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/calendar');
        const data: CalendarState | null = await res.json();
        if (!cancelled) {
          setItems(data?.items ?? []);
          setLoaded(true);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Save (debounced)
  useEffect(() => {
    if (!loaded) return;
    setSaveStatus('saving');
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/calendar', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        });
        setSaveStatus(res.ok ? 'saved' : 'error');
      } catch {
        setSaveStatus('error');
      }
    }, 400);
    return () => clearTimeout(t);
  }, [items, loaded]);

  // Earliest date we have data for — bounds how far back the year picker goes,
  // and clamps the visible window when a past year is picked.
  const firstDataISO = useMemo(() => {
    if (items.length === 0) return today;
    return items.reduce((min, it) => it.startDate < min ? it.startDate : min, items[0].startDate);
  }, [items, today]);

  const firstDataYear = yearOf(firstDataISO);

  // Effective (year, month) for the first slot in the 12-month window.
  const [effectiveStartYear, effectiveStartMonth] = useMemo<[number, number]>(() => {
    // Raw start for the picked year
    let rawY: number, rawM: number;
    if (startYear === currentYear) {
      rawY = currentYear; rawM = currentMonth;
    } else if (startYear > currentYear) {
      rawY = startYear; rawM = 1;
    } else {
      rawY = startYear; rawM = 1;
    }
    // Clamp to firstDataISO (never show earlier than the earliest data we have)
    const raw = firstOfMonth(rawY, rawM);
    const clamp = firstOfMonth(yearOf(firstDataISO), monthOf(firstDataISO));
    if (raw < clamp) return [yearOf(clamp), monthOf(clamp)];
    return [rawY, rawM];
  }, [startYear, currentYear, currentMonth, firstDataISO]);

  const window = useMemo(
    () => buildWindow(effectiveStartYear, effectiveStartMonth),
    [effectiveStartYear, effectiveStartMonth],
  );

  // Year picker: from firstDataYear (never before) up through currentYear + FUTURE_YEARS
  const yearOptions = useMemo(() => {
    const from = Math.min(firstDataYear, currentYear);
    const to = currentYear + FUTURE_YEARS;
    const out: number[] = [];
    for (let y = from; y <= to; y++) out.push(y);
    return out;
  }, [firstDataYear, currentYear]);

  // Holidays for every year the window spans
  const holidays = useMemo(() => {
    const years = new Set(window.map(s => s.year));
    const all: Holiday[] = [];
    for (const y of years) all.push(...getHolidays(y));
    return all.filter(h =>
      (h.kind === 'federal' && showFederal) || (h.kind === 'catholic' && showCatholic)
    );
  }, [window, showFederal, showCatholic]);

  const rowsByMonth = useMemo(
    () => buildRowsByMonth(items, holidays, window, today),
    [items, holidays, window, today],
  );

  // Add-form bounds:
  //   start: today at minimum, capped at end-of-window
  //   end: at least start date, no year cap (cross-year ranges are allowed)
  const windowEnd = window[window.length - 1];
  const maxStart = lastOfMonth(windowEnd.year, windowEnd.month);
  const maxEnd = `${currentYear + FUTURE_YEARS + 1}-12-31`;

  const handleAdd = useCallback(() => {
    const title = newTitle.trim();
    if (!title) return;
    if (newStart < today) return;
    if (rangeMode && newEnd && newEnd < newStart) return;

    const item: CalendarItem = {
      id: uid(),
      title,
      startDate: newStart,
      ...(rangeMode && newEnd ? { endDate: newEnd } : {}),
    };
    setItems(prev => [...prev, item]);
    setNewTitle('');
    setNewEnd('');
  }, [newTitle, newStart, newEnd, rangeMode, today]);

  const handleDelete = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  // Keep new-item start date in bounds
  useEffect(() => {
    if (newStart < today) setNewStart(today);
    if (newStart > maxStart) setNewStart(today);
  }, [today, maxStart, newStart]);

  return (
    <>
      <style>{styles}</style>

      <div className="cal-sticky">
        <div className="cal-header">
          <Link href="/" className="home-link">← Home</Link>
          <div className="cal-title">📅 Calendar</div>
          <div className={`save-status save-${saveStatus}`}>
            {saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'saving' ? '… Saving' : '⚠ Error'}
          </div>
        </div>

        <div className="cal-controls">
          <label className="control-group">
            <span className="control-label">Start year</span>
            <select value={startYear} onChange={e => setStartYear(Number(e.target.value))}>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>

          <button
            className={`mode-toggle ${editMode ? 'active' : ''}`}
            onClick={() => setEditMode(v => !v)}
          >
            {editMode ? '👁 View' : '✏️ Edit'}
          </button>

          <label className="chip">
            <input
              type="checkbox"
              checked={showFederal}
              onChange={e => setShowFederal(e.target.checked)}
            />
            🇺🇸 Federal
          </label>
          <label className="chip">
            <input
              type="checkbox"
              checked={showCatholic}
              onChange={e => setShowCatholic(e.target.checked)}
            />
            ✝️ Catholic
          </label>
        </div>

        {editMode && (
          <div className="add-form">
            <input
              type="text"
              placeholder="Event title (e.g. 'dentist appointment')"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
              className="title-input"
            />
            <input
              type="date"
              value={newStart}
              min={today}
              max={maxStart}
              onChange={e => setNewStart(e.target.value)}
            />
            <label className="chip">
              <input
                type="checkbox"
                checked={rangeMode}
                onChange={e => setRangeMode(e.target.checked)}
              />
              Range
            </label>
            {rangeMode && (
              <input
                type="date"
                value={newEnd}
                min={newStart}
                max={maxEnd}
                onChange={e => setNewEnd(e.target.value)}
                placeholder="End date"
              />
            )}
            <button className="add-btn" onClick={handleAdd}>+ Add</button>
          </div>
        )}
      </div>

      <div className="cal-body">
        {window.map((slot, idx) => {
          const monthRows = rowsByMonth.get(slot.key)!;
          const isCurrent = slot.year === currentYear && slot.month === currentMonth;
          return (
            <section key={slot.key} className="month-section">
              <h2 className={`month-title ${isCurrent ? 'is-current' : ''} ${idx === 0 ? 'is-first' : ''}`}>
                {slot.title}
                {isCurrent && <span className="now-tag">now</span>}
              </h2>
              <div className="month-rule" />
              {monthRows.length === 0 ? (
                <div className="month-empty">—</div>
              ) : (
                <ul className="row-list">
                  {monthRows.map(r => (
                    <li key={r.key} className={`row row-${r.kind} ${r.isToday ? 'is-today' : ''}`}>
                      <span className="row-date">{r.day} / {r.weekday}</span>
                      <span className="row-label">
                        {r.kind === 'holiday-federal' && <span className="tag tag-federal">Fed</span>}
                        {r.kind === 'holiday-catholic' && <span className="tag tag-catholic">Cath</span>}
                        {r.kind === 'today' && <span className="tag tag-today">Today</span>}
                        {r.kind !== 'today' && r.label}
                      </span>
                      {editMode && r.itemId && (
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(r.itemId!)}
                          aria-label="Delete"
                        >
                          ✕
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

const styles = `
  .cal-sticky {
    position: sticky; top: 0; z-index: 50;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    box-shadow: 0 2px 6px rgba(0,0,0,0.04);
  }

  .cal-header {
    display: flex; align-items: center; gap: 12px;
    background: #1a1a1a; color: white; padding: 12px 60px 12px 16px;
  }
  .cal-header .home-link {
    color: #ccc; text-decoration: none; font-size: 0.85rem;
    padding: 4px 8px; border-radius: 4px;
  }
  .cal-header .home-link:hover { color: #fff; background: rgba(255,255,255,0.08); }
  .cal-title { font-size: 1rem; font-weight: 700; color: #bfdbfe; }
  .save-status {
    margin-left: auto; font-size: 0.72rem; font-weight: 500;
    padding: 2px 8px; border-radius: 4px;
  }
  .save-saved { color: #86efac; }
  .save-saving { color: #fde68a; }
  .save-error { color: #fca5a5; }

  .cal-controls {
    display: flex; flex-wrap: wrap; align-items: center;
    gap: 10px; padding: 10px 16px;
  }
  .control-group { display: flex; align-items: center; gap: 6px; font-size: 0.9rem; }
  .control-label { color: #4b5563; font-weight: 500; }
  .cal-controls select {
    padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px;
    background: white; font-size: 0.9rem;
  }
  .mode-toggle {
    padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px;
    background: white; font-size: 0.85rem; cursor: pointer;
  }
  .mode-toggle.active { background: #1e3a8a; color: white; border-color: #1e3a8a; }
  .chip {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 10px; border: 1px solid #e5e7eb; border-radius: 999px;
    background: white; font-size: 0.82rem; cursor: pointer;
  }
  .chip input { margin: 0; }

  .add-form {
    display: flex; flex-wrap: wrap; gap: 8px;
    padding: 10px 16px 14px;
    background: #eff6ff; border-top: 1px solid #bfdbfe;
  }
  .add-form input[type="text"], .add-form input[type="date"] {
    padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px;
    font-size: 0.9rem; background: white;
  }
  .add-form .title-input { flex: 1 1 200px; min-width: 200px; }
  .add-btn {
    padding: 6px 14px; background: #1e3a8a; color: white;
    border: none; border-radius: 6px; font-size: 0.9rem;
    cursor: pointer; font-weight: 500;
  }
  .add-btn:hover { background: #1e40af; }

  .cal-body {
    max-width: 720px; margin: 0 auto; padding: 20px 16px 80px;
  }
  .month-section { margin-bottom: 28px; }
  .month-title {
    font-size: 1.25rem; font-weight: 600; color: #111827; margin-bottom: 4px;
    display: flex; align-items: baseline; gap: 10px;
  }
  .month-title.is-current { color: #1e3a8a; }
  .month-title.is-first::before {
    content: "▸";
    color: #6b7280; margin-right: 4px;
    font-size: 0.9em;
  }
  .now-tag {
    background: #1e3a8a; color: white; font-size: 0.62rem; font-weight: 700;
    padding: 2px 6px; border-radius: 999px; text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .month-rule {
    height: 1px; background: #e5e7eb; margin-bottom: 8px;
  }
  .month-empty {
    padding: 8px 4px; color: #d1d5db; font-size: 0.85rem;
  }
  .row-list { list-style: none; padding: 0; margin: 0; }
  .row {
    display: flex; align-items: baseline; gap: 12px;
    padding: 8px 4px; border-bottom: 1px dashed #f3f4f6;
    font-size: 0.95rem;
  }
  .row-date {
    flex-shrink: 0; width: 90px;
    color: #6b7280; font-variant-numeric: tabular-nums;
    font-size: 0.85rem;
  }
  .row-label { flex: 1; color: #1f2937; }
  .row-item .row-label { font-weight: 500; }
  .row-item-range .row-label { font-weight: 500; color: #1e40af; }
  .row-holiday-federal { background: #fef9c3; margin: 0 -4px; padding: 8px; border-radius: 4px; }
  .row-holiday-catholic { background: #f3e8ff; margin: 0 -4px; padding: 8px; border-radius: 4px; }
  .tag {
    display: inline-block; font-size: 0.65rem; font-weight: 700;
    padding: 1px 6px; border-radius: 3px; margin-right: 6px;
    vertical-align: 1px;
  }
  .tag-federal { background: #ca8a04; color: white; }
  .tag-catholic { background: #7c3aed; color: white; }
  .tag-today { background: #dc2626; color: white; }

  /* Today indicator */
  .row.is-today {
    border-top: 2px solid #dc2626;
    background: #fef2f2;
    margin: 0 -4px; padding: 8px;
    border-radius: 4px 4px 0 0;
  }
  .row.row-today {
    color: #dc2626; font-weight: 600;
    border-bottom: none;
  }
  .row.row-today .row-date { color: #dc2626; }
  .row.row-today .row-label { color: #dc2626; }
  .delete-btn {
    background: transparent; border: none; color: #9ca3af;
    cursor: pointer; font-size: 0.9rem; padding: 2px 6px;
  }
  .delete-btn:hover { color: #dc2626; }
`;
