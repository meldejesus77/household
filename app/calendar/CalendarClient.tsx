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

function monthOf(iso: string): number {
  return Number(iso.slice(5, 7));
}

function dayOf(iso: string): number {
  return Number(iso.slice(8, 10));
}

function yearOf(iso: string): number {
  return Number(iso.slice(0, 4));
}

// Compare two ISO date strings alphabetically = chronologically.
function cmpISO(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// True if item overlaps the given year.
function itemInYear(item: CalendarItem, year: number): boolean {
  const start = yearOf(item.startDate);
  const end = item.endDate ? yearOf(item.endDate) : start;
  return start <= year && end >= year;
}

interface Row {
  key: string;
  date: string;
  month: number;
  day: number;
  weekday: string;
  label: string;
  kind: 'holiday-federal' | 'holiday-catholic' | 'item' | 'item-range';
  itemId?: string;
}

function buildRows(items: CalendarItem[], holidays: Holiday[], year: number): Row[] {
  const rows: Row[] = [];

  for (const h of holidays) {
    if (yearOf(h.date) !== year) continue;
    rows.push({
      key: `h-${h.kind}-${h.date}-${h.name}`,
      date: h.date,
      month: monthOf(h.date),
      day: dayOf(h.date),
      weekday: weekdayLabel(h.date),
      label: h.name,
      kind: h.kind === 'federal' ? 'holiday-federal' : 'holiday-catholic',
    });
  }

  for (const item of items) {
    if (!itemInYear(item, year)) continue;
    const isRange = item.endDate && item.endDate !== item.startDate;
    const displayDate = item.startDate;
    const label = isRange
      ? `${item.title} (through ${formatShort(item.endDate!)})`
      : item.title;
    rows.push({
      key: `i-${item.id}`,
      date: displayDate,
      month: monthOf(displayDate),
      day: dayOf(displayDate),
      weekday: weekdayLabel(displayDate),
      label,
      kind: isRange ? 'item-range' : 'item',
      itemId: item.id,
    });
  }

  rows.sort((a, b) => cmpISO(a.date, b.date) || a.label.localeCompare(b.label));
  return rows;
}

function formatShort(iso: string): string {
  const m = MONTHS[monthOf(iso) - 1].slice(0, 3);
  return `${m} ${dayOf(iso)}`;
}

export default function CalendarClient() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [showFederal, setShowFederal] = useState(true);
  const [showCatholic, setShowCatholic] = useState(true);

  // Add-item form state
  const [newTitle, setNewTitle] = useState('');
  const [newStart, setNewStart] = useState(todayISO());
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

  const holidays = useMemo(() => getHolidays(year), [year]);
  const filteredHolidays = useMemo(
    () => holidays.filter(h =>
      (h.kind === 'federal' && showFederal) || (h.kind === 'catholic' && showCatholic)
    ),
    [holidays, showFederal, showCatholic],
  );

  const rows = useMemo(
    () => buildRows(items, filteredHolidays, year),
    [items, filteredHolidays, year],
  );

  const rowsByMonth = useMemo(() => {
    const map = new Map<number, Row[]>();
    for (let m = 1; m <= 12; m++) map.set(m, []);
    for (const r of rows) map.get(r.month)!.push(r);
    return map;
  }, [rows]);

  const yearOptions = useMemo(() => {
    const out: number[] = [];
    for (let y = currentYear; y <= currentYear + 10; y++) out.push(y);
    return out;
  }, [currentYear]);

  const today = todayISO();
  const minStart = year === currentYear ? today : `${year}-01-01`;
  const maxEnd = `${year}-12-31`;

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

  // Ensure form start date obeys year + future constraints when year changes
  useEffect(() => {
    if (newStart < minStart) setNewStart(minStart);
    if (newStart > maxEnd) setNewStart(minStart);
  }, [year, minStart, maxEnd, newStart]);

  return (
    <>
      <style>{styles}</style>
      <div className="cal-header">
        <Link href="/" className="home-link">← Home</Link>
        <div className="cal-title">📅 Calendar</div>
        <div className={`save-status save-${saveStatus}`}>
          {saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'saving' ? '… Saving' : '⚠ Error'}
        </div>
      </div>

      <div className="cal-body">
        <div className="cal-controls">
          <label className="control-group">
            <span className="control-label">Year</span>
            <select value={year} onChange={e => setYear(Number(e.target.value))}>
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
              min={minStart}
              max={maxEnd}
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

        {MONTHS.map((name, idx) => {
          const monthNum = idx + 1;
          const monthRows = rowsByMonth.get(monthNum)!;
          if (monthRows.length === 0) return null;
          return (
            <section key={monthNum} className="month-section">
              <h2 className="month-title">{name}</h2>
              <div className="month-rule" />
              <ul className="row-list">
                {monthRows.map(r => (
                  <li key={r.key} className={`row row-${r.kind}`}>
                    <span className="row-date">{r.day} / {r.weekday}</span>
                    <span className="row-label">
                      {r.kind === 'holiday-federal' && <span className="tag tag-federal">Fed</span>}
                      {r.kind === 'holiday-catholic' && <span className="tag tag-catholic">Cath</span>}
                      {r.label}
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
            </section>
          );
        })}

        {rows.length === 0 && loaded && (
          <div className="empty">
            No events yet. {!editMode && 'Tap Edit to add one.'}
          </div>
        )}
      </div>
    </>
  );
}

const styles = `
  .cal-header {
    position: sticky; top: 0; z-index: 50;
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

  .cal-body {
    max-width: 720px; margin: 0 auto; padding: 20px 16px 80px;
  }

  .cal-controls {
    display: flex; flex-wrap: wrap; align-items: center;
    gap: 12px; margin-bottom: 20px;
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
    padding: 12px; background: #eff6ff; border: 1px solid #bfdbfe;
    border-radius: 8px; margin-bottom: 24px;
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

  .month-section { margin-bottom: 28px; }
  .month-title {
    font-size: 1.25rem; font-weight: 600; color: #111827; margin-bottom: 4px;
  }
  .month-rule {
    height: 1px; background: #e5e7eb; margin-bottom: 8px;
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
  .delete-btn {
    background: transparent; border: none; color: #9ca3af;
    cursor: pointer; font-size: 0.9rem; padding: 2px 6px;
  }
  .delete-btn:hover { color: #dc2626; }

  .empty {
    text-align: center; padding: 40px 20px; color: #9ca3af; font-size: 0.9rem;
  }
`;
