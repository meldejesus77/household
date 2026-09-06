'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ssBenefit,
  healthCosts,
  simulate,
  runMonteCarlo,
  deterministicRate,
  MB, KB, NOW,
  type Params,
  type MonteCarloResult,
  type SimResult,
} from '@/lib/retirement-math';

// ─── Formatting helpers ─────────────────────────────────────────────────────
const fc = (v: number) => '$' + Math.round(v).toLocaleString();
const fp = (v: number) => v.toFixed(1) + '%';

// ─── Slider config: id → [min, max, step, default, format] ──────────────────
type SliderDef = {
  key: keyof Sliders;
  label: React.ReactNode;
  min: number; max: number; step: number;
  fmt: (n: number) => string;
};

interface Sliders {
  kra: number; mra: number;
  mi: number; ki: number; oth: number;
  tax: number; raise: number;
  exp: number; sav: number; irac: number;
  rhi: number; rlo: number; cage: number;
  inf: number; hinf: number;
  mkt: number; msupp: number;
  ltcp: number; ltcage: number; ltccost: number; ltcdur: number;
  edusav: number; educon: number; edugrow: number;
  k8cost: number; hscost: number; colcost: number; coldur: number;
  mss: number; mssAge: number;
  kss: number; kssAge: number;
}

const DEFAULTS: Sliders = {
  kra: 62, mra: 62,
  mi: 130000, ki: 80000, oth: 7000,
  tax: 30, raise: 2.5,
  exp: 100000, sav: 1400000, irac: 14000,
  rhi: 15, rlo: 4.5, cage: 60,
  inf: 2.5, hinf: 6,
  mkt: 24000, msupp: 10000,
  ltcp: 6000, ltcage: 0, ltccost: 90000, ltcdur: 3,
  edusav: 70000, educon: 6000, edugrow: 5,
  k8cost: 10000, hscost: 0, colcost: 30000, coldur: 4,
  mss: 1100, mssAge: 62,
  kss: 1000, kssAge: 62,
};

const RISK: Record<'low' | 'med' | 'high', [number, number]> = {
  low: [0.08, 0.03], med: [0.12, 0.05], high: [0.18, 0.08],
};

// ─── Section config ─────────────────────────────────────────────────────────
type Section = {
  id: string;
  title: string;
  emoji: string;
  info?: React.ReactNode;
  sliders: SliderDef[];
};

