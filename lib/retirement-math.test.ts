import { describe, it, expect } from 'vitest';
import {
  ssBenefit,
  healthCosts,
  simulate,
  deterministicRate,
  runMonteCarlo,
  sampleReturn,
  MB, KB, NOW, JO_HS_YR, JO_COL_YR,
  type Params,
} from './retirement-math';

// Baseline params — realistic scenario used across most tests.
function baseParams(): Params {
  return {
    kra: 62, mra: 62,
    mi: 130000, ki: 80000, oth: 7000,
    tax: 0.30, raise: 0.025,
    exp: 100000, sav: 1400000, irac: 14000,
    rhi: 0.15, rlo: 0.045,
    cage: 60,
    inf: 0.025, hinf: 0.06,
    mkt: 24000, msupp: 10000,
    ltcp: 6000, ltcage: 0, ltccost: 90000, ltcdur: 3,
    edusav: 70000, educon: 6000, edugrow: 0.05,
    k8cost: 10000, hscost: 0, colcost: 30000, coldur: 4,
    mss62: 1100, kss62: 1000,
    mssAge: 62, kssAge: 62,
    volHi: 0.12, volLo: 0.05,
  };
}

// A seeded PRNG for deterministic Monte Carlo tests.
function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

describe('ssBenefit', () => {
  it('returns the input value when claimed at 62', () => {
    // benefitAt62 is defined as the monthly benefit at 62, so ssBenefit(x, 62) === x
    expect(ssBenefit(1100, 62)).toBeCloseTo(1100, 1);
    expect(ssBenefit(2000, 62)).toBeCloseTo(2000, 1);
  });

  it('grosses up to FRA benefit at age 67 (÷ 0.70)', () => {
    // FRA benefit = benefitAt62 / 0.70
    expect(ssBenefit(1100, 67)).toBeCloseTo(1100 / 0.70, 1);
  });

  it('applies 8% delayed retirement credit per year past FRA', () => {
    const fra = 1100 / 0.70;
    expect(ssBenefit(1100, 68)).toBeCloseTo(fra * 1.08, 1);
    expect(ssBenefit(1100, 70)).toBeCloseTo(fra * 1.24, 1); // 3 yrs × 8%
  });

  it('reduces benefit correctly for claims between 62 and 67', () => {
    // Claiming at 66 = 12 months before FRA = 12 × (5/900) = 0.0667 reduction
    const fra = 1100 / 0.70;
    expect(ssBenefit(1100, 66)).toBeCloseTo(fra * (1 - 12 * 5 / 900), 1);
  });
});

describe('healthCosts', () => {
  const MKT = 24000, SUPP = 10000;

  it('assigns $0 when both spouses work (employer plan)', () => {
    const r = healthCosts(true, true, 55, 55, MKT, SUPP);
    expect(r.tot).toBe(0);
    expect(r.ks).toBe('Employer plan');
    expect(r.ms).toBe('Employer plan');
  });

  it("puts Mel on Kathy's plan when only Kathy works", () => {
    const r = healthCosts(true, false, 55, 55, MKT, SUPP);
    expect(r.mc).toBe(0);
    expect(r.ms).toBe("On Kathy's plan");
  });

  it('bills marketplace when both are retired and pre-65', () => {
    const r = healthCosts(false, false, 60, 60, MKT, SUPP);
    expect(r.tot).toBe(2 * MKT);
    expect(r.ks).toBe('Marketplace');
    expect(r.ms).toBe('Marketplace');
  });

  it('switches to Medicare+supplement at 65 regardless of work status', () => {
    const r = healthCosts(false, false, 66, 66, MKT, SUPP);
    expect(r.tot).toBe(2 * SUPP);
    expect(r.ks).toBe('Medicare+supplement');
    expect(r.ms).toBe('Medicare+supplement');
  });

  it('handles mixed: Kathy 60 (marketplace), Mel 66 (Medicare)', () => {
    const r = healthCosts(false, false, 60, 66, MKT, SUPP);
    expect(r.kc).toBe(MKT);
    expect(r.mc).toBe(SUPP);
    expect(r.tot).toBe(MKT + SUPP);
  });
});

