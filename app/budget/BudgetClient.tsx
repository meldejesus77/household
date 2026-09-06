'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------
interface Row {
  id: string;
  label: string;
  defaultValue: number | null;
  notes?: string;
  notesUncertain?: boolean;
  estimate?: boolean;
}
interface Subcategory { id: string; label: string; rows: Row[]; }
interface SectionConfig {
  id: string;
  label: string;
  colorClass: string;
  wide?: boolean;
  weekly?: boolean;
  rows?: Row[];
  subcategories?: Subcategory[];
}
interface Snapshot {
  title: string;
  rationale: string;
  timestamp: string;
  values: Record<string, number>;
}
interface BudgetProfileData {
  config: SectionConfig[];
  income: SectionConfig;
  snapshots: Snapshot[];
}

// ---------------------------------------------------------------------------
// DEFAULT CONFIG — bundled shape used when a profile has no saved config
// ---------------------------------------------------------------------------
const DEFAULT_EXPENSES: SectionConfig[] = [
  {
    id: 'education', label: 'Jo Education', colorClass: 'education',
    rows: [
      { id: 'college-fund', label: 'College Fund', defaultValue: 500 },
      { id: 'immaculata',   label: 'Immaculata',   defaultValue: 999 },
      { id: 'fees',         label: 'Fees',         defaultValue: 133.33 },
      { id: 'camps',        label: 'Camps',        defaultValue: 291.67, notes: 'DD Care' },
    ],
  },
  {
    id: 'fina', label: 'Fina Activities', colorClass: 'fina',
    rows: [
      { id: 'gym',               label: 'Gym',               defaultValue: 115 },
      { id: 'jiu-jitsu',         label: 'Jiu Jitsu',         defaultValue: 84 },
      { id: 'swim',              label: 'Swim',              defaultValue: 115 },
      { id: 'violin',            label: 'Violin',            defaultValue: 160 },
      { id: 'hooked-on-phonics', label: 'Hooked on Phonics', defaultValue: null, notes: 'amount unknown', notesUncertain: true },
    ],
  },
  {
    id: 'health', label: 'Health', colorClass: 'health', weekly: true,
    rows: [
      { id: 'mel-doc',    label: 'Mel doc/meds',   defaultValue: 50,    notes: 'FSA' },
      { id: 'mel-yoga',   label: 'Mel yoga',       defaultValue: 60 },
      { id: 'kp-yoga',    label: 'KP yoga',        defaultValue: 80 },
      { id: 'kp-doc',     label: 'KP doc/dentist', defaultValue: 16.67, notes: 'FSA' },
      { id: 'jo-doc',     label: 'Jo doc/dentist', defaultValue: 8.33,  notes: 'FSA' },
      { id: 'roscoe-doc', label: 'Roscoe doc',     defaultValue: 69.33 },
      { id: 'fitness',    label: 'Fitness',        defaultValue: 110,   notes: '$60 each' },
      { id: 'haircuts',   label: 'Haircuts',       defaultValue: 17.50 },
      { id: 'massage',    label: 'Massage etc.',   defaultValue: 33.33 },
    ],
  },
  {
    id: 'grocery', label: 'Grocery', colorClass: 'grocery', weekly: true,
    rows: [
      { id: 'target',        label: 'Target',        defaultValue: 900 },
      { id: 'harris-teeter', label: 'Harris Teeter', defaultValue: 350 },
      { id: 'whole-foods',   label: 'Whole Foods',   defaultValue: 150 },
      { id: 'co-op',         label: 'Co-op',         defaultValue: 20 },
    ],
  },
  {
    id: 'financial', label: 'Financial', colorClass: 'financial',
    rows: [
      { id: 'ira',      label: 'Mel/KP IRA',         defaultValue: 1166.67 },
      { id: 'mel-life', label: 'Mel life insurance', defaultValue: 120 },
      { id: 'kp-life',  label: 'Life insurance K',   defaultValue: 30 },
      { id: 'taxes',    label: 'Taxes est.',         defaultValue: 100 },
    ],
  },
  {
    id: 'subscriptions', label: 'Subscriptions', colorClass: 'subscriptions', wide: true,
    subcategories: [
      {
        id: 'memberships', label: 'Memberships',
        rows: [
          { id: 'target-mem',     label: 'Target',         defaultValue: 8.25 },
          { id: 'amazon-prime',   label: 'Amazon Prime',   defaultValue: 12.50 },
          { id: 'museum-lifesci', label: 'Museum LifeSci', defaultValue: 15.42 },
          { id: 'flowers-csa',    label: 'Flowers CSA',    defaultValue: 11.67, notes: 'Seasonal farm share' },
        ],
      },
      {
        id: 'streaming', label: 'Streaming & Media',
        rows: [
          { id: 'amazon-music',     label: 'Amazon Music',       defaultValue: 14.08 },
          { id: 'audible',          label: 'Audible',            defaultValue: 15,    notes: 'USAA' },
          { id: 'kindle-comics',    label: 'Kindle Comics',      defaultValue: 5,     notes: 'amount uncertain', notesUncertain: true },
          { id: 'kindle-unlimited', label: 'Kindle Unlimited',   defaultValue: 12 },
          { id: 'streaming',        label: 'Streaming Services', defaultValue: 45,    notes: 'estimate — not yet itemized', notesUncertain: true, estimate: true },
        ],
      },
      {
        id: 'apps', label: 'Apps & Software',
        rows: [
          { id: 'claude',        label: 'Claude',            defaultValue: 19.99 },
          { id: 'onepassword',   label: '1Password',         defaultValue: 6.99 },
          { id: 'apple-arcade',  label: 'Apple Arcade',      defaultValue: 5,    notes: 'Apple' },
          { id: 'strum-machine', label: 'Strum Machine',     defaultValue: 5 },
          { id: 'simply-piano',  label: 'Simply Piano etc.', defaultValue: null, notes: 'amount unknown', notesUncertain: true },
          { id: 'chess',         label: 'Chess',             defaultValue: 0,    notes: 'Apple?' },
          { id: 'amazon-photo',  label: 'Amazon Photo',      defaultValue: 1.67 },
        ],
      },
      {
        id: 'giving', label: 'Giving',
        rows: [
          { id: 'immaculate-heart', label: 'Immaculate Heart', defaultValue: 60, notes: 'Church donation' },
        ],
      },
    ],
  },
  {
    id: 'housecar', label: 'House & Car', colorClass: 'housecar', weekly: true,
    rows: [
      { id: 'prop-tax-416',    label: '416 Property Tax',   defaultValue: 375,    notes: 'Escrow' },
      { id: 'insurance-416',   label: '416 Insurance',      defaultValue: 104.42, notes: 'Escrow' },
      { id: 'prop-tax-104',    label: '104 Property Tax',   defaultValue: 177 },
      { id: 'state-farm',      label: 'State Farm Bundle',  defaultValue: 190,    notes: 'Mel & KP car + 104 & 416 homeowners' },
      { id: 'gas-416',         label: '416 Gas',            defaultValue: 20 },
      { id: 'internet-416',    label: '416 Internet',       defaultValue: 80,     notes: 'AT&T' },
      { id: 'electric-416',    label: '416 Electric',       defaultValue: 200 },
      { id: 'water-416',       label: '416 Water',          defaultValue: 50,     notes: 'USAA' },
      { id: 'adt',             label: 'ADT',                defaultValue: 60,     notes: 'USAA' },
      { id: 'gutters-104',     label: '104 Gutters/Leaves', defaultValue: 41.67 },
      { id: 'gutters-416',     label: '416 Gutters/Leaves', defaultValue: 25 },
      { id: 'kp-cell',         label: 'KP Cellphone',       defaultValue: 68,     notes: 'AT&T' },
      { id: 'car-maintenance', label: 'Car Maintenance',    defaultValue: 41.67,  notes: 'Oil, wipers, tires, inspections, washes' },
      { id: 'car-reg',         label: 'Car Registrations',  defaultValue: 16.67,  notes: 'estimate', notesUncertain: true },
      { id: 'parking',         label: 'Parking',            defaultValue: 33.33,  notes: 'KP campus, downtown, Duke Gardens' },
      { id: 'ani-rebecca',     label: 'Ani/Rebecca',        defaultValue: 392,    notes: '10 weeks off per year' },
      { id: 'home-depot',      label: 'Home Depot',         defaultValue: 75,     notes: 'Up from Amazon reduction' },
    ],
  },
  {
    id: 'shopping', label: 'Shopping', colorClass: 'shopping', weekly: true,
    rows: [
      { id: 'art',           label: 'Art',                   defaultValue: 40 },
      { id: 'entertainment', label: 'Entertainment/Eat Out', defaultValue: 65 },
      { id: 'books',         label: 'Books/Videos',          defaultValue: 35 },
      { id: 'amazon-shop',   label: 'Amazon',                defaultValue: 400,  notes: 'Reduce — was $700/mo' },
      { id: 'tools',         label: 'Tools',                 defaultValue: 40 },
      { id: 'clothes',       label: 'Clothes',               defaultValue: 30,   notes: 'Excl. Immaculata uniforms' },
      { id: 'fina-acc',      label: 'Fina Accessories',      defaultValue: 20 },
      { id: 'abc',           label: 'ABC',                   defaultValue: 30 },
      { id: 'convenience',   label: 'Convenience',           defaultValue: 40,   notes: 'Contribution' },
    ],
  },
  {
    id: 'unique', label: 'Unique Expenses', colorClass: 'unique',
    rows: [
      { id: 'travel', label: 'Travel', defaultValue: 250 },
      { id: 'gifts',  label: 'Gifts',  defaultValue: 250 },
    ],
  },
];

