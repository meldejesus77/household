'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { marked } from 'marked';

// ── Types ──────────────────────────────────────────────────────────────────────
interface MedData {
  medication?: string;
  fromMedication?: string;
  toMedication?: string;
  fromDose?: string;
  toDose?: string;
  effectiveDate?: string;
  regimen?: string;
}

interface TestData {
  testName?: string;
  result?: string;
  unit?: string;
  referenceRange?: string;
  flag?: string; // "HIGH" | "LOW" | "CRITICAL" | "NORMAL" | freeform
}

type EventData = MedData & TestData;

interface HealthEvent {
  id: string;
  person: string;
  text: string;
  type: 'positive' | 'negative' | 'neutral';
  tag: string;
  data?: EventData | null;
  occurredAt: string;
  createdAt: string;
}

type Person = 'mel' | 'kathy' | 'jo';
type SubTab = 'log' | 'chart' | 'docs';

const PERSONS: { key: Person; label: string }[] = [
  { key: 'mel', label: 'Mel' },
  { key: 'kathy', label: 'Kathy' },
  { key: 'jo', label: 'Jo' },
];

const TAGS = ['illness', 'symptoms', 'exercise', 'medication', 'test', 'appointment', 'other'];

const RANGE_OPTIONS: { label: string; days: number }[] = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '28d', days: 28 },
  { label: '3mo', days: 90 },
  { label: '6mo', days: 180 },
  { label: '9mo', days: 270 },
  { label: '1yr', days: 365 },
];

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #fdf2f8; }

  .health-header {
    position: fixed; top: 0; left: 0; right: 0; height: 48px;
    background: #1a1a1a; color: white; z-index: 200;
    display: flex; align-items: center; gap: 12px; padding: 0 16px;
  }
  .health-header a.home-link {
    color: #ccc; text-decoration: none; font-size: 0.85rem; white-space: nowrap;
    padding: 4px 8px; border-radius: 4px;
  }
  .health-header a.home-link:hover { color: #fff; background: rgba(255,255,255,0.08); }
  .health-header-title {
    font-size: 1rem; font-weight: 700; color: #fbcfe8; white-space: nowrap;
  }

  .health-content {
    padding-top: 48px; max-width: 760px; margin: 0 auto; padding: 48px 1rem 3rem;
  }

  /* Person tabs */
  .person-tabs {
    display: flex; gap: 6px; padding: 12px 0 0;
    border-bottom: 1px solid #fce7f3; margin-bottom: 12px;
  }
  .person-tab {
    border: 1.5px solid #fbcfe8; border-radius: 999px;
    background: white; color: #9d174d; font-size: 0.82rem; font-weight: 600;
    padding: 5px 18px; cursor: pointer; white-space: nowrap;
    transition: background 0.15s, color 0.15s;
  }
  .person-tab:hover { background: #fce7f3; }
  .person-tab.active { background: #db2777; color: white; border-color: #db2777; }

  /* Sub-tabs */
  .sub-tabs {
    display: flex; gap: 4px; margin-bottom: 16px;
  }
  .sub-tab {
    border: 1.5px solid transparent; border-radius: 8px;
    background: transparent; color: #9d174d; font-size: 0.82rem; font-weight: 600;
    padding: 5px 16px; cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }
  .sub-tab:hover { background: #fce7f3; border-color: #fbcfe8; }
  .sub-tab.active { background: #fce7f3; border-color: #fbcfe8; color: #be185d; }

  /* Range pills */
  .range-pills {
    display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 14px;
  }
  .range-pill {
    border: 1.5px solid #fbcfe8; border-radius: 999px;
    background: white; color: #9d174d; font-size: 0.75rem; font-weight: 600;
    padding: 3px 12px; cursor: pointer;
    transition: background 0.15s;
  }
  .range-pill:hover { background: #fce7f3; }
  .range-pill.active { background: #db2777; color: white; border-color: #db2777; }

  /* Add event form */
  .add-event-area {
    background: white; border: 1.5px solid #fbcfe8; border-radius: 12px;
    padding: 12px 14px; margin-bottom: 14px;
  }
  .add-event-row1 {
    display: flex; gap: 8px; align-items: center; margin-bottom: 8px;
  }
  .add-event-input {
    flex: 1; border: none; outline: none; font-size: 0.95rem;
    background: transparent; color: #1a1a1a; min-width: 0;
  }
  .add-event-input::placeholder { color: #f9a8d4; }
  .add-event-submit {
    background: #db2777; color: white; border: none; cursor: pointer;
    font-size: 0.8rem; font-weight: 600; padding: 6px 14px;
    border-radius: 8px; white-space: nowrap;
    transition: background 0.15s;
  }
  .add-event-submit:hover:not(:disabled) { background: #be185d; }
  .add-event-submit:disabled { opacity: 0.55; cursor: default; }
  .add-event-row2 {
    display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
  }
  .type-btn {
    border: 1.5px solid #e5e7eb; border-radius: 8px;
    background: white; font-size: 0.78rem; font-weight: 600;
    padding: 4px 12px; cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .type-btn:hover { border-color: #d1d5db; background: #f9fafb; }
  .type-btn.positive.active { background: #dcfce7; border-color: #86efac; color: #166534; }
  .type-btn.negative.active { background: #fee2e2; border-color: #fca5a5; color: #991b1b; }
  .type-btn.neutral.active { background: #f3f4f6; border-color: #d1d5db; color: #374151; }
  .tag-select {
    border: 1.5px solid #fbcfe8; border-radius: 8px;
    background: white; color: #9d174d; font-size: 0.78rem; font-weight: 600;
    padding: 4px 10px; cursor: pointer; outline: none;
  }
  .tag-select:focus { border-color: #ec4899; }

  /* Medication sub-form */
  .med-form {
    margin-top: 10px; padding: 10px 12px;
    background: #fdf2f8; border: 1.5px dashed #fbcfe8; border-radius: 8px;
    display: flex; flex-direction: column; gap: 8px;
  }
  .med-form-row {
    display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
  }
  .med-input {
    border: 1.5px solid #fbcfe8; border-radius: 6px; background: white;
    padding: 4px 8px; font-size: 0.82rem; color: #1a1a1a; outline: none;
    min-width: 0;
  }
  .med-input:focus { border-color: #ec4899; }
  .med-input.med-name { flex: 1; min-width: 140px; }
  .med-input.med-dose { width: 90px; }
  .med-input.med-date { width: 140px; }
  .med-label {
    font-size: 0.72rem; color: #9d174d; font-weight: 600;
  }
  .med-switch-toggle {
    background: none; border: none; color: #db2777; font-size: 0.72rem;
    font-weight: 600; cursor: pointer; padding: 2px 4px; text-decoration: underline;
  }
  .med-switch-toggle:hover { color: #9d174d; }

  /* Medication chip on event rows */
  .event-med-chip {
    display: inline-block; margin-top: 4px;
    font-size: 0.7rem; font-weight: 600; padding: 2px 8px; border-radius: 999px;
    background: #fdf2f8; color: #9d174d; border: 1px solid #fbcfe8;
  }

  /* Export + clear-all buttons */
  .export-btn {
    background: white; border: 1.5px solid #fbcfe8; color: #9d174d;
    font-size: 0.75rem; font-weight: 600; padding: 4px 12px; border-radius: 8px;
    cursor: pointer; margin-left: auto;
    transition: background 0.15s;
  }
  .export-btn:hover { background: #fce7f3; }
  .clear-all-btn {
    background: white; border: 1.5px solid #fecaca; color: #b91c1c;
    font-size: 0.75rem; font-weight: 600; padding: 4px 12px; border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .clear-all-btn:hover { background: #fee2e2; }

  /* Event date field on add form */
  .event-date-input {
    border: 1.5px solid #fbcfe8; border-radius: 8px; background: white;
    color: #9d174d; font-size: 0.78rem; font-weight: 600;
    padding: 4px 10px; outline: none;
  }
  .event-date-input:focus { border-color: #ec4899; }

  /* Group headers in events list */
  .events-day-header {
    font-size: 0.75rem; font-weight: 700; color: #9d174d;
    margin: 14px 0 6px 4px; text-transform: uppercase; letter-spacing: 0.03em;
  }
  .events-day-header:first-child { margin-top: 0; }

  /* Per-row delete */
  .event-delete-btn {
    background: none; border: none; color: #d1d5db; cursor: pointer;
    font-size: 0.9rem; padding: 2px 6px; border-radius: 4px;
    transition: color 0.15s, background 0.15s;
  }
  .event-delete-btn:hover { color: #b91c1c; background: #fee2e2; }

  /* Events list */
  .events-list { display: flex; flex-direction: column; gap: 7px; }
  .event-row {
    display: flex; align-items: flex-start; gap: 10px;
    background: white; border: 1.5px solid #fce7f3; border-radius: 10px;
    padding: 10px 12px;
  }
  .event-dot {
    width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; margin-top: 4px;
  }
  .event-dot.positive { background: #22c55e; }
  .event-dot.negative { background: #ef4444; }
  .event-dot.neutral { background: #9ca3af; }
  .event-text { flex: 1; font-size: 0.9rem; color: #1a1a1a; word-break: break-word; min-width: 0; }
  .event-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
  .event-tag {
    font-size: 0.7rem; font-weight: 600; padding: 2px 8px; border-radius: 999px;
    background: #fce7f3; color: #9d174d; text-transform: capitalize;
  }
  .event-date { font-size: 0.72rem; color: #9ca3af; white-space: nowrap; }

  .empty-state {
    text-align: center; color: #f9a8d4; font-size: 0.9rem; padding: 32px 0;
  }

  /* Chart */
  .chart-wrap {
    overflow-x: auto; padding-bottom: 8px;
  }
  .chart-grid {
    display: flex; gap: 3px; flex-wrap: wrap; align-content: flex-start;
  }
  .chart-week-col {
    display: flex; flex-direction: column; gap: 3px;
  }
  .day-cell {
    width: 24px; height: 24px; border-radius: 4px;
    background: #f3f4f6; display: flex; align-items: center; justify-content: center;
    flex-wrap: wrap; gap: 2px; cursor: default; position: relative;
    padding: 2px;
    transition: border-color 0.1s;
    border: 1.5px solid transparent;
  }
  .day-cell:hover { border-color: #db2777; }
  .day-cell.has-events { background: #fff; border-color: #fce7f3; }
  .event-mini-dot {
    width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
  }
  .event-mini-dot.positive { background: #22c55e; }
  .event-mini-dot.negative { background: #ef4444; }
  .event-mini-dot.neutral { background: #9ca3af; }
  .overflow-count {
    font-size: 6px; font-weight: 700; color: #9d174d; line-height: 1;
  }

  /* Chart month labels */
  .chart-outer {
    display: flex; flex-direction: column; gap: 4px;
  }
  .chart-month-row {
    display: flex; gap: 3px; min-height: 14px;
  }
  .chart-month-label {
    font-size: 0.65rem; color: #9ca3af; font-weight: 600;
    width: 24px; text-align: center; flex-shrink: 0;
  }
  .day-date-label {
    font-size: 0.6rem; color: #9ca3af; text-align: center; margin-top: 2px; white-space: nowrap;
  }

  /* Tooltip */
  .cell-tooltip {
    position: absolute; bottom: calc(100% + 5px); left: 50%; transform: translateX(-50%);
    background: #1a1a1a; color: white; border-radius: 7px;
    padding: 6px 10px; min-width: 150px; max-width: 220px;
    z-index: 400; pointer-events: none;
    box-shadow: 0 4px 14px rgba(0,0,0,0.3);
    white-space: nowrap;
  }
  .cell-tooltip::after {
    content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
    border: 5px solid transparent; border-top-color: #1a1a1a;
  }
  .tooltip-date { font-size: 0.68rem; font-weight: 700; color: #fbcfe8; margin-bottom: 4px; }
  .tooltip-event { font-size: 0.7rem; color: #e5e7eb; padding: 1px 0; display: flex; align-items: center; gap: 5px; }
  .tooltip-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

  /* Docs */
  .doc-list { display: flex; flex-direction: column; gap: 8px; }
  .doc-card {
    background: white; border: 1.5px solid #fce7f3; border-radius: 10px;
    padding: 11px 14px; cursor: pointer; font-size: 0.88rem; color: #9d174d; font-weight: 600;
    transition: background 0.15s, border-color 0.15s;
    display: flex; align-items: center; gap: 8px;
  }
  .doc-card:hover { background: #fce7f3; border-color: #fbcfe8; }
  .doc-back-btn {
    background: #fce7f3; border: 1.5px solid #fbcfe8; color: #9d174d;
    font-size: 0.8rem; font-weight: 600; padding: 6px 14px; border-radius: 8px;
    cursor: pointer; margin-bottom: 12px;
    transition: background 0.15s;
  }
  .doc-back-btn:hover { background: #fbcfe8; }
  .doc-content-wrap {
    background: white; border: 1.5px solid #fce7f3; border-radius: 12px;
    padding: 20px 22px; overflow-y: auto; max-height: 70vh;
  }
  .doc-content-wrap h1 { font-size: 1.3rem; color: #9d174d; margin-bottom: 10px; }
  .doc-content-wrap h2 { font-size: 1.1rem; color: #be185d; margin: 14px 0 6px; }
  .doc-content-wrap h3 { font-size: 0.95rem; color: #db2777; margin: 10px 0 4px; }
  .doc-content-wrap p { font-size: 0.88rem; color: #374151; line-height: 1.6; margin-bottom: 8px; }
  .doc-content-wrap ul, .doc-content-wrap ol { padding-left: 20px; margin-bottom: 8px; }
  .doc-content-wrap li { font-size: 0.88rem; color: #374151; line-height: 1.6; }
  .doc-content-wrap code { background: #f3f4f6; padding: 1px 5px; border-radius: 4px; font-size: 0.83rem; }
  .doc-content-wrap pre { background: #f3f4f6; padding: 12px; border-radius: 8px; overflow-x: auto; margin-bottom: 8px; }
  .doc-note {
    font-size: 0.75rem; color: #9ca3af; margin-top: 16px; padding: 10px 12px;
    background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;
  }
`;

// ── Helpers ────────────────────────────────────────────────────────────────────
function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function generateDateRange(days: number): Date[] {
  const dates: Date[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    dates.push(d);
  }
  return dates;
}

const TYPE_COLORS: Record<string, string> = {
  positive: '#22c55e',
  negative: '#ef4444',
  neutral: '#9ca3af',
};

// ── Sub-components ─────────────────────────────────────────────────────────────
function ChartCell({ date, events }: { date: Date; events: HealthEvent[] }) {
  const [hovered, setHovered] = useState(false);
  const visible = events.slice(0, 3);
  const overflow = events.length - 3;

  return (
    <div
      className={`day-cell${events.length > 0 ? ' has-events' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {visible.map((e) => (
        <span key={e.id} className={`event-mini-dot ${e.type}`} />
      ))}
      {overflow > 0 && <span className="overflow-count">+{overflow}</span>}
      {hovered && events.length > 0 && (
        <div className="cell-tooltip">
          <div className="tooltip-date">
            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          {events.map((e) => (
            <div key={e.id} className="tooltip-event">
              <span className="tooltip-dot" style={{ background: TYPE_COLORS[e.type] }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function HealthClient() {
  const [person, setPerson] = useState<Person>('mel');
  const [subTab, setSubTab] = useState<SubTab>('log');
  const [days, setDays] = useState(7);
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const [docs, setDocs] = useState<string[]>([]);
  const [activeDoc, setActiveDoc] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<string | null>(null);
  const [newText, setNewText] = useState('');
  const [newType, setNewType] = useState<'positive' | 'negative' | 'neutral'>('positive');
  const [newTag, setNewTag] = useState('other');
  const [newOccurredOn, setNewOccurredOn] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(false);
  // Medication sub-form state
  const [medIsSwitch, setMedIsSwitch] = useState(false);
  const [medName, setMedName] = useState('');
  const [medFromName, setMedFromName] = useState('');
  const [medToName, setMedToName] = useState('');
  const [medFromDose, setMedFromDose] = useState('');
  const [medToDose, setMedToDose] = useState('');
  const [medEffectiveDate, setMedEffectiveDate] = useState('');
  // Test sub-form state
  const [testName, setTestName] = useState('');
  const [testResult, setTestResult] = useState('');
  const [testUnit, setTestUnit] = useState('');
  const [testRange, setTestRange] = useState('');
  const [testFlag, setTestFlag] = useState('');

  // Load events
  const loadEvents = useCallback(() => {
    fetch(`/api/health/events?person=${person}&days=${days}`)
      .then(r => r.json())
      .then((data) => {
        if (Array.isArray(data)) setEvents(data);
      })
      .catch(() => {});
  }, [person, days]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Load docs
  const loadDocs = useCallback(() => {
    fetch(`/api/health/docs?person=${person}`)
      .then(r => r.json())
      .then((data) => {
        if (Array.isArray(data)) setDocs(data);
      })
      .catch(() => {});
  }, [person]);

  useEffect(() => {
    if (subTab === 'docs') loadDocs();
  }, [subTab, loadDocs]);

  // Reset doc view when person changes
  useEffect(() => {
    setActiveDoc(null);
    setDocContent(null);
  }, [person]);

  // Known meds for autocomplete (from prior events' structured data)
  const knownMeds = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) {
      const d = e.data;
      if (!d) continue;
      if (d.medication) set.add(d.medication);
      if (d.fromMedication) set.add(d.fromMedication);
      if (d.toMedication) set.add(d.toMedication);
    }
    return Array.from(set).sort();
  }, [events]);

  function buildEventData(): EventData | null {
    const trim = (s: string) => s.trim() || undefined;
    if (newTag === 'medication') {
      const d: MedData = {};
      if (medIsSwitch) {
        d.fromMedication = trim(medFromName);
        d.toMedication = trim(medToName);
        d.fromDose = trim(medFromDose);
        d.toDose = trim(medToDose);
      } else {
        d.medication = trim(medName);
        d.fromDose = trim(medFromDose);
        d.toDose = trim(medToDose);
      }
      d.effectiveDate = trim(medEffectiveDate);
      const hasAny = Object.values(d).some((v) => v !== undefined);
      return hasAny ? d : null;
    }
    if (newTag === 'test') {
      const d: TestData = {
        testName: trim(testName),
        result: trim(testResult),
        unit: trim(testUnit),
        referenceRange: trim(testRange),
        flag: trim(testFlag),
      };
      const hasAny = Object.values(d).some((v) => v !== undefined);
      return hasAny ? d : null;
    }
    return null;
  }

  function resetSubForms() {
    setMedIsSwitch(false);
    setMedName('');
    setMedFromName('');
    setMedToName('');
    setMedFromDose('');
    setMedToDose('');
    setMedEffectiveDate('');
    setTestName('');
    setTestResult('');
    setTestUnit('');
    setTestRange('');
    setTestFlag('');
  }

  // Add event
  async function addEvent() {
    const text = newText.trim();
    if (!text) return;
    setSaving(true);
    const data = buildEventData();
    // Parse yyyy-mm-dd as local noon to avoid TZ-boundary shifts.
    const occurredAt = newOccurredOn
      ? new Date(`${newOccurredOn}T12:00:00`).toISOString()
      : undefined;
    try {
      await fetch('/api/health/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person, text, type: newType, tag: newTag, data, occurredAt }),
      });
      setNewText('');
      resetSubForms();
      // Keep the occurred date sticky in case they're logging several past events in a row.
      loadEvents();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent(id: string, text: string) {
    if (!confirm(`Delete this event?\n\n"${text}"`)) return;
    try {
      await fetch(`/api/health/events?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      loadEvents();
    } catch {
      // ignore
    }
  }

  async function clearAllForPerson() {
    if (!confirm(`Delete ALL ${events.length} events shown for ${person}?\n\nThis cannot be undone.`)) return;
    if (!confirm(`Are you sure? This will permanently delete every event for ${person}, not just those in this date range.`)) return;
    try {
      await fetch(`/api/health/events?person=${encodeURIComponent(person)}&all=1`, { method: 'DELETE' });
      loadEvents();
    } catch {
      // ignore
    }
  }

  function exportEvents() {
    const payload = {
      person,
      exportedAt: new Date().toISOString(),
      rangeDays: days,
      events,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${dateStr}_${person}_health-events_${days}d.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function formatEventChip(d: EventData): { icon: string; text: string } | null {
    // Medication summary
    if (d.fromMedication || d.toMedication) {
      const from = [d.fromMedication, d.fromDose].filter(Boolean).join(' ');
      const to = [d.toMedication, d.toDose].filter(Boolean).join(' ');
      return { icon: '💊', text: `${from || '?'} → ${to || '?'}` };
    }
    if (d.medication) {
      if (d.fromDose && d.toDose) return { icon: '💊', text: `${d.medication} ${d.fromDose} → ${d.toDose}` };
      if (d.toDose) return { icon: '💊', text: `${d.medication} ${d.toDose}` };
      return { icon: '💊', text: d.medication };
    }
    // Test summary
    if (d.testName || d.result) {
      const parts: string[] = [];
      if (d.testName) parts.push(d.testName);
      if (d.result) parts.push(`= ${d.result}${d.unit ? ' ' + d.unit : ''}`);
      if (d.referenceRange) parts.push(`(ref ${d.referenceRange})`);
      if (d.flag) parts.push(`[${d.flag}]`);
      return { icon: '🧪', text: parts.join(' ') };
    }
    return null;
  }

  function formatOccurredDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  // Group events by occurred yyyy-mm-dd (events are already sorted desc by API)
  const eventsByDay: { key: string; iso: string; items: HealthEvent[] }[] = useMemo(() => {
    const groups = new Map<string, HealthEvent[]>();
    for (const e of events) {
      const key = toDateKey(new Date(e.occurredAt));
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(e);
    }
    return Array.from(groups.entries()).map(([key, items]) => ({
      key,
      iso: items[0].occurredAt,
      items,
    }));
  }, [events]);

  // View doc
  async function viewDoc(file: string) {
    setLoadingDoc(true);
    setActiveDoc(file);
    setDocContent(null);
    try {
      const r = await fetch(`/api/health/docs/content?person=${person}&file=${encodeURIComponent(file)}`);
      const data = await r.json();
      setDocContent(data.content ?? null);
    } catch {
      setDocContent(null);
    } finally {
      setLoadingDoc(false);
    }
  }

  // Chart data
  const dateRange = generateDateRange(days);
  const eventsByDate: Record<string, HealthEvent[]> = {};
  for (const e of events) {
    const key = toDateKey(new Date(e.occurredAt));
    if (!eventsByDate[key]) eventsByDate[key] = [];
    eventsByDate[key].push(e);
  }

  // Group dates by week (columns of 7)
  const weeks: Date[][] = [];
  for (let i = 0; i < dateRange.length; i += 7) {
    weeks.push(dateRange.slice(i, i + 7));
  }

  return (
    <>
      <style>{styles}</style>

      {/* Header */}
      <header className="health-header">
        <Link href="/" className="home-link">&#8592; Home</Link>
        <span className="health-header-title">Health</span>
      </header>

      <main className="health-content">

        {/* Person tabs */}
        <div className="person-tabs">
          {PERSONS.map(p => (
            <button
              key={p.key}
              className={`person-tab${person === p.key ? ' active' : ''}`}
              onClick={() => setPerson(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Sub-tabs */}
        <div className="sub-tabs">
          {(['log', 'chart', 'docs'] as SubTab[]).map(t => (
            <button
              key={t}
              className={`sub-tab${subTab === t ? ' active' : ''}`}
              onClick={() => setSubTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Log tab ── */}
        {subTab === 'log' && (
          <>
            {/* Add event form */}
            <div className="add-event-area">
              <div className="add-event-row1">
                <input
                  className="add-event-input"
                  placeholder="Describe health event…"
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addEvent(); }}
                />
                <button
                  className="add-event-submit"
                  onClick={addEvent}
                  disabled={saving || !newText.trim()}
                >
                  {saving ? 'Saving…' : 'Add'}
                </button>
              </div>
              <div className="add-event-row2">
                {(['positive', 'negative', 'neutral'] as const).map(t => (
                  <button
                    key={t}
                    className={`type-btn ${t}${newType === t ? ' active' : ''}`}
                    onClick={() => setNewType(t)}
                  >
                    {t === 'positive' ? '🟢 Positive' : t === 'negative' ? '🔴 Negative' : '⬜ Neutral'}
                  </button>
                ))}
                <select
                  className="tag-select"
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                >
                  {TAGS.map(tag => (
                    <option key={tag} value={tag}>
                      {tag.charAt(0).toUpperCase() + tag.slice(1)}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  className="event-date-input"
                  value={newOccurredOn}
                  onChange={e => setNewOccurredOn(e.target.value)}
                  title="Date the event occurred"
                />
              </div>

              {newTag === 'medication' && (
                <div className="med-form">
                  <datalist id="known-meds">
                    {knownMeds.map(m => <option key={m} value={m} />)}
                  </datalist>
                  {!medIsSwitch ? (
                    <div className="med-form-row">
                      <span className="med-label">Med</span>
                      <input
                        className="med-input med-name"
                        list="known-meds"
                        placeholder="e.g. Armour"
                        value={medName}
                        onChange={e => setMedName(e.target.value)}
                      />
                      <span className="med-label">Dose</span>
                      <input
                        className="med-input med-dose"
                        placeholder="from"
                        value={medFromDose}
                        onChange={e => setMedFromDose(e.target.value)}
                      />
                      <span className="med-label">→</span>
                      <input
                        className="med-input med-dose"
                        placeholder="to (or blank)"
                        value={medToDose}
                        onChange={e => setMedToDose(e.target.value)}
                      />
                      <button
                        type="button"
                        className="med-switch-toggle"
                        onClick={() => setMedIsSwitch(true)}
                      >
                        switch meds instead
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="med-form-row">
                        <span className="med-label">From</span>
                        <input
                          className="med-input med-name"
                          list="known-meds"
                          placeholder="e.g. Armour"
                          value={medFromName}
                          onChange={e => setMedFromName(e.target.value)}
                        />
                        <input
                          className="med-input med-dose"
                          placeholder="dose"
                          value={medFromDose}
                          onChange={e => setMedFromDose(e.target.value)}
                        />
                      </div>
                      <div className="med-form-row">
                        <span className="med-label">To</span>
                        <input
                          className="med-input med-name"
                          list="known-meds"
                          placeholder="e.g. levothyroxine"
                          value={medToName}
                          onChange={e => setMedToName(e.target.value)}
                        />
                        <input
                          className="med-input med-dose"
                          placeholder="dose"
                          value={medToDose}
                          onChange={e => setMedToDose(e.target.value)}
                        />
                        <button
                          type="button"
                          className="med-switch-toggle"
                          onClick={() => setMedIsSwitch(false)}
                        >
                          same med, dose change
                        </button>
                      </div>
                    </>
                  )}
                  <div className="med-form-row">
                    <span className="med-label">Effective</span>
                    <input
                      type="date"
                      className="med-input med-date"
                      value={medEffectiveDate}
                      onChange={e => setMedEffectiveDate(e.target.value)}
                    />
                    <span className="med-label" style={{ opacity: 0.7 }}>
                      Freeform regimen (e.g. eye drops AM + PM) goes in the main text field.
                    </span>
                  </div>
                </div>
              )}

              {newTag === 'test' && (
                <div className="med-form">
                  <div className="med-form-row">
                    <span className="med-label">Test</span>
                    <input
                      className="med-input med-name"
                      placeholder="e.g. Free T3, Vitamin D, TSH"
                      value={testName}
                      onChange={e => setTestName(e.target.value)}
                    />
                    <span className="med-label">Result</span>
                    <input
                      className="med-input med-dose"
                      placeholder="value"
                      value={testResult}
                      onChange={e => setTestResult(e.target.value)}
                    />
                    <input
                      className="med-input med-dose"
                      placeholder="unit"
                      value={testUnit}
                      onChange={e => setTestUnit(e.target.value)}
                    />
                  </div>
                  <div className="med-form-row">
                    <span className="med-label">Range</span>
                    <input
                      className="med-input med-name"
                      placeholder="e.g. 2.3–4.3"
                      value={testRange}
                      onChange={e => setTestRange(e.target.value)}
                    />
                    <span className="med-label">Flag</span>
                    <select
                      className="med-input med-dose"
                      value={testFlag}
                      onChange={e => setTestFlag(e.target.value)}
                    >
                      <option value="">—</option>
                      <option value="HIGH">HIGH</option>
                      <option value="LOW">LOW</option>
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="NORMAL">NORMAL</option>
                    </select>
                    <span className="med-label" style={{ opacity: 0.7 }}>
                      Notes (context, prior value, etc.) go in the main text field.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Range pills + export + clear-all */}
            <div className="range-pills">
              {RANGE_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  className={`range-pill${days === opt.days ? ' active' : ''}`}
                  onClick={() => setDays(opt.days)}
                >
                  {opt.label}
                </button>
              ))}
              <button
                className="export-btn"
                onClick={exportEvents}
                disabled={events.length === 0}
                title="Download events for the selected range as JSON"
              >
                Export JSON
              </button>
              <button
                className="clear-all-btn"
                onClick={clearAllForPerson}
                disabled={events.length === 0}
                title={`Delete every event for ${person} (not just those shown)`}
              >
                Clear all
              </button>
            </div>

            {/* Events list, grouped by occurred date */}
            <div className="events-list">
              {events.length === 0 ? (
                <div className="empty-state">No events logged in this period.</div>
              ) : (
                eventsByDay.map(group => (
                  <div key={group.key}>
                    <div className="events-day-header">{formatOccurredDate(group.iso)}</div>
                    {group.items.map(e => {
                      const chip = e.data ? formatEventChip(e.data) : null;
                      return (
                        <div key={e.id} className="event-row" style={{ marginBottom: 6 }}>
                          <span className={`event-dot ${e.type}`} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="event-text">{e.text}</div>
                            {chip && (
                              <span className="event-med-chip">{chip.icon} {chip.text}</span>
                            )}
                          </div>
                          <div className="event-meta">
                            <span className="event-tag">{e.tag}</span>
                          </div>
                          <button
                            className="event-delete-btn"
                            onClick={() => deleteEvent(e.id, e.text)}
                            title="Delete event"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ── Chart tab ── */}
        {subTab === 'chart' && (
          <>
            {/* Range pills */}
            <div className="range-pills">
              {RANGE_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  className={`range-pill${days === opt.days ? ' active' : ''}`}
                  onClick={() => setDays(opt.days)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              {[['positive', '#22c55e', 'Positive'], ['negative', '#ef4444', 'Negative'], ['neutral', '#9ca3af', 'Neutral']].map(([, color, label]) => (
                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#6b7280' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                  {label}
                </span>
              ))}
              <span style={{ fontSize: '0.72rem', color: '#9ca3af', marginLeft: 'auto' }}>Hover cells for details</span>
            </div>

            {/* Dot calendar */}
            <div className="chart-wrap">
              <div style={{ display: 'flex', gap: 3 }}>
                {weeks.map((week, wi) => (
                  <div key={wi} className="chart-week-col">
                    {week.map((date) => {
                      const key = toDateKey(date);
                      const dayEvents = eventsByDate[key] ?? [];
                      return (
                        <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <ChartCell date={date} events={dayEvents} />
                          {/* Show date label on first day of week or at start of each month */}
                          {(date.getDate() === 1 || date.getDay() === 0) && (
                            <div className="day-date-label">
                              {date.getDate() === 1
                                ? date.toLocaleDateString('en-US', { month: 'short' })
                                : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {events.length === 0 && (
              <div className="empty-state" style={{ marginTop: 20 }}>
                No events in this period. Log some events in the Log tab.
              </div>
            )}
          </>
        )}

        {/* ── Docs tab ── */}
        {subTab === 'docs' && (
          <>
            {activeDoc ? (
              <>
                <button className="doc-back-btn" onClick={() => { setActiveDoc(null); setDocContent(null); }}>
                  &#8592; Back to files
                </button>
                <div className="doc-content-wrap">
                  {loadingDoc && <div style={{ color: '#9ca3af', fontSize: '0.88rem' }}>Loading…</div>}
                  {!loadingDoc && docContent === null && (
                    <div style={{ color: '#ef4444', fontSize: '0.88rem' }}>Could not load file.</div>
                  )}
                  {!loadingDoc && docContent !== null && (
                    <div dangerouslySetInnerHTML={{ __html: marked(docContent) as string }} />
                  )}
                </div>
              </>
            ) : (
              <>
                {docs.length === 0 ? (
                  <div className="empty-state">No documents found.</div>
                ) : (
                  <div className="doc-list">
                    {docs.map(file => (
                      <button key={file} className="doc-card" onClick={() => viewDoc(file)}>
                        <span style={{ fontSize: '1rem' }}>📄</span>
                        {file}
                      </button>
                    ))}
                  </div>
                )}
                <div className="doc-note">
                  Add markdown files to <code>public/health/{person}/</code> in the repo to see them here.
                </div>
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