const SECTIONS: Section[] = [
  {
    id: 'income',
    title: 'Income While Working',
    emoji: '💼',
    sliders: [
      { key: 'mi',    label: 'Mel gross annual income',      min: 50000, max: 300000, step: 1000, fmt: fc },
      { key: 'ki',    label: 'Kathy gross annual income',    min: 30000, max: 200000, step: 1000, fmt: fc },
      { key: 'oth',   label: 'Other income (rentals, FSA)',  min: 0,     max: 80000,  step: 500,  fmt: fc },
      { key: 'tax',   label: 'Combined tax rate (%)',        min: 10,    max: 50,     step: 1,    fmt: fp },
      { key: 'raise', label: 'Annual salary raise (%)',      min: 0,     max: 6,      step: 0.25, fmt: fp },
    ],
  },
  {
    id: 'finances',
    title: 'Finances',
    emoji: '💰',
    sliders: [
      { key: 'exp',     label: 'Annual household expenses',                                  min: 40000, max: 250000,  step: 1000, fmt: fc },
      { key: 'irac',    label: 'Annual IRA contribution (while at least one is working)',   min: 0,     max: 30000,   step: 500,  fmt: fc },
      { key: 'sav',     label: 'Pooled retirement savings (excludes edu fund)',             min: 50000, max: 3000000, step: 5000, fmt: fc },
      { key: 'rhi',     label: 'Aggressive growth rate (%)',                                min: 5,     max: 25,      step: 0.5,  fmt: fp },
      { key: 'rlo',     label: 'Conservative growth rate (%)',                              min: 1,     max: 10,      step: 0.5,  fmt: fp },
      { key: 'cage',    label: 'Switch to conservative (Mel age)',                          min: 55,    max: 68,      step: 1,    fmt: (v) => String(v) },
      { key: 'inf',     label: 'Inflation rate (%)',                                        min: 1,     max: 6,       step: 0.25, fmt: fp },
      { key: 'hinf',    label: 'Healthcare inflation rate (%)',                             min: 2,     max: 12,      step: 0.5,  fmt: fp },
      { key: 'mkt',     label: 'Marketplace insurance/person/yr',                           min: 5000,  max: 40000,   step: 500,  fmt: fc },
      { key: 'msupp',   label: 'Medicare supplement/person/yr',                             min: 2000,  max: 10000,   step: 100,  fmt: fc },
    ],
  },
  {
    id: 'ltc',
    title: 'Long-Term Care',
    emoji: '🏥',
    info: (
      <>
        <p><strong>What LTC insurance covers:</strong> Help with <em>activities of daily living</em> (ADLs) — bathing, dressing, eating, transferring, toileting, continence. Typically triggers when you can&apos;t do 2 of 6 without help. Covers nursing homes, assisted living, and in-home aides.</p>
        <p style={{ marginTop: 8 }}><strong>What it does NOT cover:</strong> Vision loss alone, hearing loss alone, or skilled medical care (that&apos;s Medicare / regular insurance). Losing your sight only triggers benefits if you <em>also</em> can&apos;t do 2+ ADLs without help.</p>
        <p style={{ marginTop: 8 }}><strong>Use one or the other:</strong> The premium slider assumes you&apos;re insured (you pay yearly, insurance pays if you need care). The event sliders assume you&apos;re self-insuring (you pay the full nursing cost when it happens). Don&apos;t enable both.</p>
      </>
    ),
    sliders: [
      { key: 'ltcp',    label: 'Annual LTC insurance premium (combined)',    min: 0, max: 12000,  step: 250, fmt: fc },
      { key: 'ltcage',  label: "LTC event: Mel's age it begins (0 = off)",   min: 0, max: 90,     step: 1,   fmt: (v) => v === 0 ? 'Disabled' : String(v) },
      { key: 'ltccost', label: 'LTC event: annual cost (nursing/home aide)', min: 0, max: 150000, step: 5000, fmt: fc },
      { key: 'ltcdur',  label: 'LTC event: duration (years)',                min: 1, max: 10,     step: 1,    fmt: (v) => v + ' yrs' },
    ],
  },
  {
    id: 'education',
    title: "Jo's Education (born Oct 2018)",
    emoji: '🎓',
    info: (
      <>
        <p><strong>K-8 tuition</strong> is already inside your household expenses slider. When Jo enters HS in 2032, that amount is released back to your surplus.</p>
        <p style={{ marginTop: 8 }}><strong>HS &amp; college</strong> are paid from this education fund. If the fund runs out mid-college, the shortfall pulls from your retirement fund.</p>
      </>
    ),
    sliders: [
      { key: 'edusav',  label: 'Education fund current balance',            min: 0, max: 300000, step: 1000, fmt: fc },
      { key: 'educon',  label: 'Annual contribution to fund',               min: 0, max: 20000,  step: 500,  fmt: fc },
      { key: 'edugrow', label: 'Education fund growth rate (%)',            min: 1, max: 10,     step: 0.5,  fmt: fp },
      { key: 'k8cost',  label: 'K-8 annual tuition (already in expenses)',  min: 0, max: 30000,  step: 500,  fmt: fc },
      { key: 'hscost',  label: 'HS annual cost (0 = public)',               min: 0, max: 40000,  step: 500,  fmt: fc },
      { key: 'colcost', label: 'College annual cost',                       min: 0, max: 90000,  step: 1000, fmt: fc },
      { key: 'coldur',  label: 'College duration (0=none, 4=BA, 6=BA+MA)',  min: 0, max: 10,     step: 1,    fmt: (v) => v === 0 ? 'None' : v + ' yrs' },
    ],
  },
  {
    id: 'ss',
    title: 'Social Security',
    emoji: '🏛️',
    info: (
      <p>Enter your estimated monthly benefit <strong>at age 62</strong> (from SSA.gov). The app applies the official SSA formula (FRA = 67) to translate that into your chosen claim age.</p>
    ),
    sliders: [
      { key: 'mss',    label: 'Mel monthly SS benefit at age 62',   min: 500, max: 2500, step: 50, fmt: (v) => '$' + Math.round(v).toLocaleString() + '/mo' },
      { key: 'mssAge', label: 'Mel — claim SS at age',              min: 62,  max: 70,   step: 1,  fmt: (v) => String(v) },
      { key: 'kss',    label: 'Kathy monthly SS benefit at age 62', min: 500, max: 2500, step: 50, fmt: (v) => '$' + Math.round(v).toLocaleString() + '/mo' },
      { key: 'kssAge', label: 'Kathy — claim SS at age',            min: 62,  max: 70,   step: 1,  fmt: (v) => String(v) },
    ],
  },
];

