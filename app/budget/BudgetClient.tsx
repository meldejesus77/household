'use client';

import { useState, useEffect } from 'react';

// ---------------------------------------------------------------------------
// DEFAULTS: all values are monthly amounts
// ---------------------------------------------------------------------------
const DEFAULTS: Record<string, number> = {
  // Jo Education
  'college-fund': 500,
  'immaculata': 999,
  'fees': 133.33,
  'camps': 291.67,
  // Fina Activities
  'gym': 115,
  'jiu-jitsu': 84,
  'swim': 115,
  'violin': 160,
  // 'hooked-on-phonics': null — omitted intentionally
  // Health
  'mel-doc': 50,
  'mel-yoga': 60,
  'kp-yoga': 80,
  'kp-doc': 16.67,
  'jo-doc': 8.33,
  'roscoe-doc': 69.33,
  'fitness': 110,
  'haircuts': 17.50,
  'massage': 33.33,
  // Grocery
  'target': 900,
  'harris-teeter': 350,
  'whole-foods': 150,
  'co-op': 20,
  // Financial
  'ira': 1166.67,
  'mel-life': 120,
  'kp-life': 30,
  'taxes': 100,
  // Subscriptions — Memberships
  'target-mem': 8.25,
  'amazon-prime': 12.50,
  'museum-lifesci': 15.42,
  'flowers-csa': 11.67,
  // Subscriptions — Streaming & Media
  'amazon-music': 14.08,
  'audible': 15,
  'kindle-comics': 5,
  'kindle-unlimited': 12,
  'streaming': 45,
  // Subscriptions — Apps & Software
  'claude': 19.99,
  'onepassword': 6.99,
  'apple-arcade': 5,
  'strum-machine': 5,
  // 'simply-piano': null — omitted intentionally
  'chess': 0,
  'amazon-photo': 1.67,
  // Subscriptions — Giving
  'immaculate-heart': 60,
  // House & Car
  'prop-tax-416': 375,
  'insurance-416': 104.42,
  'prop-tax-104': 177,
  'state-farm': 190,
  'gas-416': 20,
  'internet-416': 80,
  'electric-416': 200,
  'water-416': 50,
  'adt': 60,
  'gutters-104': 41.67,
  'gutters-416': 25,
  'kp-cell': 68,
  'car-maintenance': 41.67,
  'car-reg': 16.67,
  'parking': 33.33,
  'ani-rebecca': 392,
  'home-depot': 75,
  // Shopping
  'art': 40,
  'entertainment': 65,
  'books': 35,
  'amazon-shop': 400,
  'tools': 40,
  'clothes': 30,
  'fina-acc': 20,
  'abc': 30,
  'convenience': 40,
  // Unique Expenses
  'travel': 250,
  'gifts': 250,
  // Income
  'kp-salary': 3900,
  'mel-salary': 3758.33,
  'edgewood': 1100,
  'fsa': 400,
  'cruz': 1100,
};

// IDs that are null/missing (show "—" in view, 0 in edit input)
const NULL_IDS = new Set(['hooked-on-phonics', 'simply-piano']);

// ---------------------------------------------------------------------------
// PROFILES — add new entries here to support more budget views
// ---------------------------------------------------------------------------
const PROFILES = [
  { id: 'day-to-day',  label: 'Day-to-Day',  description: 'Current household budget' },
  { id: 'retirement',  label: 'Retirement',   description: 'Projected retirement budget' },
] as const;
type ProfileId = typeof PROFILES[number]['id'];

interface Snapshot {
  title: string;
  rationale: string;
  timestamp: string;
  values: Record<string, number>;
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function BudgetClient() {
  const [activeProfile, setActiveProfile] = useState<ProfileId>('day-to-day');
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalRationale, setModalRationale] = useState('');
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