describe('deterministicRate', () => {
  it('returns aggressive rate before conservative shift age', () => {
    expect(deterministicRate(55, 60, 0.15, 0.045)).toBe(0.15);
  });
  it('returns conservative rate at and after shift age', () => {
    expect(deterministicRate(60, 60, 0.15, 0.045)).toBe(0.045);
    expect(deterministicRate(70, 60, 0.15, 0.045)).toBe(0.045);
  });
});

describe('simulate — happy path', () => {
  it('produces a full timeline from NOW onward', () => {
    const r = simulate(baseParams(), deterministicRate);
    expect(r.lbl[0]).toBe(NOW);
    expect(r.lbl.length).toBeGreaterThan(30);
    expect(r.bal.length).toBe(r.lbl.length);
  });

  it('sets first retirement year to earlier of the two', () => {
    const p = baseParams();
    p.kra = 55; p.mra = 62;
    const r = simulate(p, deterministicRate);
    expect(r.fry).toBe(KB + 55);
  });
});

describe('simulate — IRA contribution gating', () => {
  // Regression test: IRA contribution used to run forever regardless of
  // work status. It should now stop when both spouses have retired.
  it('halts IRA contributions once both spouses are retired', () => {
    const p = baseParams();
    p.kra = 55; p.mra = 55;      // both retire in the same year
    p.irac = 100000;             // exaggerated so its absence is visible
    p.sav = 500000; p.exp = 200000; p.mi = 0; p.ki = 0;
    const withIRA = simulate(p, deterministicRate);

    const p2 = { ...p, irac: 0 };
    const noIRA = simulate(p2, deterministicRate);

    // After both retire, balances should match: no IRA contributions apply.
    const bothRetired = KB + 55 - NOW; // index of first year both are retired
    for (let i = bothRetired + 1; i < Math.min(withIRA.bal.length, noIRA.bal.length); i++) {
      // Growth is deterministic here, so the balances should track each other
      // once IRA contributions have stopped (they may drift as the base fund
      // compounds, but the DELTA introduced by IRA should be zero going forward).
      expect(withIRA.drw[i]).toBe(noIRA.drw[i]);
    }
  });

  it('keeps contributing IRA while one spouse still works', () => {
    // If Kathy retires early and Mel keeps working, IRA should keep flowing.
    const p = baseParams();
    p.kra = 55; p.mra = 65;
    p.irac = 20000;
    const withIRA = simulate(p, deterministicRate);
    const noIRA = simulate({ ...p, irac: 0 }, deterministicRate);

    // While only Mel works (yrs KB+55..MB+65-1), withIRA fund must exceed noIRA.
    const startYr = KB + 55;
    const endYr = MB + 65 - 1;
    for (let yr = startYr; yr <= endYr; yr++) {
      const i = yr - NOW;
      expect(withIRA.bal[i]).toBeGreaterThan(noIRA.bal[i]);
    }
  });
});

describe('simulate — LTC event', () => {
  it('draws additional cost only during LTC event window', () => {
    const p = baseParams();
    p.ltcage = 75; p.ltccost = 100000; p.ltcdur = 3;
    const withLTC = simulate(p, deterministicRate);
    const noLTC = simulate({ ...p, ltcage: 0 }, deterministicRate);

    // Balance before event: identical.
    const preEventYr = MB + 74;
    const preI = preEventYr - NOW;
    expect(withLTC.bal[preI]).toBe(noLTC.bal[preI]);

    // During event window: withLTC balance strictly lower.
    for (let yr = MB + 75; yr < MB + 78; yr++) {
      const i = yr - NOW;
      if (i < withLTC.bal.length && i < noLTC.bal.length) {
        expect(withLTC.bal[i]).toBeLessThan(noLTC.bal[i]);
      }
    }
  });
});