const DEFAULT_INCOME: SectionConfig = {
  id: 'income', label: 'Income', colorClass: 'income',
  rows: [
    { id: 'kp-salary',  label: 'KP Salary',  defaultValue: 3900 },
    { id: 'mel-salary', label: 'Mel Salary', defaultValue: 3758.33 },
    { id: 'edgewood',   label: 'Edgewood',   defaultValue: 1100 },
    { id: 'fsa',        label: 'Total FSA',  defaultValue: 400 },
    { id: 'cruz',       label: 'Cruz',       defaultValue: 1100 },
  ],
};

// ---------------------------------------------------------------------------
// PROFILES
// ---------------------------------------------------------------------------
const PROFILES = [
  { id: 'day-to-day', label: 'Day-to-Day', description: 'Current household budget' },
  { id: 'retirement', label: 'Retirement', description: 'Projected retirement budget' },
] as const;
type ProfileId = typeof PROFILES[number]['id'];

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const shortId = () => Math.random().toString(36).slice(2, 10);

// ---------------------------------------------------------------------------
// Migration: normalize whatever the API returns into current shape
// ---------------------------------------------------------------------------
function normalize(raw: unknown): BudgetProfileData {
  const base: BudgetProfileData = {
    config: DEFAULT_EXPENSES,
    income: DEFAULT_INCOME,
    snapshots: [],
  };
  if (!raw) return base;
  if (Array.isArray(raw)) {
    // legacy shape: just Snapshot[]
    return { ...base, snapshots: raw as Snapshot[] };
  }
  if (typeof raw === 'object') {
    const obj = raw as Partial<BudgetProfileData>;
    return {
      config: Array.isArray(obj.config) && obj.config.length > 0 ? obj.config : DEFAULT_EXPENSES,
      income: (obj.income && typeof obj.income === 'object') ? obj.income : DEFAULT_INCOME,
      snapshots: Array.isArray(obj.snapshots) ? obj.snapshots : [],
    };
  }
  return base;
}

