// Pure math for the retirement planner. No React, no DOM.
// Kept side-effect-free so it can be unit-tested and reasoned about.

export const MB = 1970;      // Mel's birth year
export const KB = 1977;      // Kathy's birth year
export const NOW = 2026;     // simulation start year
export const END_YR = 2090;  // simulation end year

// Jo's education milestones
export const JO_HS_YR = 2032;
export const JO_COL_YR = 2036;

export interface Params {
  kra: number; mra: number;      // retirement ages
  mi: number; ki: number; oth: number;  // gross incomes
  tax: number; raise: number;    // as decimals
  exp: number; sav: number; irac: number;  // household expenses, savings, IRA/yr
  rhi: number; rlo: number;      // growth rates as decimals
  cage: number;                  // Mel age at conservative shift
  inf: number; hinf: number;     // inflation rates as decimals
  mkt: number; msupp: number;    // marketplace + Medicare supplement per person/yr
  ltcp: number;                  // LTC insurance premium
  ltcage: number; ltccost: number; ltcdur: number;  // self-insured LTC event
  edusav: number; educon: number; edugrow: number;
  k8cost: number; hscost: number; colcost: number; coldur: number;
  mss62: number; kss62: number;  // SS benefit at 62
  mssAge: number; kssAge: number;  // claim ages
  volHi: number; volLo: number;  // Monte Carlo volatility
}

// Social Security formula (SSA official, FRA = 67 for born 1960+).
// benefitAt62 is the estimated monthly benefit if claimed at 62.
export function ssBenefit(benefitAt62: number, claimAge: number): number {
  const FRA = 67;
  const AT62_FACTOR = 1 - (36 * 5 / 900 + 24 * 5 / 1200); // = 0.70
  const fraMonthly = benefitAt62 / AT62_FACTOR;

  let factor: number;
  if (claimAge <= FRA) {
    const monthsBefore = (FRA - claimAge) * 12;
    const reduction = Math.min(monthsBefore, 36) * (5 / 900)
      + Math.max(0, monthsBefore - 36) * (5 / 1200);
    factor = 1 - reduction;
  } else {
    factor = 1 + 0.08 * (claimAge - FRA);
  }
  return fraMonthly * factor;
}

// Box-Muller log-normal return sampler. `rng` defaults to Math.random for
// production; tests inject a deterministic sequence.
export function sampleReturn(mean: number, stdDev: number, rng: () => number = Math.random): number {
  const u1 = rng(), u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const sigma = stdDev;
  const mu = Math.log(1 + mean) - sigma * sigma / 2;
  return Math.exp(mu + sigma * z) - 1;
}

export interface HealthCostBreakdown {
  kc: number; mc: number;
  ks: string; ms: string;
  tot: number;
}

export function healthCosts(
  kWorking: boolean, mWorking: boolean,
  kAge: number, mAge: number,
  mktPerPerson: number, suppPerPerson: number,
): HealthCostBreakdown {
  let mc: number, ms: string;
  if (mAge >= 65)    { mc = suppPerPerson; ms = 'Medicare+supplement'; }
  else if (mWorking) { mc = 0;             ms = 'Employer plan'; }
  else if (kWorking) { mc = 0;             ms = "On Kathy's plan"; }
  else               { mc = mktPerPerson;  ms = 'Marketplace'; }

  let kc: number, ks: string;
  if (kAge >= 65)    { kc = suppPerPerson; ks = 'Medicare+supplement'; }
  else if (kWorking) { kc = 0;             ks = 'Employer plan'; }
  else if (mWorking) { kc = 0;             ks = "On Mel's plan"; }
  else               { kc = mktPerPerson;  ks = 'Marketplace'; }

  return { kc, mc, ks, ms, tot: kc + mc };
}

export interface SimResult {
  lbl: number[];
  bal: number[];
  ssa: number[];
  drw: number[];
  hlt: number[];
  dep: number | null;
  fry: number;
  eduAtCol: number | null;
  eduAfterCol: number | null;
}