  // Load snapshots from API whenever the active profile changes
  useEffect(() => {
    fetch(`/api/budget/${activeProfile}`)
      .then(r => r.json())
      .then((data: Snapshot[] | null) => {
        setSnapshots(Array.isArray(data) ? data : []);
      })
      .catch(() => { setSnapshots([]); });
    setOverrides({});
    setMode('view');
  }, [activeProfile]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function getValue(id: string): number | null {
    if (NULL_IDS.has(id)) {
      if (id in overrides) return overrides[id];
      return null;
    }
    if (id in overrides) return overrides[id];
    return DEFAULTS[id] ?? null;
  }

  function getEditValue(id: string): number {
    const v = getValue(id);
    return v ?? 0;
  }

  function setItem(id: string, val: number) {
    setOverrides(prev => ({ ...prev, [id]: val }));
  }

  function sectionTotal(ids: string[]): number {
    return ids.reduce((sum, id) => sum + (getValue(id) ?? 0), 0);
  }

  // ---------------------------------------------------------------------------
  // Section ID lists
  // ---------------------------------------------------------------------------
  const educationIds = ['college-fund', 'immaculata', 'fees', 'camps'];
  const finaIds = ['gym', 'jiu-jitsu', 'swim', 'violin', 'hooked-on-phonics'];
  const healthIds = ['mel-doc', 'mel-yoga', 'kp-yoga', 'kp-doc', 'jo-doc', 'roscoe-doc', 'fitness', 'haircuts', 'massage'];
  const groceryIds = ['target', 'harris-teeter', 'whole-foods', 'co-op'];
  const financialIds = ['ira', 'mel-life', 'kp-life', 'taxes'];
  const subMembIds = ['target-mem', 'amazon-prime', 'museum-lifesci', 'flowers-csa'];
  const subStreamIds = ['amazon-music', 'audible', 'kindle-comics', 'kindle-unlimited', 'streaming'];
  const subAppsIds = ['claude', 'onepassword', 'apple-arcade', 'strum-machine', 'simply-piano', 'chess', 'amazon-photo'];
  const subGivingIds = ['immaculate-heart'];
  const subscriptionsIds = [...subMembIds, ...subStreamIds, ...subAppsIds, ...subGivingIds];
  const housecarIds = ['prop-tax-416', 'insurance-416', 'prop-tax-104', 'state-farm', 'gas-416', 'internet-416', 'electric-416', 'water-416', 'adt', 'gutters-104', 'gutters-416', 'kp-cell', 'car-maintenance', 'car-reg', 'parking', 'ani-rebecca', 'home-depot'];
  const shoppingIds = ['art', 'entertainment', 'books', 'amazon-shop', 'tools', 'clothes', 'fina-acc', 'abc', 'convenience'];
  const uniqueIds = ['travel', 'gifts'];
  const incomeIds = ['kp-salary', 'mel-salary', 'edgewood', 'fsa', 'cruz'];

  const expenseSections: { label: string; ids: string[] }[] = [
    { label: 'Jo Education', ids: educationIds },
    { label: 'Fina Activities', ids: finaIds },
    { label: 'Health', ids: healthIds },
    { label: 'Grocery', ids: groceryIds },
    { label: 'Financial', ids: financialIds },
    { label: 'Subscriptions', ids: subscriptionsIds },
    { label: 'House & Car', ids: housecarIds },
    { label: 'Shopping', ids: shoppingIds },
    { label: 'Unique Expenses', ids: uniqueIds },
  ];

  const totalExpenses = expenseSections.reduce((sum, s) => sum + sectionTotal(s.ids), 0);
  const totalIncome = sectionTotal(incomeIds);
  const gap = totalIncome - totalExpenses;

  // ---------------------------------------------------------------------------
  // Edit cell renderer
  // ---------------------------------------------------------------------------
  function AmountCell({ id, className }: { id: string; className?: string }) {
    const val = getValue(id);
    if (mode === 'view') {
      if (val === null) return <td className={`amount monthly missing ${className ?? ''}`}>—</td>;
      return <td className={`amount monthly ${className ?? ''}`}>${fmt(val)}</td>;
    }
    // edit mode
    return (
      <td className={`amount monthly ${className ?? ''}`} style={{ padding: '0.2rem 1rem' }}>
        <input
          type="number"
          step="0.01"
          value={getEditValue(id)}
          onChange={e => setItem(id, parseFloat(e.target.value) || 0)}
          className="amount-input"
        />
      </td>
    );
  }

  function AnnualCell({ id, className }: { id: string; className?: string }) {
    const val = getValue(id);
    if (val === null) return <td className={`amount missing ${className ?? ''}`}>—</td>;
    return <td className={`amount ${className ?? ''}`}>${fmt(val * 12)}</td>;
  }

  // ---------------------------------------------------------------------------
  // Snapshot actions
  // ---------------------------------------------------------------------------
  async function saveSnapshot() {
    if (!modalTitle.trim()) return;
    const snap: Snapshot = {
      title: modalTitle.trim(),
      rationale: modalRationale.trim(),
      timestamp: new Date().toISOString(),
      values: { ...overrides },
    };
    const next = [snap, ...snapshots];
    setSnapshots(next);
    setShowModal(false);
    setModalTitle('');
    setModalRationale('');
    // Save to API
    await fetch(`/api/budget/${activeProfile}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    }).catch(() => {});
  }

  function restoreSnapshot(snap: Snapshot) {
    setOverrides(snap.values);
    setMode('edit');
  }

  async function deleteSnapshot(idx: number) {
    const next = snapshots.filter((_, i) => i !== idx);
    setSnapshots(next);
    await fetch(`/api/budget/${activeProfile}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    }).catch(() => {});
  }

  function resetToDefaults() {
    setOverrides({});
  }

  // ---------------------------------------------------------------------------
  // Render helpers: total rows
  // ---------------------------------------------------------------------------
  function SectionTotalRow({ ids }: { ids: string[] }) {
    const total = sectionTotal(ids);
    return (
      <tr className="total-row">
        <td className="label">Total</td>
        <td className="amount monthly">${fmt(total)}</td>
        <td className="amount">${fmt(total * 12)}</td>
        <td className="notes"></td>
      </tr>
    );
  }