// Enumerate every row in a section (flat or subcategoried)
function allRows(section: SectionConfig): Row[] {
  if (section.subcategories) return section.subcategories.flatMap(s => s.rows);
  return section.rows ?? [];
}

export default function BudgetClient() {
  const [activeProfile, setActiveProfile] = useState<ProfileId>('day-to-day');
  const [data, setData] = useState<BudgetProfileData>({
    config: DEFAULT_EXPENSES, income: DEFAULT_INCOME, snapshots: [],
  });
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalRationale, setModalRationale] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [topOffset, setTopOffset] = useState(56);

  const stickyRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // Load / persist
  // ---------------------------------------------------------------------------
  useEffect(() => {
    fetch(`/api/budget/${activeProfile}`)
      .then(r => r.json())
      .then((raw: unknown) => {
        const normalized = normalize(raw);
        setData(normalized);
        // Collapse every section by default
        const sectionIds = [...normalized.config.map(s => s.id), normalized.income.id, 'summary'];
        setCollapsed(new Set(sectionIds));
      })
      .catch(() => {
        setData({ config: DEFAULT_EXPENSES, income: DEFAULT_INCOME, snapshots: [] });
        setCollapsed(new Set([...DEFAULT_EXPENSES.map(s => s.id), 'income', 'summary']));
      });
    setOverrides({});
    setMode('view');
  }, [activeProfile]);

  const persist = useCallback(async (next: BudgetProfileData) => {
    setData(next);
    await fetch(`/api/budget/${activeProfile}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    }).catch(() => {});
  }, [activeProfile]);

  // ---------------------------------------------------------------------------
  // Dynamic top offset — measure the sticky container
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!stickyRef.current) return;
    const measure = () => {
      const h = stickyRef.current?.offsetHeight ?? 48;
      setTopOffset(h + 12);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stickyRef.current);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, [mode]);

  // ---------------------------------------------------------------------------
  // Value helpers
  // ---------------------------------------------------------------------------
  function getValue(row: Row): number | null {
    if (row.id in overrides) return overrides[row.id];
    return row.defaultValue;
  }
  function getEditValue(row: Row): number {
    return getValue(row) ?? 0;
  }
  function setOverride(id: string, val: number) {
    setOverrides(prev => ({ ...prev, [id]: val }));
  }
  function sectionTotal(section: SectionConfig): number {
    return allRows(section).reduce((sum, r) => sum + (getValue(r) ?? 0), 0);
  }
  function rowsTotal(rows: Row[]): number {
    return rows.reduce((sum, r) => sum + (getValue(r) ?? 0), 0);
  }

  const totalExpenses = data.config.reduce((s, sec) => s + sectionTotal(sec), 0);
  const totalIncome = sectionTotal(data.income);
  const gap = totalIncome - totalExpenses;

  // ---------------------------------------------------------------------------
  // Collapse toggle
  // ---------------------------------------------------------------------------
  function toggleSection(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ---------------------------------------------------------------------------
  // Structural edits (add / delete row) — persist immediately
  // ---------------------------------------------------------------------------
  function addRowToSection(sectionId: string, subcategoryId?: string) {
    const label = window.prompt('New row label:')?.trim();
    if (!label) return;
    const newRow: Row = { id: `custom-${shortId()}`, label, defaultValue: 0 };
    const isIncome = sectionId === data.income.id;
    if (isIncome) {
      const next: BudgetProfileData = {
        ...data,
        income: { ...data.income, rows: [...(data.income.rows ?? []), newRow] },
      };
      persist(next);
      return;
    }
    const nextConfig = data.config.map(sec => {
      if (sec.id !== sectionId) return sec;
      if (subcategoryId && sec.subcategories) {
        return {
          ...sec,
          subcategories: sec.subcategories.map(sub =>
            sub.id === subcategoryId ? { ...sub, rows: [...sub.rows, newRow] } : sub
          ),
        };
      }
      return { ...sec, rows: [...(sec.rows ?? []), newRow] };
    });
    persist({ ...data, config: nextConfig });
  }

  function deleteRow(sectionId: string, rowId: string, subcategoryId?: string) {
    if (!window.confirm('Delete this row?')) return;
    // Clean up any override for this row
    setOverrides(prev => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
    const isIncome = sectionId === data.income.id;
    if (isIncome) {
      const next: BudgetProfileData = {
        ...data,
        income: { ...data.income, rows: (data.income.rows ?? []).filter(r => r.id !== rowId) },
      };
      persist(next);
      return;
    }
    const nextConfig = data.config.map(sec => {
      if (sec.id !== sectionId) return sec;
      if (subcategoryId && sec.subcategories) {
        return {
          ...sec,
          subcategories: sec.subcategories.map(sub =>
            sub.id === subcategoryId ? { ...sub, rows: sub.rows.filter(r => r.id !== rowId) } : sub
          ),
        };
      }
      return { ...sec, rows: (sec.rows ?? []).filter(r => r.id !== rowId) };
    });
    persist({ ...data, config: nextConfig });
  }

  // ---------------------------------------------------------------------------
  // Snapshots
  // ---------------------------------------------------------------------------
  async function saveSnapshot() {
    if (!modalTitle.trim()) return;
    const snap: Snapshot = {
      title: modalTitle.trim(),
      rationale: modalRationale.trim(),
      timestamp: new Date().toISOString(),
      values: { ...overrides },
    };
    const nextSnaps = [snap, ...data.snapshots];
    setShowModal(false);
    setModalTitle('');
    setModalRationale('');
    await persist({ ...data, snapshots: nextSnaps });
  }
  function restoreSnapshot(snap: Snapshot) {
    setOverrides(snap.values);
    setMode('edit');
  }
  async function deleteSnapshot(idx: number) {
    const nextSnaps = data.snapshots.filter((_, i) => i !== idx);
    await persist({ ...data, snapshots: nextSnaps });
  }
  function resetToDefaults() { setOverrides({}); }

  // ---------------------------------------------------------------------------
  // Row rendering
  // ---------------------------------------------------------------------------
  function RowCells({ row, sectionId, subcategoryId }: { row: Row; sectionId: string; subcategoryId?: string }) {
    const val = getValue(row);
    return (
      <tr>
        <td className="label">
          {mode === 'edit' && (
            <button
              type="button"
              className="row-del"
              onClick={() => deleteRow(sectionId, row.id, subcategoryId)}
              aria-label={`Delete ${row.label}`}
              title="Delete row"
            >×</button>
          )}
          <span className="label-text">{row.label}</span>
        </td>
        {mode === 'view' ? (
          val === null
            ? <td className="amount monthly missing">—</td>
            : <td className={`amount monthly${row.estimate ? ' estimate' : ''}`}>${fmt(val)}</td>
        ) : (
          <td className="amount monthly" style={{ padding: '0.2rem 1rem' }}>
            <input
              type="number"
              step="0.01"
              value={getEditValue(row)}
              onChange={e => setOverride(row.id, parseFloat(e.target.value) || 0)}
              className="amount-input"
            />
          </td>
        )}
        {val === null
          ? <td className="amount missing">—</td>
          : <td className={`amount${row.estimate ? ' estimate' : ''}`}>${fmt(val * 12)}</td>}
        <td className="notes">
          {row.notesUncertain ? <span className="uncertain">{row.notes}</span> : row.notes ?? ''}
        </td>
      </tr>
    );
  }

  function SectionTotalRow({ total }: { total: number }) {
    return (
      <tr className="total-row">
        <td className="label">Total</td>
        <td className="amount monthly">${fmt(total)}</td>
        <td className="amount">${fmt(total * 12)}</td>
        <td className="notes"></td>
      </tr>
    );
  }
  function SubtotalRow({ total, label = 'Subtotal' }: { total: number; label?: string }) {
    return (
      <tr className="subtotal-row">
        <td className="label">{label}</td>
        <td className="amount monthly">${fmt(total)}</td>
        <td className="amount">${fmt(total * 12)}</td>
        <td className="notes"></td>
      </tr>
    );
  }
  function AddRowButtonRow({ sectionId, subcategoryId }: { sectionId: string; subcategoryId?: string }) {
    if (mode !== 'edit') return null;
    return (
      <tr className="add-row">
        <td colSpan={4}>
          <button
            type="button"
            className="add-row-btn"
            onClick={() => addRowToSection(sectionId, subcategoryId)}
          >+ Add row{subcategoryId ? ' to this subcategory' : ''}</button>
        </td>
      </tr>
    );
  }

  function SectionCard({ section, income }: { section: SectionConfig; income?: boolean }) {
    const isCollapsed = collapsed.has(section.id);
    const total = sectionTotal(section);
    return (
      <div className={`section ${section.colorClass}${section.wide ? ' wide' : ''}`}>
        <button
          type="button"
          className="section-header"
          onClick={() => toggleSection(section.id)}
          aria-expanded={!isCollapsed}
        >
          <span className="chev">{isCollapsed ? '▶' : '▼'}</span>
          <span className="hdr-label">{section.label}</span>
          <span className="hdr-total">${fmt(total)} / mo</span>
        </button>
        {!isCollapsed && (
          <table>
            <thead>
              <tr>
                <th className="label"></th>
                <th>Monthly</th>
                <th>Annual</th>
                <th className="label">Notes</th>
              </tr>
            </thead>
            <tbody>
              {section.subcategories ? (
                section.subcategories.flatMap(sub => [
                  <tr key={`${sub.id}-h`} className="subcat-header"><td colSpan={4}>{sub.label}</td></tr>,
                  ...sub.rows.map(r => (
                    <RowCells key={r.id} row={r} sectionId={section.id} subcategoryId={sub.id} />
                  )),
                  <SubtotalRow key={`${sub.id}-sub`} total={rowsTotal(sub.rows)} />,
                  ...(mode === 'edit'
                    ? [<AddRowButtonRow key={`${sub.id}-add`} sectionId={section.id} subcategoryId={sub.id} />]
                    : []),
                ])
              ) : (
                (section.rows ?? []).map(r => (
                  <RowCells key={r.id} row={r} sectionId={section.id} />
                ))
              )}
              {!section.subcategories && income ? (
                <tr className="total-row income-row">
                  <td className="label">Total Income</td>
                  <td className="amount monthly">${fmt(total)}</td>
                  <td className="amount">${fmt(total * 12)}</td>
                  <td className="notes"></td>
                </tr>
              ) : (
                <SectionTotalRow total={total} />
              )}
              {section.weekly && (
                <tr className="weekly-row">
                  <td className="label">Weekly</td>
                  <td className="amount monthly">—</td>
                  <td className="amount">${fmt(total * 12 / 52)}</td>
                  <td className="notes"></td>
                </tr>
              )}
              {!section.subcategories && <AddRowButtonRow sectionId={section.id} />}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  // Summary section (computed; not user-editable)
  function SummaryCard() {
    const id = 'summary';
    const isCollapsed = collapsed.has(id);
    return (
      <div className="section summary wide">
        <button
          type="button"
          className="section-header"
          onClick={() => toggleSection(id)}
          aria-expanded={!isCollapsed}
        >
          <span className="chev">{isCollapsed ? '▶' : '▼'}</span>
          <span className="hdr-label">Summary</span>
          <span className="hdr-total">Gap ${fmt(gap)} / mo</span>
        </button>
        {!isCollapsed && (
          <table>
            <thead>
              <tr>
                <th className="label">Category</th>
                <th>Monthly</th>
                <th>Annual</th>
                <th className="label">Notes</th>
              </tr>
            </thead>
            <tbody>
              {data.config.map(sec => {
                const tot = sectionTotal(sec);
                return (
                  <tr key={sec.id}>
                    <td className="label">{sec.label}</td>
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
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------
  return (
    <>
      <style>{`
        /* Sticky header — responsive, wraps on narrow viewports.
           Right padding of 60px reserves room for the fixed hamburger menu. */
        .budget-sticky {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 200;
          background: #1a1a1a;
          color: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .sticky-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          min-height: 48px;
          padding: 4px 60px 4px 12px;
          gap: 6px 10px;
          font-size: 0.82rem;
        }
        .sticky-home {
          background: none;
          border: 1px solid rgba(255,255,255,0.18);
          color: rgba(255,255,255,0.85);
          border-radius: 5px;
          padding: 6px 10px;
          font-size: 0.78rem;
          cursor: pointer;
          text-decoration: none;
          white-space: nowrap;
          transition: background 0.15s;
        }
        .sticky-home:hover { background: rgba(255,255,255,0.1); }
        .profile-switcher {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .profile-tab {
          background: none;
          border: 1px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.6);
          border-radius: 5px;
          padding: 5px 10px;
          font-size: 0.75rem;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .profile-tab:hover { color: rgba(255,255,255,0.85); border-color: rgba(255,255,255,0.35); }
        .profile-tab.active { background: rgba(255,255,255,0.14); border-color: rgba(255,255,255,0.5); color: #fff; font-weight: 600; }
        .sticky-stats {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px 14px;
          font-size: 0.78rem;
        }
        .sticky-stat { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
        .sticky-stat .label { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.07em; color: rgba(255,255,255,0.45); white-space: nowrap; }
        .sticky-stat .value { font-size: 0.86rem; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .sticky-stat.expenses .value { color: #f28b70; }
        .sticky-stat.income   .value { color: #6ecfa8; }
        .sticky-stat.gap      .value { color: #ffd17a; }
        .sticky-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-left: auto;
        }
        .sticky-btn {
          background: none;
          border: 1px solid rgba(255,255,255,0.28);
          color: rgba(255,255,255,0.85);
          border-radius: 20px;
          padding: 5px 12px;
          font-size: 0.75rem;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s, border-color 0.15s;
          font-family: inherit;
          min-height: 30px;
        }
        .sticky-btn:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.45); }
        .sticky-btn.active { background: rgba(255,255,255,0.14); border-color: rgba(255,255,255,0.55); color: #fff; }
        .sticky-btn.record { border-color: #f28b70; color: #f28b70; }
        .sticky-btn.record:hover { background: rgba(242,139,112,0.14); }
        .sticky-btn.reset { border-color: #ffd17a; color: #ffd17a; }
        .sticky-btn.reset:hover { background: rgba(255,209,122,0.12); }
        .edit-hint {
          padding: 5px 60px 5px 12px;
          background: rgba(90,122,168,0.20);
          color: #cfd8ea;
          font-size: 0.75rem;
          border-top: 1px solid rgba(255,255,255,0.08);
        }

        /* Layout */
        .budget-wrap * { box-sizing: border-box; margin: 0; padding: 0; }
        .budget-wrap {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #f5f5f0;
          color: #222;
          padding: 1.25rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .budget-wrap h1 { font-size: 1.5rem; margin-bottom: 0.25rem; color: #111; }
        .subtitle { color: #888; font-size: 0.85rem; margin-bottom: 1.5rem; }
        .notice {
          background: #fff8e1;
          border-left: 3px solid #f0c040;
          padding: 0.55rem 0.9rem;
          font-size: 0.82rem;
          margin-bottom: 1.5rem;
          color: #555;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(360px, 100%), 1fr));
          gap: 1rem;
        }
        .section {
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          overflow: hidden;
        }
        .section.wide { grid-column: 1 / -1; }

        /* Section header — click to toggle collapse */
        .section-header {
          all: unset;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 0.65rem 0.9rem;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #fff;
          cursor: pointer;
          min-height: 42px;
          user-select: none;
        }
        .section-header:hover { filter: brightness(1.08); }
        .section-header:focus-visible { outline: 2px solid rgba(255,255,255,0.7); outline-offset: -3px; }
        .section-header .chev { font-size: 0.7rem; opacity: 0.85; width: 12px; text-align: center; }
        .section-header .hdr-label { flex: 1; }
        .section-header .hdr-total { font-variant-numeric: tabular-nums; font-weight: 700; text-transform: none; letter-spacing: 0; font-size: 0.82rem; opacity: 0.95; }

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
          padding: 0.3rem 0.9rem;
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
          padding: 0.45rem 0.9rem;
          border-bottom: 1px solid #f0f0f0;
          vertical-align: top;
        }
        .budget-wrap tr:last-child td { border-bottom: none; }
        .budget-wrap td.label { color: #333; display: flex; align-items: center; gap: 6px; }
        .budget-wrap td.label .label-text { flex: 1; }
        .budget-wrap td.amount {
          text-align: right;
          font-variant-numeric: tabular-nums;
          color: #333;
          white-space: nowrap;
        }
        .budget-wrap td.amount.monthly { color: #888; }
        .budget-wrap td.notes { color: #888; font-size: 0.78rem; }
        .budget-wrap tr.total-row td {
          font-weight: 700;
          background: #fafafa;
          border-top: 2px solid #e0e0e0;
          color: #111;
        }
        .budget-wrap tr.weekly-row td { color: #aaa; font-size: 0.8rem; font-style: italic; }
        .budget-wrap tr.subcat-header td {
          padding: 0.5rem 0.9rem 0.25rem;
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
        .uncertain { color: #c09050; font-size: 0.72rem; margin-left: 4px; }
        .missing { color: #bbb; font-style: italic; }
        .estimate { color: #888; font-style: italic; }
        .budget-wrap tr.income-row td { color: #3a7a7a; }
        .budget-wrap tr.expense-row td { color: #c0674f; }
        .budget-wrap tr.gap-row td { color: #555; }

        /* Edit-mode row controls */
        .row-del {
          all: unset;
          box-sizing: border-box;
          width: 26px;
          height: 26px;
          min-width: 26px;
          border-radius: 50%;
          background: #fdecec;
          color: #c44;
          font-size: 15px;
          line-height: 1;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
        }
        .row-del:hover { background: #f8caca; color: #a22; }
        .row-del:focus-visible { outline: 2px solid #c44; outline-offset: 2px; }
        tr.add-row td {
          padding: 0.35rem 0.9rem;
          background: #fafafa;
          border-top: 1px solid #eee;
        }
        .add-row-btn {
          all: unset;
          box-sizing: border-box;
          display: block;
          width: 100%;
          min-height: 40px;
          padding: 0.5rem 0.9rem;
          text-align: center;
          border: 1px dashed #cfd1d6;
          border-radius: 6px;
          color: #5a7aa8;
          font-size: 0.82rem;
          font-family: inherit;
          cursor: pointer;
          background: #fff;
          transition: background 0.15s, border-color 0.15s;
        }
        .add-row-btn:hover { background: rgba(90,122,168,0.06); border-color: #5a7aa8; }

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
        .amount-input:focus { background: rgba(90, 122, 168, 0.07); border-radius: 3px; }
        .amount-input::-webkit-outer-spin-button,
        .amount-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .amount-input[type=number] { -moz-appearance: textfield; }

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
          padding: 1.5rem;
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
          margin-top: 2rem;
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
          flex-wrap: wrap;
        }
        .snapshot-info { flex: 1; min-width: 180px; }
        .snapshot-title { font-weight: 600; font-size: 0.9rem; color: #222; margin-bottom: 0.2rem; }
        .snapshot-meta { font-size: 0.75rem; color: #888; margin-bottom: 0.3rem; }
        .snapshot-rationale { font-size: 0.82rem; color: #555; }
        .snapshot-actions { display: flex; gap: 0.4rem; align-items: center; }
        .snap-btn {
          border-radius: 4px;
          padding: 6px 12px;
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

        /* Very narrow — tighten further */
        @media (max-width: 480px) {
          .sticky-row { font-size: 0.78rem; }
          .sticky-home { padding: 5px 8px; font-size: 0.74rem; }
          .profile-tab { padding: 4px 8px; font-size: 0.72rem; }
          .sticky-stat .label { font-size: 0.6rem; }
          .sticky-stat .value { font-size: 0.8rem; }
          .sticky-btn { padding: 4px 10px; font-size: 0.72rem; }
          .budget-wrap { padding: 0.85rem; }
          .budget-wrap h1 { font-size: 1.3rem; }
          .section-header { padding: 0.55rem 0.7rem; font-size: 0.72rem; }
          .section-header .hdr-total { font-size: 0.78rem; }
          .budget-wrap td { padding: 0.4rem 0.6rem; font-size: 0.82rem; }
          .budget-wrap thead th { padding: 0.3rem 0.6rem; font-size: 0.66rem; }
          .amount-input { width: 70px; }
        }
      `}</style>

      {/* STICKY HEADER (measured for content offset) */}
      <div className="budget-sticky" ref={stickyRef}>
        <div className="sticky-row">
          <a href="/" className="sticky-home">← Home</a>
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
          <div className="sticky-stats">
            <div className="sticky-stat expenses">
              <span className="label">Expenses</span>
              <span className="value">${fmt(totalExpenses)}/mo</span>
            </div>
            <div className="sticky-stat income">
              <span className="label">Income</span>
              <span className="value">${fmt(totalIncome)}/mo</span>
            </div>
            <div className="sticky-stat gap">
              <span className="label">Gap</span>
              <span className="value">${fmt(gap)}/mo</span>
            </div>
          </div>
          <div className="sticky-actions">
            {mode === 'edit' && (
              <button className="sticky-btn reset" onClick={resetToDefaults} title="Reset all values to defaults">
                Reset
              </button>
            )}
            {mode === 'edit' && (
              <button className="sticky-btn record" onClick={() => setShowModal(true)}>
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
        </div>
        {mode === 'edit' && (
          <div className="edit-hint">
            Editing — amounts are monthly. Annual updates live. Use × to delete a row, + to add.
          </div>
        )}
      </div>

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

      <div className="budget-wrap" style={{ paddingTop: topOffset }}>
        <h1>Annual Budget — {PROFILES.find(p => p.id === activeProfile)?.label}</h1>
        <p className="subtitle">2026 · Tap a section header to expand</p>

        <div className="notice">
          ⚠ Annual taxes owed may not be fully reflected in the expense total. Some subscription amounts are still unknown.
        </div>

        <div className="grid">
          {data.config.map(sec => <SectionCard key={sec.id} section={sec} />)}
          <SectionCard section={data.income} income />
          <SummaryCard />
        </div>

        <div className="snapshots-section">
          <h2>Saved Snapshots</h2>
          {data.snapshots.length === 0 ? (
            <p className="no-snapshots">No snapshots saved yet. Use Edit mode and click Record to save one.</p>
          ) : (
            data.snapshots.map((snap, idx) => (
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