// Yearly simulation. `getRateFn` returns the market return for a given year,
// letting the deterministic case use a piecewise function and Monte Carlo
// inject randomness.
export function simulate(
  p: Params,
  getRateFn: (mAge: number, cage: number, rhi: number, rlo: number) => number,
): SimResult {
  const kRetireYr = KB + p.kra;
  const mRetireYr = MB + p.mra;
  const firstRetireYr = Math.min(kRetireYr, mRetireYr);

  const mSSMonthly = ssBenefit(p.mss62, p.mssAge);
  const kSSMonthly = ssBenefit(p.kss62, p.kssAge);

  let fund = p.sav;
  let eduFund = p.edusav;
  let eduAtCol: number | null = null;
  let eduAfterCol: number | null = null;
  const lbl: number[] = [], bal: number[] = [], ssa: number[] = [], drw: number[] = [], hlt: number[] = [];
  let dep: number | null = null;

  for (let yr = NOW; yr <= END_YR; yr++) {
    const mAge = yr - MB;
    const kAge = yr - KB;
    const kWorking = yr < kRetireYr;
    const mWorking = yr < mRetireYr;

    const inflFactor       = Math.pow(1 + p.inf,  yr - NOW);
    const healthInflFactor = Math.pow(1 + p.hinf, yr - NOW);

    const rate = getRateFn(mAge, p.cage, p.rhi, p.rlo);

    let ssIncome = 0;
    if (mAge >= p.mssAge) ssIncome += mSSMonthly * 12 * inflFactor;
    if (kAge >= p.kssAge) ssIncome += kSSMonthly * 12 * inflFactor;

    const hc = healthCosts(kWorking, mWorking, kAge, mAge, p.mkt, p.msupp);
    const healthCost = hc.tot * healthInflFactor;

    const mIncome = mWorking ? p.mi * Math.pow(1 + p.raise, yr - NOW) : 0;
    const kIncome = kWorking ? p.ki * Math.pow(1 + p.raise, yr - NOW) : 0;
    const netEarned = (mIncome + kIncome + p.oth) * (1 - p.tax);

    let ltcDraw = p.ltcp;
    if (p.ltcage > 0 && mAge >= p.ltcage && mAge < p.ltcage + p.ltcdur) {
      ltcDraw += p.ltccost;
    }

    const k8Release = (yr >= JO_HS_YR) ? p.k8cost : 0;

    const livingExp = p.exp * inflFactor;

    const surplus = netEarned + ssIncome - livingExp - healthCost - ltcDraw + k8Release;

    eduFund *= (1 + p.edugrow);
    if (yr < JO_COL_YR) eduFund += p.educon;

    if (yr === JO_COL_YR) eduAtCol = Math.round(eduFund);

    let joEdCost = 0;
    if (yr >= JO_HS_YR  && yr < JO_COL_YR)            joEdCost = p.hscost;
    if (yr >= JO_COL_YR && yr < JO_COL_YR + p.coldur) joEdCost = p.colcost;
    eduFund -= joEdCost;

    if (yr === JO_COL_YR + p.coldur - 1) eduAfterCol = Math.round(eduFund);

    // Education shortfall spills into retirement fund.
    let eduSpill = 0;
    if (eduFund < 0) {
      eduSpill = eduFund; // negative
      eduFund = 0;
    }

    const netFlow = surplus + eduSpill;
    const draw = netFlow < 0 ? -netFlow : 0;
    const add  = netFlow > 0 ?  netFlow : 0;

    // IRA contribution only continues while at least one spouse is working.
    const iracThisYear = (kWorking || mWorking) ? p.irac : 0;

    fund = fund * (1 + rate) + add + iracThisYear - draw;

    lbl.push(yr);
    bal.push(Math.max(0, Math.round(fund)));
    ssa.push(Math.round(ssIncome));
    drw.push(Math.round(draw));
    hlt.push(Math.round(healthCost));

    if (fund <= 0 && !dep) dep = yr;
    if (yr > firstRetireYr + 2 && fund <= 0) break;
  }

  return { lbl, bal, ssa, drw, hlt, dep, fry: firstRetireYr, eduAtCol, eduAfterCol };
}

export interface MonteCarloResult {
  prob: number;
  medRetire: number;
  p10Retire: number;
  p90Retire: number;
  p10: number[];
  p50: number[];
  p90: number[];
}

export function runMonteCarlo(
  p: Params,
  nRuns: number = 2000,
  rng: () => number = Math.random,
): MonteCarloResult {
  const nYears = END_YR - NOW + 1;
  const yearFunds: number[][] = [];
  for (let i = 0; i < nYears; i++) yearFunds.push([]);
  let successCount = 0;
  const retireFunds: number[] = [];

  for (let sim = 0; sim < nRuns; sim++) {
    const result = simulate(p, (mAge, cage, rhi, rlo) => {
      const conservative = mAge >= cage;
      return sampleReturn(conservative ? rlo : rhi, conservative ? p.volLo : p.volHi, rng);
    });

    const mel90yr = MB + 90;
    if (!result.dep || result.dep > mel90yr) successCount++;

    const fri = result.lbl.indexOf(result.fry);
    if (fri >= 0) retireFunds.push(result.bal[fri]);

    for (let y = 0; y < result.lbl.length; y++) {
      const yi = result.lbl[y] - NOW;
      if (yi < nYears) yearFunds[yi].push(result.bal[y]);
    }
  }

  const p10: number[] = [], p50: number[] = [], p90: number[] = [];
  for (let yi = 0; yi < nYears; yi++) {
    const arr = yearFunds[yi].slice().sort((a, b) => a - b);
    if (!arr.length) break;
    p10.push(arr[Math.floor(arr.length * 0.10)] || 0);
    p50.push(arr[Math.floor(arr.length * 0.50)] || 0);
    p90.push(arr[Math.floor(arr.length * 0.90)] || 0);
  }

  retireFunds.sort((a, b) => a - b);
  const medRetire = retireFunds[Math.floor(retireFunds.length * 0.50)] || 0;
  const p10Retire = retireFunds[Math.floor(retireFunds.length * 0.10)] || 0;
  const p90Retire = retireFunds[Math.floor(retireFunds.length * 0.90)] || 0;

  return {
    prob: successCount / nRuns,
    medRetire, p10Retire, p90Retire,
    p10, p50, p90,
  };
}

// Deterministic rate function for the non-Monte-Carlo base case.
export function deterministicRate(mAge: number, cage: number, rhi: number, rlo: number): number {
  return mAge >= cage ? rlo : rhi;
}