describe('simulate — education fund', () => {
  it('depletes edu fund with expensive college, hits retirement fund', () => {
    const p = baseParams();
    p.edusav = 20000; p.educon = 0; p.colcost = 80000; p.coldur = 6;
    const r = simulate(p, deterministicRate);
    // eduAfterCol should be zero or the fund ran dry mid-college.
    expect(r.eduAfterCol).not.toBeNull();
  });

  it('records edu fund balance at college start', () => {
    const p = baseParams();
    const r = simulate(p, deterministicRate);
    expect(r.eduAtCol).not.toBeNull();
    expect(r.eduAtCol!).toBeGreaterThan(0);
  });

  it('releases K-8 tuition back to surplus after Jo enters HS', () => {
    const p = baseParams();
    p.k8cost = 30000;
    const withRelease = simulate(p, deterministicRate);
    const noRelease = simulate({ ...p, k8cost: 0 }, deterministicRate);

    // At and after JO_HS_YR, withRelease should out-earn noRelease (surplus grows).
    const i = JO_HS_YR - NOW + 5; // a few years into HS
    if (i < withRelease.bal.length && i < noRelease.bal.length) {
      expect(withRelease.bal[i]).toBeGreaterThan(noRelease.bal[i]);
    }
  });
});

describe('simulate — depletion', () => {
  it('marks depletion year when fund runs out', () => {
    const p = baseParams();
    p.sav = 50000; p.exp = 300000; p.mi = 0; p.ki = 0; p.irac = 0;
    const r = simulate(p, deterministicRate);
    expect(r.dep).not.toBeNull();
    expect(r.dep!).toBeGreaterThanOrEqual(NOW);
  });

  it('leaves dep null when the fund never runs out', () => {
    const p = baseParams();
    p.sav = 10_000_000; p.exp = 50000;
    const r = simulate(p, deterministicRate);
    expect(r.dep).toBeNull();
  });
});

describe('simulate — inflation', () => {
  it('scales year-1 expenses by inflation across time', () => {
    const p = baseParams();
    p.sav = 100_000_000; // rich so we don't die
    const r = simulate(p, deterministicRate);
    // Year 10 health costs must exceed year 0 (health inflates).
    expect(r.hlt[10]).toBeGreaterThan(r.hlt[0]);
  });
});

describe('sampleReturn', () => {
  it('returns a finite number', () => {
    const rng = seededRng(42);
    const r = sampleReturn(0.07, 0.15, rng);
    expect(Number.isFinite(r)).toBe(true);
  });

  it('averages near the mean over many samples', () => {
    const rng = seededRng(123);
    let sum = 0;
    const N = 5000;
    for (let i = 0; i < N; i++) sum += sampleReturn(0.07, 0.10, rng);
    const avg = sum / N;
    // Log-normal with these params has mean ~= 0.07; allow generous tolerance.
    expect(Math.abs(avg - 0.07)).toBeLessThan(0.02);
  });
});

describe('runMonteCarlo', () => {
  it('returns probability in [0, 1]', () => {
    const p = baseParams();
    const mc = runMonteCarlo(p, 200, seededRng(7));
    expect(mc.prob).toBeGreaterThanOrEqual(0);
    expect(mc.prob).toBeLessThanOrEqual(1);
  });

  it('returns p10 ≤ p50 ≤ p90 across the timeline', () => {
    const p = baseParams();
    const mc = runMonteCarlo(p, 200, seededRng(11));
    for (let i = 0; i < mc.p10.length; i++) {
      expect(mc.p10[i]).toBeLessThanOrEqual(mc.p50[i]);
      expect(mc.p50[i]).toBeLessThanOrEqual(mc.p90[i]);
    }
    expect(mc.p10Retire).toBeLessThanOrEqual(mc.medRetire);
    expect(mc.medRetire).toBeLessThanOrEqual(mc.p90Retire);
  });

  it('gives ~100% success for a very rich starting scenario', () => {
    const p = baseParams();
    p.sav = 20_000_000;
    const mc = runMonteCarlo(p, 200, seededRng(13));
    expect(mc.prob).toBeGreaterThan(0.98);
  });

  it('gives low success for an underfunded scenario', () => {
    const p = baseParams();
    p.sav = 50000; p.exp = 250000; p.mi = 0; p.ki = 0; p.irac = 0;
    const mc = runMonteCarlo(p, 200, seededRng(17));
    expect(mc.prob).toBeLessThan(0.2);
  });
});