  function SubtotalRow({ ids, label = 'Subtotal' }: { ids: string[]; label?: string }) {
    const total = sectionTotal(ids);
    return (
      <tr className="subtotal-row">
        <td className="label">{label}</td>
        <td className="amount monthly">${fmt(total)}</td>
        <td className="amount">${fmt(total * 12)}</td>
        <td className="notes"></td>
      </tr>
    );
  }

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------
  return (
    <>
      <style>{`
        .budget-sticky {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 200;
          background: #1a1a1a;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 0;
          padding: 0 1.25rem;
          height: 48px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 0.82rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        }
        .sticky-home {
          background: none;
          border: 1px solid rgba(255,255,255,0.18);
          color: rgba(255,255,255,0.75);
          border-radius: 5px;
          padding: 0.3rem 0.75rem;
          font-size: 0.78rem;
          cursor: pointer;
          text-decoration: none;
          margin-right: 1.25rem;
          white-space: nowrap;
          transition: background 0.15s;
        }
        .sticky-home:hover { background: rgba(255,255,255,0.08); }
        .sticky-divider {
          width: 1px;
          height: 28px;
          background: rgba(255,255,255,0.12);
          margin: 0 1.25rem;
        }
        .sticky-stat { display: flex; flex-direction: column; gap: 1px; }
        .sticky-stat .label { font-size: 0.67rem; text-transform: uppercase; letter-spacing: 0.07em; color: rgba(255,255,255,0.4); }
        .sticky-stat .value { font-size: 0.88rem; font-weight: 600; font-variant-numeric: tabular-nums; }
        .sticky-stat.expenses .value { color: #f28b70; }
        .sticky-stat.income   .value { color: #6ecfa8; }
        .sticky-stat.gap      .value { color: #ffd17a; }
        .sticky-spacer { flex: 1; }
        .sticky-btn {
          background: none;
          border: 1px solid rgba(255,255,255,0.25);
          color: rgba(255,255,255,0.8);
          border-radius: 20px;
          padding: 0.25rem 0.85rem;
          font-size: 0.75rem;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s, border-color 0.15s;
          margin-left: 0.5rem;
          font-family: inherit;
        }
        .sticky-btn:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.4); }
        .sticky-btn.active { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.5); color: #fff; }
        .sticky-btn.record { border-color: #f28b70; color: #f28b70; }
        .sticky-btn.record:hover { background: rgba(242,139,112,0.12); }
        .sticky-btn.reset { border-color: #ffd17a; color: #ffd17a; }
        .sticky-btn.reset:hover { background: rgba(255,209,122,0.10); }
        .profile-switcher {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-right: 0.75rem;
        }
        .profile-tab {
          background: none;
          border: 1px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.5);
          border-radius: 5px;
          padding: 0.25rem 0.7rem;
          font-size: 0.75rem;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .profile-tab:hover { color: rgba(255,255,255,0.8); border-color: rgba(255,255,255,0.3); }
        .profile-tab.active { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.45); color: #fff; font-weight: 600; }
        .budget-wrap * { box-sizing: border-box; margin: 0; padding: 0; }
        .budget-wrap {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #f5f5f0;
          color: #222;
          padding: 2rem;
          padding-top: 4rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .budget-wrap h1 { font-size: 1.6rem; margin-bottom: 0.25rem; color: #111; }
        .subtitle { color: #888; font-size: 0.85rem; margin-bottom: 2rem; }
        .notice {
          background: #fff8e1;
          border-left: 3px solid #f0c040;
          padding: 0.6rem 1rem;
          font-size: 0.85rem;
          margin-bottom: 2rem;
          color: #555;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 1.5rem;
        }
        .section {
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          overflow: hidden;
        }
        .section.wide { grid-column: 1 / -1; }
        .section-header {
          padding: 0.65rem 1rem;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #fff;
        }
        .education     .section-header { background: #4a7c59; }
        .fina          .section-header { background: #5a7aa8; }
        .health        .section-header { background: #c0674f; }
        .grocery       .section-header { background: #5a8fa3; }
        .subscriptions .section-header { background: #7a6ea8; }
        .financial     .section-header { background: #5a6878; }
        .housecar      .section-header { background: #7a8c6e; }
        .shopping      .section-header { background: #c09050; }
        .unique        .section-header { background: #a06080; }
        .income        .section-header { background: #3a7a7a; }
        .summary       .section-header { background: #333; }
        .budget-wrap table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
        .budget-wrap thead th {
          padding: 0.3rem 1rem;
          text-align: right;
          font-size: 0.7rem;
          font-weight: 600;
          color: #aaa;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          border-bottom: 1px solid #eee;
          background: #fafafa;
        }
        .budget-wrap thead th.label { text-align: left; }
        .budget-wrap td {
          padding: 0.45rem 1rem;
          border-bottom: 1px solid #f0f0f0;
          vertical-align: top;
        }
        .budget-wrap tr:last-child td { border-bottom: none; }
        .budget-wrap td.label { color: #333; }
        .budget-wrap td.amount {
          text-align: right;
          font-variant-numeric: tabular-nums;
          color: #333;
          white-space: nowrap;
        }
        .budget-wrap td.amount.monthly { color: #888; }
        .budget-wrap td.notes { color: #888; font-size: 0.8rem; }
        .budget-wrap tr.total-row td {
          font-weight: 700;
          background: #fafafa;
          border-top: 2px solid #e0e0e0;
          color: #111;
        }
        .budget-wrap tr.weekly-row td { color: #aaa; font-size: 0.8rem; font-style: italic; }
        .budget-wrap tr.subcat-header td {
          padding: 0.5rem 1rem 0.25rem;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: #9a8ec8;
          background: #f7f6fc;
          border-top: 1px solid #e8e4f4;
          border-bottom: none;
        }
        .budget-wrap tr.subcat-header:first-of-type td { border-top: none; }
        .budget-wrap tr.subtotal-row td {
          font-weight: 600;
          color: #555;
          background: #f7f6fc;
          border-top: 1px solid #e8e4f4;
          font-size: 0.82rem;
        }
        .uncertain { color: #c09050; font-size: 0.75rem; margin-left: 4px; }
        .missing { color: #bbb; font-style: italic; }
        .estimate { color: #888; font-style: italic; }
        .budget-wrap tr.income-row td { color: #3a7a7a; }
        .budget-wrap tr.expense-row td { color: #c0674f; }
        .budget-wrap tr.gap-row td { color: #555; }
        .summary table td { padding: 0.55rem 1rem; }
        /* Edit mode inputs */
        .amount-input {
          border: none;
          outline: none;
          text-align: right;
          font-size: inherit;
          font-family: inherit;
          font-variant-numeric: tabular-nums;
          color: #333;
          background: transparent;
          width: 90px;
          padding: 0;
        }
        .amount-input:focus {
          background: rgba(90, 122, 168, 0.07);
          border-radius: 3px;
        }
        /* Remove spinner arrows */
        .amount-input::-webkit-outer-spin-button,
        .amount-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .amount-input[type=number] { -moz-appearance: textfield; }
        /* Edit mode highlight */
        .edit-mode-bar {
          background: rgba(90, 122, 168, 0.06);
          border-bottom: 1px solid rgba(90, 122, 168, 0.15);
          padding: 0.35rem 2rem;
          font-size: 0.78rem;
          color: #5a7aa8;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          position: fixed;
          top: 48px;
          left: 0;
          right: 0;
          z-index: 190;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .budget-wrap.has-edit-bar { padding-top: 5.5rem; }
        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          z-index: 500;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-box {
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.25);
          padding: 1.75rem;
          width: 420px;
          max-width: 95vw;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .modal-box h2 { font-size: 1rem; margin-bottom: 1rem; color: #111; }
        .modal-field { margin-bottom: 1rem; }
        .modal-field label { display: block; font-size: 0.78rem; color: #666; margin-bottom: 0.3rem; }
        .modal-field input,
        .modal-field textarea {
          width: 100%;
          border: 1px solid #ddd;
          border-radius: 5px;
          padding: 0.5rem 0.65rem;
          font-size: 0.88rem;
          font-family: inherit;
          color: #222;
          outline: none;
          transition: border-color 0.15s;
        }
        .modal-field input:focus,
        .modal-field textarea:focus { border-color: #5a7aa8; }
        .modal-field textarea { resize: vertical; min-height: 80px; }
        .modal-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem; }
        .modal-btn {
          border-radius: 5px;
          padding: 0.45rem 1.1rem;
          font-size: 0.82rem;
          font-family: inherit;
          cursor: pointer;
          border: 1px solid #ddd;
          background: #fff;
          color: #333;
          transition: background 0.15s;
        }
        .modal-btn:hover { background: #f5f5f5; }
        .modal-btn.primary { background: #5a7aa8; color: #fff; border-color: #5a7aa8; }
        .modal-btn.primary:hover { background: #4a6a98; }
        /* Snapshots */
        .snapshots-section {
          margin-top: 2.5rem;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .snapshots-section h2 { font-size: 1rem; color: #444; margin-bottom: 1rem; }
        .snapshot-card {
          background: #fff;
          border: 1px solid #e5e5e5;
          border-radius: 7px;
          padding: 0.85rem 1rem;
          margin-bottom: 0.75rem;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .snapshot-info { flex: 1; }
        .snapshot-title { font-weight: 600; font-size: 0.9rem; color: #222; margin-bottom: 0.2rem; }
        .snapshot-meta { font-size: 0.75rem; color: #888; margin-bottom: 0.3rem; }
        .snapshot-rationale { font-size: 0.82rem; color: #555; }
        .snapshot-actions { display: flex; flex-direction: column; gap: 0.4rem; align-items: flex-end; }
        .snap-btn {
          border-radius: 4px;
          padding: 0.3rem 0.75rem;
          font-size: 0.75rem;
          font-family: inherit;
          cursor: pointer;
          border: 1px solid #ddd;
          background: #fafafa;
          color: #444;
          white-space: nowrap;
          transition: background 0.15s;
        }
        .snap-btn:hover { background: #f0f0f0; }
        .snap-btn.restore { border-color: #5a7aa8; color: #5a7aa8; background: #fff; }
        .snap-btn.restore:hover { background: rgba(90,122,168,0.08); }
        .snap-btn.delete { border-color: #d88; color: #c44; background: #fff; }
        .snap-btn.delete:hover { background: rgba(220,80,80,0.07); }
        .no-snapshots { color: #aaa; font-size: 0.85rem; font-style: italic; }
      `}</style>

      {/* STICKY HEADER */}
      <div className="budget-sticky">
        <a href="/" className="sticky-home">← Home</a>
        <div className="sticky-divider" />
        <div className="profile-switcher">
          {PROFILES.map(p => (
            <button
              key={p.id}
              className={`profile-tab${activeProfile === p.id ? ' active' : ''}`}
              onClick={() => setActiveProfile(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="sticky-divider" />
        <div className="sticky-stat expenses">
          <span className="label">Total Expenses</span>
          <span className="value">${fmt(totalExpenses)} / mo</span>
        </div>
        <div className="sticky-divider" />
        <div className="sticky-stat income">
          <span className="label">Total Income</span>
          <span className="value">${fmt(totalIncome)} / mo</span>
        </div>
        <div className="sticky-divider" />
        <div className="sticky-stat gap">
          <span className="label">Gap</span>
          <span className="value">${fmt(gap)} / mo</span>
        </div>
        <div className="sticky-spacer" />
        {mode === 'edit' && (
          <button
            className="sticky-btn reset"
            onClick={resetToDefaults}
            title="Reset all values to defaults"
          >
            Reset
          </button>
        )}
        {mode === 'edit' && (
          <button
            className="sticky-btn record"
            onClick={() => setShowModal(true)}
          >
            Record
          </button>
        )}
        <button
          className={`sticky-btn${mode === 'edit' ? ' active' : ''}`}
          onClick={() => setMode(m => m === 'view' ? 'edit' : 'view')}
        >
          {mode === 'view' ? 'Edit' : 'View'}
        </button>
      </div>

      {/* EDIT MODE BAR */}
      {mode === 'edit' && (
        <div className="edit-mode-bar">
          Editing — amounts are monthly. Annual column updates live.
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-box">
            <h2>Record Snapshot</h2>
            <div className="modal-field">
              <label>Title</label>
              <input
                type="text"
                placeholder="e.g. July 2026 baseline"
                value={modalTitle}
                onChange={e => setModalTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-field">
              <label>Rationale</label>
              <textarea
                placeholder="What changed and why?"
                value={modalRationale}
                onChange={e => setModalRationale(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="modal-btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="modal-btn primary" onClick={saveSnapshot} disabled={!modalTitle.trim()}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`budget-wrap${mode === 'edit' ? ' has-edit-bar' : ''}`}>
        <h1>Annual Budget — {PROFILES.find(p => p.id === activeProfile)?.label}</h1>
        <p className="subtitle">2026 · All amounts annualized</p>

        <div className="notice">
          ⚠ Annual taxes owed may not be fully reflected in the expense total. Some subscription amounts are still unknown.
        </div>

        <div className="grid">

          {/* JO EDUCATION */}
          <div className="section education">
            <div className="section-header">Jo Education</div>
            <table>
              <thead><tr><th className="label"></th><th>Monthly</th><th>Annual</th><th className="label">Notes</th></tr></thead>
              <tbody>
                <tr>
                  <td className="label">College Fund</td>
                  <AmountCell id="college-fund" />
                  <AnnualCell id="college-fund" />
                  <td className="notes"></td>
                </tr>
                <tr>
                  <td className="label">Immaculata</td>
                  <AmountCell id="immaculata" />
                  <AnnualCell id="immaculata" />
                  <td className="notes"></td>
                </tr>
                <tr>
                  <td className="label">Fees</td>
                  <AmountCell id="fees" />
                  <AnnualCell id="fees" />
                  <td className="notes"></td>
                </tr>
                <tr>
                  <td className="label">Camps</td>
                  <AmountCell id="camps" />
                  <AnnualCell id="camps" />
                  <td className="notes">DD Care</td>
                </tr>
                <SectionTotalRow ids={educationIds} />
              </tbody>
            </table>
          </div>

          {/* FINA ACTIVITIES */}
          <div className="section fina">
            <div className="section-header">Fina Activities</div>
            <table>
              <thead><tr><th className="label"></th><th>Monthly</th><th>Annual</th><th className="label">Notes</th></tr></thead>
              <tbody>
                <tr>
                  <td className="label">Gym</td>
                  <AmountCell id="gym" />
                  <AnnualCell id="gym" />
                  <td className="notes"></td>
                </tr>
                <tr>
                  <td className="label">Jiu Jitsu</td>
                  <AmountCell id="jiu-jitsu" />
                  <AnnualCell id="jiu-jitsu" />
                  <td className="notes"></td>
                </tr>
                <tr>
                  <td className="label">Swim</td>
                  <AmountCell id="swim" />
                  <AnnualCell id="swim" />
                  <td className="notes"></td>
                </tr>
                <tr>
                  <td className="label">Violin</td>
                  <AmountCell id="violin" />
                  <AnnualCell id="violin" />
                  <td className="notes"></td>
                </tr>
                <tr>
                  <td className="label">Hooked on Phonics</td>
                  {mode === 'view' ? (
                    <>
                      <td className="amount monthly missing">—</td>
                      <td className="amount missing">—</td>
                    </>
                  ) : (
                    <>
                      <AmountCell id="hooked-on-phonics" />
                      <AnnualCell id="hooked-on-phonics" />
                    </>
                  )}
                  <td className="notes"><span className="uncertain">amount unknown</span></td>
                </tr>
                <SectionTotalRow ids={finaIds} />
              </tbody>
            </table>
          </div>

          {/* HEALTH */}
          <div className="section health">
            <div className="section-header">Health</div>
            <table>
              <thead><tr><th className="label"></th><th>Monthly</th><th>Annual</th><th className="label">Notes</th></tr></thead>
              <tbody>
                <tr><td className="label">Mel doc/meds</td><AmountCell id="mel-doc" /><AnnualCell id="mel-doc" /><td className="notes">FSA</td></tr>
                <tr><td className="label">Mel yoga</td><AmountCell id="mel-yoga" /><AnnualCell id="mel-yoga" /><td className="notes"></td></tr>
                <tr><td className="label">KP yoga</td><AmountCell id="kp-yoga" /><AnnualCell id="kp-yoga" /><td className="notes"></td></tr>
                <tr><td className="label">KP doc/dentist</td><AmountCell id="kp-doc" /><AnnualCell id="kp-doc" /><td className="notes">FSA</td></tr>
                <tr><td className="label">Jo doc/dentist</td><AmountCell id="jo-doc" /><AnnualCell id="jo-doc" /><td className="notes">FSA</td></tr>
                <tr><td className="label">Roscoe doc</td><AmountCell id="roscoe-doc" /><AnnualCell id="roscoe-doc" /><td className="notes"></td></tr>
                <tr><td className="label">Fitness</td><AmountCell id="fitness" /><AnnualCell id="fitness" /><td className="notes">$60 each</td></tr>
                <tr><td className="label">Haircuts</td><AmountCell id="haircuts" /><AnnualCell id="haircuts" /><td className="notes"></td></tr>
                <tr><td className="label">Massage etc.</td><AmountCell id="massage" /><AnnualCell id="massage" /><td className="notes"></td></tr>
                <SectionTotalRow ids={healthIds} />
                <tr className="weekly-row">
                  <td className="label">Weekly</td>
                  <td className="amount monthly">—</td>
                  <td className="amount">${fmt(sectionTotal(healthIds) * 12 / 52)}</td>
                  <td className="notes"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* GROCERY */}
          <div className="section grocery">
            <div className="section-header">Grocery</div>
            <table>
              <thead><tr><th className="label"></th><th>Monthly</th><th>Annual</th><th className="label">Notes</th></tr></thead>
              <tbody>
                <tr><td className="label">Target</td><AmountCell id="target" /><AnnualCell id="target" /><td className="notes"></td></tr>
                <tr><td className="label">Harris Teeter</td><AmountCell id="harris-teeter" /><AnnualCell id="harris-teeter" /><td className="notes"></td></tr>
                <tr><td className="label">Whole Foods</td><AmountCell id="whole-foods" /><AnnualCell id="whole-foods" /><td className="notes"></td></tr>
                <tr><td className="label">Co-op</td><AmountCell id="co-op" /><AnnualCell id="co-op" /><td className="notes"></td></tr>
                <SectionTotalRow ids={groceryIds} />
                <tr className="weekly-row">
                  <td className="label">Weekly</td>
                  <td className="amount monthly">—</td>
                  <td className="amount">${fmt(sectionTotal(groceryIds) * 12 / 52)}</td>
                  <td className="notes"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* FINANCIAL */}
          <div className="section financial">
            <div className="section-header">Financial</div>
            <table>
              <thead><tr><th className="label"></th><th>Monthly</th><th>Annual</th><th className="label">Notes</th></tr></thead>
              <tbody>
                <tr><td className="label">Mel/KP IRA</td><AmountCell id="ira" /><AnnualCell id="ira" /><td className="notes"></td></tr>
                <tr><td className="label">Mel life insurance</td><AmountCell id="mel-life" /><AnnualCell id="mel-life" /><td className="notes"></td></tr>
                <tr><td className="label">Life insurance K</td><AmountCell id="kp-life" /><AnnualCell id="kp-life" /><td className="notes"></td></tr>
                <tr><td className="label">Taxes est.</td><AmountCell id="taxes" /><AnnualCell id="taxes" /><td className="notes"></td></tr>
                <SectionTotalRow ids={financialIds} />
              </tbody>
            </table>
          </div>

          {/* SUBSCRIPTIONS */}
          <div className="section subscriptions wide">
            <div className="section-header">Subscriptions</div>
            <table>
              <thead><tr><th className="label"></th><th>Monthly</th><th>Annual</th><th className="label">Notes</th></tr></thead>
              <tbody>
                <tr className="subcat-header"><td colSpan={4}>Memberships</td></tr>
                <tr><td className="label">Target</td><AmountCell id="target-mem" /><AnnualCell id="target-mem" /><td className="notes"></td></tr>
                <tr><td className="label">Amazon Prime</td><AmountCell id="amazon-prime" /><AnnualCell id="amazon-prime" /><td className="notes"></td></tr>
                <tr><td className="label">Museum LifeSci</td><AmountCell id="museum-lifesci" /><AnnualCell id="museum-lifesci" /><td className="notes"></td></tr>
                <tr><td className="label">Flowers CSA</td><AmountCell id="flowers-csa" /><AnnualCell id="flowers-csa" /><td className="notes">Seasonal farm share</td></tr>
                <SubtotalRow ids={subMembIds} />

                <tr className="subcat-header"><td colSpan={4}>Streaming &amp; Media</td></tr>
                <tr><td className="label">Amazon Music</td><AmountCell id="amazon-music" /><AnnualCell id="amazon-music" /><td className="notes"></td></tr>
                <tr><td className="label">Audible</td><AmountCell id="audible" /><AnnualCell id="audible" /><td className="notes">USAA</td></tr>
                <tr><td className="label">Kindle Comics</td><AmountCell id="kindle-comics" /><AnnualCell id="kindle-comics" /><td className="notes"><span className="uncertain">amount uncertain</span></td></tr>
                <tr><td className="label">Kindle Unlimited</td><AmountCell id="kindle-unlimited" /><AnnualCell id="kindle-unlimited" /><td className="notes"></td></tr>
                <tr>
                  <td className="label">Streaming Services</td>
                  <AmountCell id="streaming" className="estimate" />
                  <AnnualCell id="streaming" className="estimate" />
                  <td className="notes"><span className="uncertain">estimate — not yet itemized</span></td>
                </tr>
                <SubtotalRow ids={subStreamIds} />

                <tr className="subcat-header"><td colSpan={4}>Apps &amp; Software</td></tr>
                <tr><td className="label">Claude</td><AmountCell id="claude" /><AnnualCell id="claude" /><td className="notes"></td></tr>
                <tr><td className="label">1Password</td><AmountCell id="onepassword" /><AnnualCell id="onepassword" /><td className="notes"></td></tr>
                <tr><td className="label">Apple Arcade</td><AmountCell id="apple-arcade" /><AnnualCell id="apple-arcade" /><td className="notes">Apple</td></tr>
                <tr><td className="label">Strum Machine</td><AmountCell id="strum-machine" /><AnnualCell id="strum-machine" /><td className="notes"></td></tr>
                <tr>
                  <td className="label">Simply Piano etc.</td>
                  {mode === 'view' ? (
                    <>
                      <td className="amount monthly missing">—</td>
                      <td className="amount missing">—</td>
                    </>
                  ) : (
                    <>
                      <AmountCell id="simply-piano" />
                      <AnnualCell id="simply-piano" />
                    </>
                  )}
                  <td className="notes"><span className="uncertain">amount unknown</span></td>
                </tr>
                <tr><td className="label">Chess</td><AmountCell id="chess" /><AnnualCell id="chess" /><td className="notes">Apple<span className="uncertain">?</span></td></tr>
                <tr><td className="label">Amazon Photo</td><AmountCell id="amazon-photo" /><AnnualCell id="amazon-photo" /><td className="notes"></td></tr>
                <SubtotalRow ids={subAppsIds} />

                <tr className="subcat-header"><td colSpan={4}>Giving</td></tr>
                <tr><td className="label">Immaculate Heart</td><AmountCell id="immaculate-heart" /><AnnualCell id="immaculate-heart" /><td className="notes">Church donation</td></tr>
                <SubtotalRow ids={subGivingIds} />

                <SectionTotalRow ids={subscriptionsIds} />
              </tbody>
            </table>
          </div>

          {/* HOUSE & CAR */}
          <div className="section housecar">
            <div className="section-header">House &amp; Car</div>
            <table>
              <thead><tr><th className="label"></th><th>Monthly</th><th>Annual</th><th className="label">Notes</th></tr></thead>
              <tbody>
                <tr><td className="label">416 Property Tax</td><AmountCell id="prop-tax-416" /><AnnualCell id="prop-tax-416" /><td className="notes">Escrow</td></tr>
                <tr><td className="label">416 Insurance</td><AmountCell id="insurance-416" /><AnnualCell id="insurance-416" /><td className="notes">Escrow</td></tr>
                <tr><td className="label">104 Property Tax</td><AmountCell id="prop-tax-104" /><AnnualCell id="prop-tax-104" /><td className="notes"></td></tr>
                <tr><td className="label">State Farm Bundle</td><AmountCell id="state-farm" /><AnnualCell id="state-farm" /><td className="notes">Mel &amp; KP car + 104 &amp; 416 homeowners</td></tr>
                <tr><td className="label">416 Gas</td><AmountCell id="gas-416" /><AnnualCell id="gas-416" /><td className="notes"></td></tr>
                <tr><td className="label">416 Internet</td><AmountCell id="internet-416" /><AnnualCell id="internet-416" /><td className="notes">AT&amp;T</td></tr>
                <tr><td className="label">416 Electric</td><AmountCell id="electric-416" /><AnnualCell id="electric-416" /><td className="notes"></td></tr>
                <tr><td className="label">416 Water</td><AmountCell id="water-416" /><AnnualCell id="water-416" /><td className="notes">USAA</td></tr>
                <tr><td className="label">ADT</td><AmountCell id="adt" /><AnnualCell id="adt" /><td className="notes">USAA</td></tr>
                <tr><td className="label">104 Gutters/Leaves</td><AmountCell id="gutters-104" /><AnnualCell id="gutters-104" /><td className="notes"></td></tr>
                <tr><td className="label">416 Gutters/Leaves</td><AmountCell id="gutters-416" /><AnnualCell id="gutters-416" /><td className="notes"></td></tr>
                <tr><td className="label">KP Cellphone</td><AmountCell id="kp-cell" /><AnnualCell id="kp-cell" /><td className="notes">AT&amp;T</td></tr>
                <tr><td className="label">Car Maintenance</td><AmountCell id="car-maintenance" /><AnnualCell id="car-maintenance" /><td className="notes">Oil, wipers, tires, inspections, washes</td></tr>
                <tr><td className="label">Car Registrations</td><AmountCell id="car-reg" /><AnnualCell id="car-reg" /><td className="notes"><span className="uncertain">estimate</span></td></tr>
                <tr><td className="label">Parking</td><AmountCell id="parking" /><AnnualCell id="parking" /><td className="notes">KP campus, downtown, Duke Gardens</td></tr>
                <tr><td className="label">Ani/Rebecca</td><AmountCell id="ani-rebecca" /><AnnualCell id="ani-rebecca" /><td className="notes">10 weeks off per year</td></tr>
                <tr><td className="label">Home Depot</td><AmountCell id="home-depot" /><AnnualCell id="home-depot" /><td className="notes">Up from Amazon reduction</td></tr>
                <SectionTotalRow ids={housecarIds} />
                <tr className="weekly-row">
                  <td className="label">Weekly</td>
                  <td className="amount monthly">—</td>
                  <td className="amount">${fmt(sectionTotal(housecarIds) * 12 / 52)}</td>
                  <td className="notes"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SHOPPING */}
          <div className="section shopping">
            <div className="section-header">Shopping</div>
            <table>
              <thead><tr><th className="label"></th><th>Monthly</th><th>Annual</th><th className="label">Notes</th></tr></thead>
              <tbody>
                <tr><td className="label">Art</td><AmountCell id="art" /><AnnualCell id="art" /><td className="notes"></td></tr>
                <tr><td className="label">Entertainment/Eat Out</td><AmountCell id="entertainment" /><AnnualCell id="entertainment" /><td className="notes"></td></tr>
                <tr><td className="label">Books/Videos</td><AmountCell id="books" /><AnnualCell id="books" /><td className="notes"></td></tr>
                <tr><td className="label">Amazon</td><AmountCell id="amazon-shop" /><AnnualCell id="amazon-shop" /><td className="notes">Reduce — was $700/mo</td></tr>
                <tr><td className="label">Tools</td><AmountCell id="tools" /><AnnualCell id="tools" /><td className="notes"></td></tr>
                <tr><td className="label">Clothes</td><AmountCell id="clothes" /><AnnualCell id="clothes" /><td className="notes">Excl. Immaculata uniforms</td></tr>
                <tr><td className="label">Fina Accessories</td><AmountCell id="fina-acc" /><AnnualCell id="fina-acc" /><td className="notes"></td></tr>
                <tr><td className="label">ABC</td><AmountCell id="abc" /><AnnualCell id="abc" /><td className="notes"></td></tr>
                <tr><td className="label">Convenience</td><AmountCell id="convenience" /><AnnualCell id="convenience" /><td className="notes">Contribution</td></tr>
                <SectionTotalRow ids={shoppingIds} />
                <tr className="weekly-row">
                  <td className="label">Weekly</td>
                  <td className="amount monthly">—</td>
                  <td className="amount">${fmt(sectionTotal(shoppingIds) * 12 / 52)}</td>
                  <td className="notes"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* UNIQUE EXPENSES */}
          <div className="section unique">
            <div className="section-header">Unique Expenses</div>
            <table>
              <thead><tr><th className="label"></th><th>Monthly</th><th>Annual</th><th className="label">Notes</th></tr></thead>
              <tbody>
                <tr><td className="label">Travel</td><AmountCell id="travel" /><AnnualCell id="travel" /><td className="notes"></td></tr>
                <tr><td className="label">Gifts</td><AmountCell id="gifts" /><AnnualCell id="gifts" /><td className="notes"></td></tr>
                <SectionTotalRow ids={uniqueIds} />
              </tbody>
            </table>
          </div>

          {/* INCOME */}
          <div className="section income">
            <div className="section-header">Income</div>
            <table>
              <thead><tr><th className="label"></th><th>Monthly</th><th>Annual</th><th className="label">Notes</th></tr></thead>
              <tbody>
                <tr className="income-row"><td className="label">KP Salary</td><AmountCell id="kp-salary" /><AnnualCell id="kp-salary" /><td className="notes"></td></tr>
                <tr className="income-row"><td className="label">Mel Salary</td><AmountCell id="mel-salary" /><AnnualCell id="mel-salary" /><td className="notes"></td></tr>
                <tr className="income-row"><td className="label">Edgewood</td><AmountCell id="edgewood" /><AnnualCell id="edgewood" /><td className="notes"></td></tr>
                <tr className="income-row"><td className="label">Total FSA</td><AmountCell id="fsa" /><AnnualCell id="fsa" /><td className="notes"></td></tr>
                <tr className="income-row"><td className="label">Cruz</td><AmountCell id="cruz" /><AnnualCell id="cruz" /><td className="notes"></td></tr>
                <tr className="total-row income-row">
                  <td className="label">Total Income</td>
                  <td className="amount monthly">${fmt(totalIncome)}</td>
                  <td className="amount">${fmt(totalIncome * 12)}</td>
                  <td className="notes"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SUMMARY */}
          <div className="section summary wide">
            <div className="section-header">Summary</div>
            <table>
              <thead><tr><th className="label">Category</th><th>Monthly</th><th>Annual</th><th className="label">Notes</th></tr></thead>
              <tbody>
                {expenseSections.map(s => {
                  const tot = sectionTotal(s.ids);
                  return (
                    <tr key={s.label}>
                      <td className="label">{s.label}</td>
                      <td className="amount monthly">${fmt(tot)}</td>
                      <td className="amount">${fmt(tot * 12)}</td>
                      <td className="notes"></td>
                    </tr>
                  );
                })}
                <tr className="total-row expense-row">
                  <td className="label">Total Expenses</td>
                  <td className="amount monthly">${fmt(totalExpenses)}</td>
                  <td className="amount">${fmt(totalExpenses * 12)}</td>
                  <td className="notes"></td>
                </tr>
                <tr className="total-row income-row">
                  <td className="label">Total Income</td>
                  <td className="amount monthly">${fmt(totalIncome)}</td>
                  <td className="amount">${fmt(totalIncome * 12)}</td>
                  <td className="notes"></td>
                </tr>
                <tr className="total-row gap-row">
                  <td className="label">Gap</td>
                  <td className="amount monthly">{gap >= 0 ? '' : '-'}${fmt(Math.abs(gap))}</td>
                  <td className="amount">{gap >= 0 ? '' : '-'}${fmt(Math.abs(gap) * 12)}</td>
                  <td className="notes"></td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>

        {/* SNAPSHOTS */}
        <div className="snapshots-section">
          <h2>Saved Snapshots</h2>
          {snapshots.length === 0 ? (
            <p className="no-snapshots">No snapshots saved yet. Use Edit mode and click Record to save one.</p>
          ) : (
            snapshots.map((snap, idx) => (
              <div className="snapshot-card" key={snap.timestamp + idx}>
                <div className="snapshot-info">
                  <div className="snapshot-title">{snap.title}</div>
                  <div className="snapshot-meta">{new Date(snap.timestamp).toLocaleString()}</div>
                  {snap.rationale && <div className="snapshot-rationale">{snap.rationale}</div>}
                </div>
                <div className="snapshot-actions">
                  <button className="snap-btn restore" onClick={() => restoreSnapshot(snap)}>Restore</button>
                  <button className="snap-btn delete" onClick={() => deleteSnapshot(idx)}>Delete</button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </>
  );
}