// ─── Map slider state → Params ──────────────────────────────────────────────
function toParams(s: Sliders, riskLevel: 'low' | 'med' | 'high'): Params {
  return {
    kra: s.kra, mra: s.mra,
    mi: s.mi, ki: s.ki, oth: s.oth,
    tax: s.tax / 100, raise: s.raise / 100,
    exp: s.exp, sav: s.sav, irac: s.irac,
    rhi: s.rhi / 100, rlo: s.rlo / 100, cage: s.cage,
    inf: s.inf / 100, hinf: s.hinf / 100,
    mkt: s.mkt, msupp: s.msupp,
    ltcp: s.ltcp, ltcage: s.ltcage, ltccost: s.ltccost, ltcdur: s.ltcdur,
    edusav: s.edusav, educon: s.educon, edugrow: s.edugrow / 100,
    k8cost: s.k8cost, hscost: s.hscost, colcost: s.colcost, coldur: s.coldur,
    mss62: s.mss, kss62: s.kss,
    mssAge: s.mssAge, kssAge: s.kssAge,
    volHi: RISK[riskLevel][0], volLo: RISK[riskLevel][1],
  };
}

// ─── Chart (SVG) ────────────────────────────────────────────────────────────
function Chart({ det, mc }: { det: SimResult; mc: MonteCarloResult }) {
  const { lbl, bal, ssa, drw, hlt, fry } = det;
  const W = 560, H = 200, pl = 60, pr = 50, pt = 14, pb = 28;
  const cw = W - pl - pr, ch = H - pt - pb, n = lbl.length;
  if (!n) return null;

  const maxB = Math.max(...bal, ...mc.p90, 1);
  const maxF = Math.max(...ssa, ...drw, ...hlt, 1);
  const bw = Math.max(1, cw / n - 0.5);

  const bx = (i: number) => pl + cw * i / (n - 1);
  const byB = (v: number) => pt + ch * (1 - v / maxB);
  const byF = (v: number) => pt + ch * (1 - v / maxF);

  const gridLines = [];
  for (let i = 0; i <= 4; i++) {
    const y = pt + ch * (1 - i / 4);
    const vB = maxB * i / 4;
    const vF = maxF * i / 4;
    gridLines.push(
      <g key={i}>
        <line x1={pl} y1={y} x2={pl + cw} y2={y} stroke="#ddd" strokeWidth={0.5} />
        <text x={pl - 4} y={y + 3} textAnchor="end" fontSize={9} fill="#888">
          {vB >= 1e6 ? (vB / 1e6).toFixed(1) + 'M' : (vB / 1e3).toFixed(0) + 'K'}
        </text>
        <text x={pl + cw + 4} y={y + 3} textAnchor="start" fontSize={9} fill="#aaa">
          {vF >= 1e3 ? (vF / 1e3).toFixed(0) + 'K' : '0'}
        </text>
      </g>
    );
  }

  const xLabels = [];
  const step = Math.ceil(n / 9);
  for (let j = 0; j < n; j += step) {
    xLabels.push(
      <text key={j} x={bx(j)} y={H - 6} textAnchor="middle" fontSize={9} fill="#888">
        {lbl[j]}
      </text>
    );
  }

  const bandLen = Math.min(n, mc.p10.length);
  let bandPath: string | null = null;
  if (bandLen > 1) {
    const top: string[] = [], bot: string[] = [];
    for (let b = 0; b < bandLen; b++) {
      top.push(`${bx(b).toFixed(1)},${byB(mc.p90[b]).toFixed(1)}`);
      bot.push(`${bx(b).toFixed(1)},${byB(mc.p10[b]).toFixed(1)}`);
    }
    bandPath = 'M ' + top.join(' L ') + ' L ' + bot.slice().reverse().join(' L ') + ' Z';
  }

  const bars = bal.map((v, i) => {
    const bh = ch * v / maxB;
    return <rect key={i} x={bx(i) - bw / 2} y={pt + ch - bh} width={bw} height={bh} fill="rgba(60,120,200,0.6)" />;
  });

  const fri = lbl.indexOf(fry);
  const retireLine = fri >= 0 ? (
    <line x1={bx(fri)} y1={pt} x2={bx(fri)} y2={pt + ch} stroke="#888" strokeWidth={1} strokeDasharray="3,3" />
  ) : null;

  const pathFor = (arr: number[]) =>
    arr.map((v, k) => `${k === 0 ? 'M' : 'L'}${bx(k).toFixed(1)},${byF(v).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
      {gridLines}
      {xLabels}
      {bandPath && <path d={bandPath} fill="rgba(100,160,220,0.25)" stroke="none" />}
      {bars}
      {retireLine}
      <path d={pathFor(ssa)} fill="none" stroke="#22aa66" strokeWidth={2} />
      <path d={pathFor(drw)} fill="none" stroke="#cc3322" strokeWidth={2} strokeDasharray="5,3" />
      <path d={pathFor(hlt)} fill="none" stroke="#dd8800" strokeWidth={2} strokeDasharray="2,2" />
    </svg>
  );
}

// ─── Outcome card with flash-on-change + baseline delta ─────────────────────
type CardProps = {
  label: string;
  value: string;
  numeric?: number | null;         // for delta computation
  baseline?: number | null;
  higherIsBetter?: boolean;
  formatDelta?: (delta: number) => string;
  cls?: string;
};
function OutcomeCard({ label, value, numeric = null, baseline = null, higherIsBetter = true, formatDelta, cls = '' }: CardProps) {
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const prevRef = useRef<string>(value);

  useEffect(() => {
    if (prevRef.current !== value) {
      if (numeric !== null && baseline !== null) {
        // deltas guide direction if we have them; otherwise fall back to none
      }
      // Use previous numeric if available via data attribute; simpler: compare strings and pulse gray-ish.
      // We derive direction from numeric compared to prev-value's numeric via a ref.
      // For simplicity, keep a numeric ref.
      const dir = detectDir(prevRef.current, value, higherIsBetter);
      setFlash(dir);
      prevRef.current = value;
      const t = setTimeout(() => setFlash(null), 900);
      return () => clearTimeout(t);
    }
  }, [value, higherIsBetter, numeric, baseline]);

  const delta = (baseline !== null && numeric !== null && numeric !== baseline)
    ? formatDelta ? formatDelta(numeric - baseline) : (numeric - baseline > 0 ? '+' : '') + Math.round(numeric - baseline)
    : null;

  const deltaClass = delta && numeric !== null && baseline !== null
    ? ((numeric - baseline > 0) === higherIsBetter ? 'delta-good' : 'delta-bad')
    : '';

  return (
    <div className={`card ${flash ? 'flash-' + flash : ''}`}>
      <div className="cl">{label}</div>
      <div className={`cn ${cls}`}>{value}</div>
      {delta && <div className={`delta ${deltaClass}`}>{delta}</div>}
    </div>
  );
}

// Try to detect direction from two formatted strings by stripping non-numerics.
function detectDir(prev: string, curr: string, higherIsBetter: boolean): 'up' | 'down' | null {
  const parse = (s: string) => {
    const clean = s.replace(/[^0-9.-]/g, '');
    const n = parseFloat(clean);
    return Number.isFinite(n) ? n : null;
  };
  const pv = parse(prev), cv = parse(curr);
  if (pv === null || cv === null || pv === cv) return null;
  const isUp = cv > pv;
  return (isUp === higherIsBetter) ? 'up' : 'down';
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function RetirementClient() {
  const [sliders, setSliders] = useState<Sliders>(DEFAULTS);
  const [riskLevel, setRiskLevel] = useState<'low' | 'med' | 'high'>('med');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(SECTIONS.map(s => s.id)));
  const [openInfo, setOpenInfo] = useState<Set<string>>(new Set());
  const [baseline, setBaseline] = useState<null | {
    fundAtRetire: number;
    yrExp: number;
    depYr: number | null;
    fry: number;
    mcProb: number;
    mcMed: number;
  }>(null);

  const setSlider = useCallback(<K extends keyof Sliders>(k: K, v: number) => {
    setSliders(prev => ({ ...prev, [k]: v }));
  }, []);

  const toggleSection = useCallback((id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleInfo = useCallback((id: string) => {
    setOpenInfo(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // ── Simulation results (cheap) ────────────────────────────────────────────
  const params = useMemo(() => toParams(sliders, riskLevel), [sliders, riskLevel]);
  const det = useMemo(() => simulate(params, deterministicRate), [params]);

  // Monte Carlo is heavy; debounce it.
  const [mc, setMc] = useState<MonteCarloResult | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      setMc(runMonteCarlo(params, 2000));
    }, 250);
    return () => clearTimeout(t);
  }, [params]);

  const kRetireYr = KB + sliders.kra;
  const mRetireYr = MB + sliders.mra;
  const firstRetireYr = Math.min(kRetireYr, mRetireYr);
  const fri = det.lbl.indexOf(det.fry);
  const fundAtRetire = fri >= 0 ? det.bal[fri] : det.bal[det.bal.length - 1];
  const yrExp = sliders.exp * Math.pow(1 + sliders.inf / 100, det.fry - NOW);

  const mAdjSS = ssBenefit(sliders.mss, sliders.mssAge);
  const kAdjSS = ssBenefit(sliders.kss, sliders.kssAge);

  const kAge1 = firstRetireYr - KB, mAge1 = firstRetireYr - MB;
  const hc1 = healthCosts(firstRetireYr < kRetireYr, firstRetireYr < mRetireYr, kAge1, mAge1, sliders.mkt, sliders.msupp);
  const healthCssClass = (label: string) => {
    if (label.indexOf('Employer') >= 0 || label.indexOf('On') >= 0) return 'ig';
    if (label.indexOf('Marketplace') >= 0) return 'iw';
    return 'im';
  };

  const saveBaseline = () => {
    setBaseline({
      fundAtRetire,
      yrExp,
      depYr: det.dep,
      fry: det.fry,
      mcProb: mc?.prob ?? 0,
      mcMed: mc?.medRetire ?? 0,
    });
  };
  const clearBaseline = () => setBaseline(null);

  const probPct = mc ? Math.round(mc.prob * 100) : null;
  const probClass = probPct === null ? '' : probPct >= 80 ? 'grn' : probPct >= 60 ? '' : 'red';

  return (
    <>
      <style>{styles}</style>

      <div className="sticky-nav">
        <a href="/" className="home-link">← Home</a>
        <div className="baseline-controls">
          {baseline
            ? <button className="baseline-btn active" onClick={clearBaseline}>× Clear baseline</button>
            : <button className="baseline-btn" onClick={saveBaseline}>📌 Save as baseline</button>}
        </div>
      </div>

      <div className="page">
        <h2>Retirement Planner — Kathy &amp; Mel</h2>

        <div className="two">
          <div className="rbox">
            <h3>👩 Kathy — Retirement Age</h3>
            <div className="row">
              <input type="range" min={53} max={70} step={1} value={sliders.kra} onChange={e => setSlider('kra', Number(e.target.value))} />
              <span className="bignum">{sliders.kra}</span>
            </div>
            <div className="sub">Retires {kRetireYr} · born May 1977</div>
          </div>
          <div className="rbox">
            <h3>👨 Mel — Retirement Age</h3>
            <div className="row">
              <input type="range" min={55} max={70} step={1} value={sliders.mra} onChange={e => setSlider('mra', Number(e.target.value))} />
              <span className="bignum">{sliders.mra}</span>
            </div>
            <div className="sub">Retires {mRetireYr} · born April 1970</div>
          </div>
        </div>

        <div className="sec">
          <h3>🏥 Health Insurance at First Retirement</h3>
          <div className="igrid">
            <div className={`ibox ${healthCssClass(hc1.ks)}`}>
              <strong>Kathy (age {kAge1})</strong><br />
              {hc1.ks}<br />
              {hc1.kc > 0 ? fc(hc1.kc) + '/yr' : '$0 — covered'}
            </div>
            <div className={`ibox ${healthCssClass(hc1.ms)}`}>
              <strong>Mel (age {mAge1})</strong><br />
              {hc1.ms}<br />
              {hc1.mc > 0 ? fc(hc1.mc) + '/yr' : '$0 — covered'}
            </div>
          </div>
        </div>

        {SECTIONS.map(section => {
          const isCollapsed = collapsed.has(section.id);
          const infoOpen = openInfo.has(section.id);
          return (
            <div key={section.id} className="sec">
              <button className="sec-header" onClick={() => toggleSection(section.id)}>
                <span className="sec-chevron">{isCollapsed ? '▶' : '▼'}</span>
                <span className="sec-title">{section.emoji} {section.title}</span>
                {section.info && (
                  <span
                    className={`info-badge ${infoOpen ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleInfo(section.id); }}
                    role="button"
                    aria-label="Show info"
                  >
                    ⓘ
                  </span>
                )}
              </button>

              {infoOpen && section.info && (
                <div className="info-box">{section.info}</div>
              )}

              {!isCollapsed && (
                <div className="sec-body">
                  {section.sliders.map(sl => (
                    <div key={sl.key} className="row">
                      <label>{sl.label}</label>
                      <input
                        type="range"
                        min={sl.min} max={sl.max} step={sl.step}
                        value={sliders[sl.key]}
                        onChange={e => setSlider(sl.key, Number(e.target.value))}
                      />
                      <span className="val">{sl.fmt(sliders[sl.key])}</span>
                    </div>
                  ))}
                  {section.id === 'ss' && (
                    <div className="ss-adj">
                      <div>Mel — adjusted monthly at age {sliders.mssAge}: ${Math.round(mAdjSS).toLocaleString()} (FRA: ${Math.round(sliders.mss / 0.70).toLocaleString()})</div>
                      <div>Kathy — adjusted monthly at age {sliders.kssAge}: ${Math.round(kAdjSS).toLocaleString()} (FRA: ${Math.round(sliders.kss / 0.70).toLocaleString()})</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Monte Carlo */}
        <div className="sec">
          <button className="sec-header" onClick={() => toggleSection('mc')}>
            <span className="sec-chevron">{collapsed.has('mc') ? '▶' : '▼'}</span>
            <span className="sec-title">🎲 Market volatility — What-if scenarios</span>
            <span
              className={`info-badge ${openInfo.has('mc') ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); toggleInfo('mc'); }}
              role="button"
            >ⓘ</span>
          </button>
          {openInfo.has('mc') && (
            <div className="info-box">
              <p>These buttons don&apos;t change your <em>average</em> return — they change how <em>wildly</em> returns swing year-to-year around the average. Runs 2,000 randomized simulations to see how your plan holds up in different market conditions.</p>
              <ul style={{ margin: '8px 0 0 18px' }}>
                <li><strong>Steady market</strong> — small swings, low chance of a bad year</li>
                <li><strong>Normal market</strong> — historical U.S. stock behavior</li>
                <li><strong>Wild market</strong> — big swings, 2008-style crashes possible</li>
              </ul>
            </div>
          )}
          {!collapsed.has('mc') && (
            <div className="sec-body">
              <div className="risk-toggle">
                <button className={riskLevel === 'low' ? 'active' : ''}  onClick={() => setRiskLevel('low')}>Steady market</button>
                <button className={riskLevel === 'med' ? 'active' : ''}  onClick={() => setRiskLevel('med')}>Normal market</button>
                <button className={riskLevel === 'high' ? 'active' : ''} onClick={() => setRiskLevel('high')}>Wild market</button>
              </div>
              <div className="cards">
                <OutcomeCard
                  label="Chance your money lasts to age 90"
                  value={probPct === null ? '…' : probPct + '%'}
                  numeric={mc?.prob ?? null}
                  baseline={baseline?.mcProb ?? null}
                  higherIsBetter={true}
                  formatDelta={(d) => (d > 0 ? '+' : '') + Math.round(d * 100) + '%'}
                  cls={probClass}
                />
                <OutcomeCard
                  label="Typical fund at retirement (middle case)"
                  value={mc ? fc(mc.medRetire) : '…'}
                  numeric={mc?.medRetire ?? null}
                  baseline={baseline?.mcMed ?? null}
                  higherIsBetter={true}
                  formatDelta={(d) => (d > 0 ? '+' : '') + fc(Math.abs(d)).replace('$', '$')}
                />
                <OutcomeCard
                  label="Bad market scenario (10th percentile)"
                  value={mc ? fc(mc.p10Retire) : '…'}
                />
                <OutcomeCard
                  label="Good market scenario (90th percentile)"
                  value={mc ? fc(mc.p90Retire) : '…'}
                />
              </div>
            </div>
          )}
        </div>

        {/* Outcomes */}
        <h3 style={{ fontSize: 15, marginTop: 14, marginBottom: 6 }}>📊 Base outcomes</h3>
        <div className="cards">
          <OutcomeCard
            label="Fund at first retirement"
            value={fc(fundAtRetire)}
            numeric={fundAtRetire}
            baseline={baseline?.fundAtRetire ?? null}
            higherIsBetter={true}
            formatDelta={(d) => (d > 0 ? '+' : '−') + fc(Math.abs(d)).replace('$', '$')}
          />
          <OutcomeCard label="Year-1 retirement expenses" value={fc(yrExp)} />
          <OutcomeCard
            label="Years funds last"
            value={det.dep ? (det.dep - det.fry) + ' yrs' : '>' + (det.lbl[det.lbl.length - 1] - det.fry) + ' yrs'}
            numeric={det.dep ? det.dep - det.fry : 999}
            baseline={baseline ? (baseline.depYr ? baseline.depYr - baseline.fry : 999) : null}
            higherIsBetter={true}
            formatDelta={(d) => (d > 0 ? '+' : '') + Math.round(d) + ' yrs'}
          />
          <OutcomeCard
            label="Depleted year"
            value={det.dep ? String(det.dep) : 'Not depleted'}
            numeric={det.dep ?? 9999}
            baseline={baseline?.depYr ?? (baseline ? 9999 : null)}
            higherIsBetter={true}
            formatDelta={(d) => (d > 0 ? '+' : '') + Math.round(d) + ' yrs'}
            cls={det.dep ? 'red' : ''}
          />
          <OutcomeCard label="Depleted: Mel's age" value={det.dep ? String(det.dep - MB) : '—'} cls={det.dep ? 'red' : ''} />
          <OutcomeCard label="Depleted: Kathy's age" value={det.dep ? String(det.dep - KB) : '—'} cls={det.dep ? 'red' : ''} />
          <OutcomeCard label="Jo's edu fund entering college" value={det.eduAtCol !== null ? fc(det.eduAtCol) : (sliders.coldur > 0 ? '—' : 'N/A')} />
          <OutcomeCard
            label="Jo's edu fund after college (neg = spilled to retirement)"
            value={det.eduAfterCol !== null
              ? (det.eduAfterCol < 0 ? '-$' + Math.abs(det.eduAfterCol).toLocaleString() : fc(det.eduAfterCol))
              : (sliders.coldur > 0 ? 'Not reached' : 'N/A')}
            cls={det.eduAfterCol !== null && det.eduAfterCol < 0 ? 'red' : ''}
          />
        </div>

        <div className="leg">
          <span><span className="dot" style={{ background: '#4488cc' }} />Fund balance (base case)</span>
          <span><span className="dot" style={{ background: 'rgba(100,160,220,0.35)' }} />MC p10–p90 band</span>
          <span><span className="dot" style={{ background: '#22aa66' }} />SS income</span>
          <span><span className="dot" style={{ background: '#cc3322' }} />Net draw</span>
          <span><span className="dot" style={{ background: '#dd8800' }} />Health costs</span>
        </div>

        {mc && <Chart det={det} mc={mc} />}

        <div className="note">
          Key events — Kathy retires: {kRetireYr} (age {sliders.kra}) | Mel retires: {mRetireYr} (age {sliders.mra}) |{' '}
          Conservative shift: {MB + sliders.cage} | Mel SS at {sliders.mssAge}: {MB + sliders.mssAge} | Mel Medicare: {MB + 65} |{' '}
          Kathy SS at {sliders.kssAge}: {KB + sliders.kssAge} | Kathy Medicare: {KB + 65}
        </div>
      </div>
    </>
  );
}

const styles = `
  * { box-sizing: border-box; }
  h2 { font-size: 17px; font-weight: 600; margin: 0 0 12px; }

  .sticky-nav {
    position: fixed; top: 0; left: 0; right: 0; height: 48px; z-index: 200;
    background: #1a1a1a; color: white;
    display: flex; align-items: center; gap: 12px;
    padding: 0 60px 0 16px;
  }
  .home-link {
    color: rgba(255,255,255,0.75); font-size: 13px; text-decoration: none;
    border: 1px solid rgba(255,255,255,0.18); border-radius: 5px; padding: 4px 12px;
  }
  .baseline-controls { margin-left: auto; }
  .baseline-btn {
    padding: 5px 10px; font-size: 12px; border-radius: 5px; cursor: pointer;
    background: transparent; color: white; border: 1px solid rgba(255,255,255,0.3);
  }
  .baseline-btn:hover { background: rgba(255,255,255,0.08); }
  .baseline-btn.active { background: #dc2626; border-color: #dc2626; }

  .page {
    font-family: sans-serif; font-size: 13px;
    background: #f4f4f2; color: #111;
    padding: 12px; padding-top: 60px;
    min-height: 100vh;
  }

  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
  .rbox { background: #d4e8ff; border: 2px solid #4d8fd4; border-radius: 10px; padding: 12px; }
  .rbox h3 { color: #0d4f9e; font-size: 13px; margin: 0 0 8px; }
  .bignum { font-size: 28px; font-weight: 700; color: #0d4f9e; min-width: 48px; text-align: right; }
  .sub { font-size: 11px; color: #336; margin-top: 4px; }

  .sec { background: #e8e8e6; border-radius: 10px; margin-bottom: 10px; overflow: hidden; }
  .sec > h3 { font-size: 13px; font-weight: 600; padding: 12px; margin: 0; }

  .sec-header {
    display: flex; align-items: center; gap: 8px;
    width: 100%; padding: 12px; background: transparent; border: none;
    font-size: 13px; font-weight: 600; text-align: left; cursor: pointer;
    color: #111;
  }
  .sec-header:hover { background: #dedcd7; }
  .sec-chevron { color: #666; font-size: 10px; min-width: 12px; }
  .sec-title { flex: 1; }
  .info-badge {
    display: inline-flex; align-items: center; justify-content: center;
    width: 22px; height: 22px; border-radius: 50%;
    background: #cbd5e1; color: #334155;
    font-size: 12px; font-weight: 700; cursor: pointer;
    user-select: none;
  }
  .info-badge:hover { background: #94a3b8; color: white; }
  .info-badge.active { background: #0d4f9e; color: white; }
  .info-box {
    padding: 12px 16px; margin: 0 12px 8px;
    background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;
    font-size: 12px; color: #1e3a5f; line-height: 1.5;
  }
  .info-box p { margin: 0; }

  .sec-body { padding: 0 12px 12px; }
  .row { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
  .row label { font-size: 12px; color: #444; width: 220px; flex-shrink: 0; }
  .row input[type=range] { flex: 1; min-width: 0; touch-action: pan-y; }
  .val { font-size: 12px; font-weight: 600; min-width: 90px; text-align: right; }

  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; margin-bottom: 10px; }
  .card {
    background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 10px;
    transition: background 0.6s ease, border-color 0.6s ease;
  }
  .card .cl { font-size: 11px; color: #555; margin-bottom: 3px; }
  .card .cn { font-size: 15px; font-weight: 600; }
  .card .delta { font-size: 11px; font-weight: 600; margin-top: 2px; }
  .delta-good { color: #16a34a; }
  .delta-bad { color: #dc2626; }
  .red { color: #b02010 !important; }
  .grn { color: #227700 !important; }

  .flash-up   { background: #ecfdf5; border-color: #86efac; }
  .flash-down { background: #fef2f2; border-color: #fca5a5; }

  .igrid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 0 12px 12px; }
  .ibox { border-radius: 8px; padding: 8px 10px; font-size: 12px; border: 1px solid #bbb; }
  .ig { background: #e4f4cc; border-color: #4a8800; }
  .iw { background: #fff2d8; border-color: #b07000; }
  .im { background: #d4e8ff; border-color: #3377bb; }

  .leg { display: flex; flex-wrap: wrap; gap: 10px; font-size: 12px; color: #444; margin: 6px 0; }
  .dot { width: 10px; height: 10px; border-radius: 2px; display: inline-block; margin-right: 3px; vertical-align: middle; }
  .note { font-size: 11px; color: #666; margin-top: 6px; line-height: 1.8; }
  .ss-adj { font-size: 11px; color: #447; margin-top: 2px; }

  .risk-toggle { display: flex; gap: 6px; margin-bottom: 10px; }
  .risk-toggle button { flex: 1; padding: 7px; border: 2px solid #bbb; border-radius: 8px; background: #fff; font-size: 12px; font-weight: 600; cursor: pointer; color: #555; }
  .risk-toggle button.active { background: #0d4f9e; border-color: #0d4f9e; color: #fff; }

  @media (max-width: 520px) {
    .row { flex-wrap: wrap; }
    .row label { width: 100%; margin-bottom: 2px; }
    .row input[type=range] { flex: 1; }
    .val { min-width: 70px; text-align: right; }
    .igrid { grid-template-columns: 1fr; }
    .risk-toggle { flex-direction: column; }
  }
`;
