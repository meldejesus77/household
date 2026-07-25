'use client';

import { useEffect } from 'react';

export default function RetirementClient() {
  useEffect(() => {
    (function () {
      var MB = 1970, KB = 1977, NOW = 2026;
      var N_MC = 2000;
      // Market risk presets: [aggressiveStdDev, conservativeStdDev]
      var RISK: Record<string, [number, number]> = { low: [0.08, 0.03], med: [0.12, 0.05], high: [0.18, 0.08] };
      var riskLevel = 'med';
      var END_YR = 2090; // simulate to this year

      // ── Formatting helpers ────────────────────────────────────────────────────
      function fc(v: string | number) { return '$' + Math.round(Number(v)).toLocaleString(); }
      function fp(v: string | number) { return parseFloat(String(v)).toFixed(1) + '%'; }
      function g(id: string) { return parseFloat((document.getElementById(id) as HTMLInputElement).value); }

      // ── Social Security formula (SSA official, FRA = 67 for born 1960+) ──────
      function ssBenefit(benefitAt62: number, claimAge: number) {
        var FRA = 67;
        var AT62_FACTOR = 1 - (36 * 5 / 900 + 24 * 5 / 1200); // = 0.70
        var fraMonthly = benefitAt62 / AT62_FACTOR;

        var factor;
        if (claimAge <= FRA) {
          var monthsBefore = (FRA - claimAge) * 12;
          var reduction = Math.min(monthsBefore, 36) * (5 / 900)
            + Math.max(0, monthsBefore - 36) * (5 / 1200);
          factor = 1 - reduction;
        } else {
          factor = 1 + 0.08 * (claimAge - FRA);
        }
        return fraMonthly * factor;
      }

      // ── Log-normal random return sampler (Box-Muller) ─────────────────────────
      function sampleReturn(mean: number, stdDev: number) {
        var u1 = Math.random(), u2 = Math.random();
        var z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        var sigma = stdDev;
        var mu = Math.log(1 + mean) - sigma * sigma / 2;
        return Math.exp(mu + sigma * z) - 1;
      }

      // ── Health insurance logic ────────────────────────────────────────────────
      function healthCosts(kWorking: boolean, mWorking: boolean, kAge: number, mAge: number, mktPerPerson: number, suppPerPerson: number) {
        var mc, ms, kc, ks;
        if (mAge >= 65)    { mc = suppPerPerson; ms = 'Medicare+supplement'; }
        else if (mWorking) { mc = 0;             ms = 'Employer plan'; }
        else if (kWorking) { mc = 0;             ms = "On Kathy's plan"; }
        else               { mc = mktPerPerson;  ms = 'Marketplace'; }

        if (kAge >= 65)    { kc = suppPerPerson; ks = 'Medicare+supplement'; }
        else if (kWorking) { kc = 0;             ks = 'Employer plan'; }
        else if (mWorking) { kc = 0;             ks = "On Mel's plan"; }
        else               { kc = mktPerPerson;  ks = 'Marketplace'; }

        return { kc: kc!, mc: mc!, ks: ks!, ms: ms!, tot: kc! + mc! };
      }

      function healthCssClass(label: string) {
        if (label.indexOf('Employer') >= 0 || label.indexOf('On') >= 0) return 'ig';
        if (label.indexOf('Marketplace') >= 0) return 'iw';
        return 'im';
      }

      // ── Core simulation ───────────────────────────────────────────────────────
      interface Params {
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
        mss62: number; kss62: number;
        mssAge: number; kssAge: number;
        volHi: number; volLo: number;
      }

      function simulate(p: Params, getRateFn: (mAge: number, cage: number, rhi: number, rlo: number) => number) {
        var kRetireYr = KB + p.kra;
        var mRetireYr = MB + p.mra;
        var firstRetireYr = Math.min(kRetireYr, mRetireYr);

        var mSSMonthly = ssBenefit(p.mss62, p.mssAge);
        var kSSMonthly = ssBenefit(p.kss62, p.kssAge);

        var JO_HS_YR  = 2032;
        var JO_COL_YR = 2036;

        var fund    = p.sav;
        var eduFund = p.edusav;
        var eduAtCol: number | null = null, eduAfterCol: number | null = null;
        var lbl: number[] = [], bal: number[] = [], ssa: number[] = [], drw: number[] = [], hlt: number[] = [];
        var dep: number | null = null;

        for (var yr = NOW; yr <= END_YR; yr++) {
          var mAge = yr - MB;
          var kAge = yr - KB;
          var kWorking = yr < kRetireYr;
          var mWorking = yr < mRetireYr;

          var inflFactor       = Math.pow(1 + p.inf,  yr - NOW);
          var healthInflFactor = Math.pow(1 + p.hinf, yr - NOW);

          var rate = getRateFn(mAge, p.cage, p.rhi, p.rlo);

          var ssIncome = 0;
          if (mAge >= p.mssAge) ssIncome += mSSMonthly * 12 * inflFactor;
          if (kAge >= p.kssAge) ssIncome += kSSMonthly * 12 * inflFactor;

          var hc = healthCosts(kWorking, mWorking, kAge, mAge, p.mkt, p.msupp);
          var healthCost = hc.tot * healthInflFactor;

          var mIncome = mWorking ? p.mi * Math.pow(1 + p.raise, yr - NOW) : 0;
          var kIncome = kWorking ? p.ki * Math.pow(1 + p.raise, yr - NOW) : 0;
          var netEarned = (mIncome + kIncome + p.oth) * (1 - p.tax);

          var ltcDraw = p.ltcp;
          if (p.ltcage > 0 && mAge >= p.ltcage && mAge < p.ltcage + p.ltcdur) {
            ltcDraw += p.ltccost;
          }

          var k8Release = (yr >= JO_HS_YR) ? p.k8cost : 0;

          var livingExp = p.exp * inflFactor;

          var surplus = netEarned + ssIncome - livingExp - healthCost - ltcDraw + k8Release;

          eduFund *= (1 + p.edugrow);
          if (yr < JO_COL_YR) eduFund += p.educon;

          if (yr === JO_COL_YR) eduAtCol = Math.round(eduFund);

          var joEdCost = 0;
          if (yr >= JO_HS_YR  && yr < JO_COL_YR)            joEdCost = p.hscost;
          if (yr >= JO_COL_YR && yr < JO_COL_YR + p.coldur) joEdCost = p.colcost;
          eduFund -= joEdCost;

          if (yr === JO_COL_YR + p.coldur - 1) eduAfterCol = Math.round(eduFund);

          if (eduFund < 0) {
            surplus += eduFund;
            eduFund = 0;
          }

          var draw = surplus < 0 ? -surplus : 0;
          var add  = surplus > 0 ?  surplus : 0;
          fund = fund * (1 + rate) + add + p.irac - draw;

          lbl.push(yr);
          bal.push(Math.max(0, Math.round(fund)));
          ssa.push(Math.round(ssIncome));
          drw.push(Math.round(draw));
          hlt.push(Math.round(healthCost));

          if (fund <= 0 && !dep) dep = yr;
          if (yr > firstRetireYr + 2 && fund <= 0) break;
        }

        return {
          lbl, bal, ssa, drw, hlt,
          dep, fry: firstRetireYr,
          eduAtCol, eduAfterCol
        };
      }

      // ── Monte Carlo ───────────────────────────────────────────────────────────
      function runMonteCarlo(p: Params) {
        var nYears = END_YR - NOW + 1;
        var yearFunds: number[][] = [];
        for (var i = 0; i < nYears; i++) yearFunds.push([]);
        var successCount = 0;
        var retireFunds: number[] = [];

        for (var sim = 0; sim < N_MC; sim++) {
          var result = simulate(p, function(mAge, cage, rhi, rlo) {
            var conservative = mAge >= cage;
            return sampleReturn(conservative ? rlo : rhi, conservative ? p.volLo : p.volHi);
          });

          var mel90yr = MB + 90;
          if (!result.dep || result.dep > mel90yr) successCount++;

          var fri = result.lbl.indexOf(result.fry);
          if (fri >= 0) retireFunds.push(result.bal[fri]);

          for (var y = 0; y < result.lbl.length; y++) {
            var yi = result.lbl[y] - NOW;
            if (yi < nYears) yearFunds[yi].push(result.bal[y]);
          }
        }

        var p10: number[] = [], p50: number[] = [], p90: number[] = [];
        for (var yi = 0; yi < nYears; yi++) {
          var arr = yearFunds[yi].slice().sort(function(a, b) { return a - b; });
          if (!arr.length) break;
          p10.push(arr[Math.floor(arr.length * 0.10)] || 0);
          p50.push(arr[Math.floor(arr.length * 0.50)] || 0);
          p90.push(arr[Math.floor(arr.length * 0.90)] || 0);
        }

        retireFunds.sort(function(a, b) { return a - b; });
        var medRetire = retireFunds[Math.floor(retireFunds.length * 0.50)] || 0;
        var p10Retire = retireFunds[Math.floor(retireFunds.length * 0.10)] || 0;
        var p90Retire = retireFunds[Math.floor(retireFunds.length * 0.90)] || 0;

        return {
          prob: successCount / N_MC,
          medRetire, p10Retire, p90Retire,
          p10, p50, p90
        };
      }

      // ── Read all params from sliders ──────────────────────────────────────────
      function getParams(): Params {
        return {
          kra: g('kra'), mra: g('mra'),
          mi: g('mi'), ki: g('ki'), oth: g('oth'),
          tax: g('tax') / 100, raise: g('raise') / 100,
          exp: g('exp'), sav: g('sav'), irac: g('irac'),
          rhi: g('rhi') / 100, rlo: g('rlo') / 100,
          cage: g('cage'),
          inf: g('inf') / 100, hinf: g('hinf') / 100,
          mkt: g('mkt'), msupp: g('msupp'),
          ltcp: g('ltcp'), ltcage: g('ltcage'), ltccost: g('ltccost'), ltcdur: g('ltcdur'),
          edusav: g('edusav'), educon: g('educon'), edugrow: g('edugrow') / 100,
          k8cost: g('k8cost'), hscost: g('hscost'), colcost: g('colcost'), coldur: g('coldur'),
          mss62: g('mss'), kss62: g('kss'),
          mssAge: g('mss-age'), kssAge: g('kss-age'),
          volHi: RISK[riskLevel][0], volLo: RISK[riskLevel][1]
        };
      }

      // ── SVG chart ─────────────────────────────────────────────────────────────
      function svgEl(tag: string, attrs: Record<string, string | number>) {
        var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        Object.keys(attrs).forEach(function(k) { el.setAttribute(k, String(attrs[k])); });
        return el;
      }

      function drawChart(
        lbl: number[], bal: number[], ssa: number[], drw: number[], hlt: number[],
        fry: number,
        mcBands: { p10: number[]; p90: number[] } | null
      ) {
        var svg = document.getElementById('chart') as unknown as SVGSVGElement;
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        var W = 560, H = 200, pl = 60, pr = 50, pt = 14, pb = 28;
        var cw = W - pl - pr, ch = H - pt - pb, n = lbl.length;
        if (!n) return;

        var maxB = Math.max(...bal, ...(mcBands ? mcBands.p90 : []), 1);
        var maxF = Math.max(...ssa, ...drw, ...hlt, 1);
        var bw = Math.max(1, cw / n - 0.5);

        function bx(i: number) { return pl + cw * i / (n - 1); }
        function byB(v: number) { return pt + ch * (1 - v / maxB); }
        function byF(v: number) { return pt + ch * (1 - v / maxF); }

        for (var i = 0; i <= 4; i++) {
          var y = pt + ch * (1 - i / 4);
          svg.appendChild(svgEl('line', { x1: pl, y1: y, x2: pl + cw, y2: y, stroke: '#ddd', 'stroke-width': '0.5' }));
          var tL = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          tL.setAttribute('x', String(pl - 4)); tL.setAttribute('y', String(y + 3));
          tL.setAttribute('text-anchor', 'end'); tL.setAttribute('font-size', '9'); tL.setAttribute('fill', '#888');
          var vB = maxB * i / 4;
          tL.textContent = vB >= 1e6 ? (vB / 1e6).toFixed(1) + 'M' : (vB / 1e3).toFixed(0) + 'K';
          svg.appendChild(tL);
          var tR = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          tR.setAttribute('x', String(pl + cw + 4)); tR.setAttribute('y', String(y + 3));
          tR.setAttribute('text-anchor', 'start'); tR.setAttribute('font-size', '9'); tR.setAttribute('fill', '#aaa');
          var vF = maxF * i / 4;
          tR.textContent = vF >= 1e3 ? (vF / 1e3).toFixed(0) + 'K' : '0';
          svg.appendChild(tR);
        }

        var step = Math.ceil(n / 9);
        for (var j = 0; j < n; j += step) {
          var xt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          xt.setAttribute('x', String(bx(j))); xt.setAttribute('y', String(H - 6));
          xt.setAttribute('text-anchor', 'middle'); xt.setAttribute('font-size', '9'); xt.setAttribute('fill', '#888');
          xt.textContent = String(lbl[j]);
          svg.appendChild(xt);
        }

        if (mcBands && mcBands.p10.length > 1) {
          var bandLen = Math.min(n, mcBands.p10.length);
          var topPts: string[] = [], botPts: string[] = [];
          for (var b = 0; b < bandLen; b++) {
            topPts.push(bx(b).toFixed(1) + ',' + byB(mcBands.p90[b]).toFixed(1));
            botPts.push(bx(b).toFixed(1) + ',' + byB(mcBands.p10[b]).toFixed(1));
          }
          var bandPath = 'M ' + topPts.join(' L ') + ' L ' + botPts.slice().reverse().join(' L ') + ' Z';
          svg.appendChild(svgEl('path', { d: bandPath, fill: 'rgba(100,160,220,0.25)', stroke: 'none' }));
        }

        for (var b2 = 0; b2 < n; b2++) {
          var bh = ch * bal[b2] / maxB;
          svg.appendChild(svgEl('rect', {
            x: bx(b2) - bw / 2, y: pt + ch - bh, width: bw, height: bh,
            fill: 'rgba(60,120,200,0.6)'
          }));
        }

        var fri = lbl.indexOf(fry);
        if (fri >= 0) {
          svg.appendChild(svgEl('line', {
            x1: bx(fri), y1: pt, x2: bx(fri), y2: pt + ch,
            stroke: '#888', 'stroke-width': '1', 'stroke-dasharray': '3,3'
          }));
        }

        function drawLine(arr: number[], color: string, dash: string | null) {
          var d = '';
          for (var k = 0; k < n; k++) {
            d += (k === 0 ? 'M' : 'L') + bx(k).toFixed(1) + ',' + byF(arr[k]).toFixed(1) + ' ';
          }
          var attrs: Record<string, string | number> = { d, fill: 'none', stroke: color, 'stroke-width': '2' };
          if (dash) attrs['stroke-dasharray'] = dash;
          svg.appendChild(svgEl('path', attrs));
        }

        drawLine(ssa, '#22aa66', null);
        drawLine(drw, '#cc3322', '5,3');
        drawLine(hlt, '#dd8800', '2,2');
      }

      // ── Main update ───────────────────────────────────────────────────────────
      function run() {
        var p = getParams();
        var kRetireYr = KB + p.kra;
        var mRetireYr = MB + p.mra;

        document.getElementById('kra-v')!.textContent = String(p.kra);
        document.getElementById('mra-v')!.textContent = String(p.mra);
        document.getElementById('kra-s')!.textContent = 'Retires ' + kRetireYr + ' · born May 1977';
        document.getElementById('mra-s')!.textContent = 'Retires ' + mRetireYr + ' · born April 1970';

        var mAdjSS = ssBenefit(p.mss62, p.mssAge);
        var kAdjSS = ssBenefit(p.kss62, p.kssAge);
        document.getElementById('mss-adj')!.textContent =
          'Adjusted monthly benefit at age ' + p.mssAge + ': $' + Math.round(mAdjSS).toLocaleString() +
          ' (FRA benefit: $' + Math.round(p.mss62 / 0.70).toLocaleString() + ')';
        document.getElementById('kss-adj')!.textContent =
          'Adjusted monthly benefit at age ' + p.kssAge + ': $' + Math.round(kAdjSS).toLocaleString() +
          ' (FRA benefit: $' + Math.round(p.kss62 / 0.70).toLocaleString() + ')';

        var firstRetireYr = Math.min(kRetireYr, mRetireYr);
        var kAge1 = firstRetireYr - KB, mAge1 = firstRetireYr - MB;
        var kWorking1 = firstRetireYr < kRetireYr, mWorking1 = firstRetireYr < mRetireYr;
        var hc1 = healthCosts(kWorking1, mWorking1, kAge1, mAge1, p.mkt, p.msupp);
        document.getElementById('igrid')!.innerHTML =
          '<div class="ibox ' + healthCssClass(hc1.ks) + '"><strong>Kathy (age ' + kAge1 + ')</strong><br>' + hc1.ks + '<br>' + (hc1.kc > 0 ? fc(hc1.kc) + '/yr' : '$0 — covered') + '</div>' +
          '<div class="ibox ' + healthCssClass(hc1.ms) + '"><strong>Mel (age ' + mAge1 + ')</strong><br>' + hc1.ms + '<br>' + (hc1.mc > 0 ? fc(hc1.mc) + '/yr' : '$0 — covered') + '</div>';

        var det = simulate(p, function(mAge, cage, rhi, rlo) {
          return mAge >= cage ? rlo : rhi;
        });

        var fri = det.lbl.indexOf(det.fry);
        var fundAtRetire = fri >= 0 ? det.bal[fri] : det.bal[det.bal.length - 1];
        var inflAtRetire = Math.pow(1 + p.inf, det.fry - NOW);

        document.getElementById('c1')!.textContent = fc(fundAtRetire);
        document.getElementById('c2')!.textContent = fc(p.exp * inflAtRetire);
        document.getElementById('c3')!.textContent = det.dep
          ? (det.dep - det.fry) + ' yrs'
          : '>' + (det.lbl[det.lbl.length - 1] - det.fry) + ' yrs';

        var c4 = document.getElementById('c4')!;
        c4.textContent = det.dep ? String(det.dep) : 'Not depleted';
        det.dep ? c4.classList.add('red') : c4.classList.remove('red');

        var c5 = document.getElementById('c5')!, c6 = document.getElementById('c6')!;
        c5.textContent = det.dep ? String(det.dep - MB) : '—';
        c6.textContent = det.dep ? String(det.dep - KB) : '—';
        det.dep ? c5.classList.add('red') : c5.classList.remove('red');
        det.dep ? c6.classList.add('red') : c6.classList.remove('red');

        var colDur = p.coldur;
        document.getElementById('c7')!.textContent = det.eduAtCol !== null ? fc(det.eduAtCol) : (colDur > 0 ? '—' : 'N/A');
        var c8 = document.getElementById('c8')!;
        if (det.eduAfterCol !== null) {
          c8.textContent = det.eduAfterCol < 0
            ? '-$' + Math.abs(det.eduAfterCol).toLocaleString()
            : fc(det.eduAfterCol);
          det.eduAfterCol < 0 ? c8.classList.add('red') : c8.classList.remove('red');
        } else {
          c8.textContent = colDur > 0 ? 'Not reached' : 'N/A';
          c8.classList.remove('red');
        }

        document.getElementById('evnote')!.textContent =
          'Key events — Kathy retires: ' + kRetireYr + ' (age ' + p.kra + ') | Mel retires: ' + mRetireYr + ' (age ' + p.mra + ') | ' +
          'Conservative shift: ' + (MB + p.cage) + ' | Mel SS at ' + p.mssAge + ': ' + (MB + p.mssAge) + ' | Mel Medicare: ' + (MB + 65) + ' | ' +
          'Kathy SS at ' + p.kssAge + ': ' + (KB + p.kssAge) + ' | Kathy Medicare: ' + (KB + 65);

        var mc = runMonteCarlo(p);
        var probPct = Math.round(mc.prob * 100);
        var mcProbEl = document.getElementById('mc-prob')!;
        mcProbEl.textContent = probPct + '%';
        mcProbEl.className = 'cn ' + (probPct >= 80 ? 'grn' : probPct >= 60 ? '' : 'red');
        document.getElementById('mc-med')!.textContent = fc(mc.medRetire);
        document.getElementById('mc-p10')!.textContent = fc(mc.p10Retire);
        document.getElementById('mc-p90')!.textContent = fc(mc.p90Retire);

        drawChart(det.lbl, det.bal, det.ssa, det.drw, det.hlt, det.fry, mc);
      }

      // ── Slider wiring ─────────────────────────────────────────────────────────
      var sliders: [string, (v: string) => string][] = [
        ['kra', String], ['mra', String],
        ['mi', fc], ['ki', fc], ['oth', fc], ['tax', fp], ['raise', fp],
        ['exp', fc], ['sav', fc], ['irac', fc],
        ['rhi', fp], ['rlo', fp], ['cage', String], ['inf', fp], ['hinf', fp],
        ['mkt', fc], ['msupp', fc],
        ['ltcp', fc],
        ['ltcage', function(v) { return v === '0' ? 'Disabled' : v; }],
        ['ltccost', fc],
        ['ltcdur', function(v) { return v + ' yrs'; }],
        ['edusav', fc], ['educon', fc], ['edugrow', fp],
        ['k8cost', fc], ['hscost', fc], ['colcost', fc],
        ['coldur', function(v) { return v === '0' ? 'None' : v + ' yrs'; }],
        ['mss', function(v) { return '$' + Math.round(Number(v)).toLocaleString() + '/mo'; }],
        ['mss-age', String],
        ['kss', function(v) { return '$' + Math.round(Number(v)).toLocaleString() + '/mo'; }],
        ['kss-age', String],
      ];

      ['low', 'med', 'high'].forEach(function(level) {
        document.getElementById('risk-' + level)!.addEventListener('click', function() {
          riskLevel = level;
          ['low', 'med', 'high'].forEach(function(l) {
            document.getElementById('risk-' + l)!.classList.toggle('active', l === level);
          });
          run();
        });
      });

      sliders.forEach(function(pair) {
        var id = pair[0], fmt = pair[1];
        var el = document.getElementById(id) as HTMLInputElement;
        var out = document.getElementById(id + '-v');
        if (out) out.textContent = fmt(el.value);
        el.addEventListener('input', function() {
          if (out) out.textContent = fmt(el.value);
          run();
        });
      });

      window.addEventListener('resize', run);
      run();
    })();
  }, []);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: sans-serif; font-size: 13px; background: #f4f4f2; color: #111; }
        h2 { font-size: 17px; font-weight: 600; margin-bottom: 12px; }
        .two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
        .rbox { background: #d4e8ff; border: 2px solid #4d8fd4; border-radius: 10px; padding: 12px; }
        .rbox h3 { color: #0d4f9e; font-size: 13px; margin-bottom: 8px; }
        .bignum { font-size: 28px; font-weight: 700; color: #0d4f9e; min-width: 48px; text-align: right; }
        .sub { font-size: 11px; color: #336; margin-top: 4px; }
        .sec { background: #e8e8e6; border-radius: 10px; padding: 12px; margin-bottom: 10px; }
        .sec h3 { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
        .row { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
        .row label { font-size: 12px; color: #444; width: 220px; flex-shrink: 0; }
        .row input[type=range] { flex: 1; min-width: 0; touch-action: pan-y; }
        .val { font-size: 12px; font-weight: 600; min-width: 90px; text-align: right; }
        .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; margin-bottom: 10px; }
        .card { background: #e8e8e6; border-radius: 8px; padding: 8px 10px; }
        .card .cl { font-size: 11px; color: #555; margin-bottom: 3px; }
        .card .cn { font-size: 15px; font-weight: 600; }
        .red { color: #b02010 !important; }
        .grn { color: #227700 !important; }
        .igrid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px; }
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
        }
      `}</style>

      {/* Sticky nav */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 48, background: '#1a1a1a', zIndex: 200, display: 'flex', alignItems: 'center', padding: '0 1.25rem' }}>
        <a href="/" style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 5, padding: '4px 12px' }}>
          ← Home
        </a>
      </div>

      {/* Main content */}
      <div style={{ fontFamily: 'sans-serif', fontSize: 13, background: '#f4f4f2', color: '#111', padding: 12, paddingTop: 56 }}>

        <h2>Retirement Planner — Kathy &amp; Mel</h2>

        <div className="two">
          <div className="rbox">
            <h3>👩 Kathy — Retirement Age</h3>
            <div className="row">
              <input type="range" id="kra" min="55" max="70" step="1" defaultValue="62" style={{ flex: 1 }} />
              <span className="bignum" id="kra-v">62</span>
            </div>
            <div className="sub" id="kra-s"></div>
          </div>
          <div className="rbox">
            <h3>👨 Mel — Retirement Age</h3>
            <div className="row">
              <input type="range" id="mra" min="55" max="70" step="1" defaultValue="62" style={{ flex: 1 }} />
              <span className="bignum" id="mra-v">62</span>
            </div>
            <div className="sub" id="mra-s"></div>
          </div>
        </div>

        <div className="sec">
          <h3>🏥 Health Insurance at First Retirement</h3>
          <div className="igrid" id="igrid"></div>
        </div>

        <div className="sec">
          <h3>💼 Income While Working</h3>
          <div className="row"><label>Mel gross annual income</label><input type="range" id="mi" min="50000" max="300000" step="1000" defaultValue="130000" /><span className="val" id="mi-v"></span></div>
          <div className="row"><label>Kathy gross annual income</label><input type="range" id="ki" min="30000" max="200000" step="1000" defaultValue="80000" /><span className="val" id="ki-v"></span></div>
          <div className="row"><label>Other income (rentals, FSA, etc.)</label><input type="range" id="oth" min="0" max="80000" step="500" defaultValue="7000" /><span className="val" id="oth-v"></span></div>
          <div className="row"><label>Combined tax rate (%)</label><input type="range" id="tax" min="10" max="50" step="1" defaultValue="30" /><span className="val" id="tax-v"></span></div>
          <div className="row"><label>Annual salary raise (%)</label><input type="range" id="raise" min="0" max="6" step="0.25" defaultValue="2.5" /><span className="val" id="raise-v"></span></div>
        </div>

        <div className="sec">
          <h3>💰 Finances</h3>
          <div className="row"><label>Annual household expenses <span style={{ fontWeight: 400, color: '#888' }}>(exclude IRA &amp; education contributions — tracked below)</span></label><input type="range" id="exp" min="40000" max="200000" step="1000" defaultValue="80000" /><span className="val" id="exp-v"></span></div>
          <div className="row"><label>Annual IRA contribution → added directly to retirement fund each year</label><input type="range" id="irac" min="0" max="30000" step="500" defaultValue="14000" /><span className="val" id="irac-v"></span></div>
          <div className="row"><label>Pooled retirement savings <span style={{ fontWeight: 400, color: '#888' }}>(exclude Jo&apos;s education fund — set separately below)</span></label><input type="range" id="sav" min="50000" max="3000000" step="5000" defaultValue="1400000" /><span className="val" id="sav-v"></span></div>
          <div className="row"><label>Aggressive growth rate (%)</label><input type="range" id="rhi" min="5" max="25" step="0.5" defaultValue="15" /><span className="val" id="rhi-v"></span></div>
          <div className="row"><label>Conservative growth rate (%)</label><input type="range" id="rlo" min="1" max="10" step="0.5" defaultValue="4.5" /><span className="val" id="rlo-v"></span></div>
          <div className="row"><label>Switch to conservative (Mel age)</label><input type="range" id="cage" min="55" max="68" step="1" defaultValue="60" /><span className="val" id="cage-v"></span></div>
          <div className="row"><label>Inflation rate (%)</label><input type="range" id="inf" min="1" max="6" step="0.25" defaultValue="2.5" /><span className="val" id="inf-v"></span></div>
          <div className="row"><label>Healthcare inflation rate (%) — applies to marketplace &amp; Medicare</label><input type="range" id="hinf" min="2" max="12" step="0.5" defaultValue="6" /><span className="val" id="hinf-v"></span></div>
          <div className="row"><label>Marketplace insurance/person/yr</label><input type="range" id="mkt" min="5000" max="40000" step="500" defaultValue="24000" /><span className="val" id="mkt-v"></span></div>
          <div className="row"><label>Medicare supplement/person/yr (NC: Part B ~$2,220 + Plan G ~$1,500–$3,600)</label><input type="range" id="msupp" min="2000" max="10000" step="100" defaultValue="5000" /><span className="val" id="msupp-v"></span></div>
        </div>

        <div className="sec">
          <h3>🏥 Long-Term Care</h3>
          <div className="note" style={{ marginBottom: 8 }}>Use <strong>either</strong> the annual premium (if insured) <strong>or</strong> the event cost (if self-insuring) — not both.</div>
          <div className="row"><label>Annual LTC insurance premium (combined)</label><input type="range" id="ltcp" min="0" max="12000" step="250" defaultValue="6000" /><span className="val" id="ltcp-v"></span></div>
          <div className="row"><label>LTC event: Mel&apos;s age it begins (0 = disabled)</label><input type="range" id="ltcage" min="0" max="90" step="1" defaultValue="0" /><span className="val" id="ltcage-v"></span></div>
          <div className="row"><label>LTC event: annual cost (nursing/home aide)</label><input type="range" id="ltccost" min="0" max="150000" step="5000" defaultValue="90000" /><span className="val" id="ltccost-v"></span></div>
          <div className="row"><label>LTC event: duration (years)</label><input type="range" id="ltcdur" min="1" max="10" step="1" defaultValue="3" /><span className="val" id="ltcdur-v"></span></div>
        </div>

        <div className="sec">
          <h3>🎓 Jo&apos;s Education (born Oct 2018)</h3>
          <div className="note" style={{ marginBottom: 8 }}><strong>K-8 tuition</strong> is paid from your household budget (it&apos;s inside the expenses slider) — the K-8 amount is released back to your retirement surplus in 2032 when she enters high school.<br /><strong>High school and college</strong> costs are drawn from this education fund. If the fund runs out, the shortfall hits the retirement fund.</div>
          <div className="row"><label>Education fund current balance</label><input type="range" id="edusav" min="0" max="300000" step="1000" defaultValue="70000" /><span className="val" id="edusav-v"></span></div>
          <div className="row"><label>Annual contribution to fund (already in your expenses)</label><input type="range" id="educon" min="0" max="20000" step="500" defaultValue="6000" /><span className="val" id="educon-v"></span></div>
          <div className="row"><label>Education fund growth rate (%)</label><input type="range" id="edugrow" min="1" max="10" step="0.5" defaultValue="5" /><span className="val" id="edugrow-v"></span></div>
          <div className="row"><label>K-8 annual tuition (currently in your expenses)</label><input type="range" id="k8cost" min="0" max="30000" step="500" defaultValue="10000" /><span className="val" id="k8cost-v"></span></div>
          <div className="row"><label>High school annual cost (0 = public school)</label><input type="range" id="hscost" min="0" max="40000" step="500" defaultValue="0" /><span className="val" id="hscost-v"></span></div>
          <div className="row"><label>College annual cost — in-state public ~$30K · OOS public ~$48K · private ~$65K</label><input type="range" id="colcost" min="0" max="90000" step="1000" defaultValue="30000" /><span className="val" id="colcost-v"></span></div>
          <div className="row"><label>College duration (yrs) — 4=BA · 6=BA+MA · 8=BA+PhD or med · 0=none</label><input type="range" id="coldur" min="0" max="10" step="1" defaultValue="4" /><span className="val" id="coldur-v"></span></div>
        </div>

        <div className="sec">
          <h3>🏛️ Social Security</h3>
          <div className="note" style={{ marginBottom: 8 }}>Enter your estimated monthly benefit <strong>at age 62</strong> (from SSA.gov). The app calculates the adjusted benefit based on your chosen claim age using the official SSA reduction/delay formula (FRA = 67).</div>
          <div className="row"><label>Mel monthly SS benefit at age 62</label><input type="range" id="mss" min="500" max="2500" step="50" defaultValue="1100" /><span className="val" id="mss-v"></span></div>
          <div className="row"><label>Mel — claim SS at age</label><input type="range" id="mss-age" min="62" max="70" step="1" defaultValue="62" /><span className="val" id="mss-age-v"></span></div>
          <div className="ss-adj" id="mss-adj"></div>
          <div className="row" style={{ marginTop: 10 }}><label>Kathy monthly SS benefit at age 62</label><input type="range" id="kss" min="500" max="2500" step="50" defaultValue="1000" /><span className="val" id="kss-v"></span></div>
          <div className="row"><label>Kathy — claim SS at age</label><input type="range" id="kss-age" min="62" max="70" step="1" defaultValue="62" /><span className="val" id="kss-age-v"></span></div>
          <div className="ss-adj" id="kss-adj"></div>
        </div>

        <div className="sec">
          <h3>🎲 Monte Carlo — What-If Scenarios</h3>
          <div className="note" style={{ marginBottom: 8 }}>Runs 2,000 simulations with randomized annual returns to show the probability your funds outlast you and the spread of outcomes. Market risk sets how wildly returns vary year to year around your chosen averages.</div>
          <div className="risk-toggle">
            <button id="risk-low">Low</button>
            <button id="risk-med" className="active">Medium</button>
            <button id="risk-high">High</button>
          </div>
          <div className="cards" style={{ marginTop: 8 }}>
            <div className="card"><div className="cl">Probability funds last to 90</div><div className="cn" id="mc-prob">—</div></div>
            <div className="card"><div className="cl">Median fund at retirement</div><div className="cn" id="mc-med">—</div></div>
            <div className="card"><div className="cl">10th pct (bad market)</div><div className="cn" id="mc-p10">—</div></div>
            <div className="card"><div className="cl">90th pct (good market)</div><div className="cn" id="mc-p90">—</div></div>
          </div>
        </div>

        <div className="cards">
          <div className="card"><div className="cl">Fund at first retirement</div><div className="cn" id="c1">—</div></div>
          <div className="card"><div className="cl">Year-1 expenses</div><div className="cn" id="c2">—</div></div>
          <div className="card"><div className="cl">Years funds last</div><div className="cn" id="c3">—</div></div>
          <div className="card"><div className="cl">Depleted year</div><div className="cn" id="c4">—</div></div>
          <div className="card"><div className="cl">Depleted: Mel&apos;s age</div><div className="cn" id="c5">—</div></div>
          <div className="card"><div className="cl">Depleted: Kathy&apos;s age</div><div className="cn" id="c6">—</div></div>
          <div className="card"><div className="cl">Jo&apos;s edu fund entering college</div><div className="cn" id="c7">—</div></div>
          <div className="card"><div className="cl">Jo&apos;s edu fund after college (neg = retirement covered shortfall)</div><div className="cn" id="c8">—</div></div>
        </div>

        <div className="leg">
          <span><span className="dot" style={{ background: '#4488cc' }}></span>Fund balance (base case)</span>
          <span><span className="dot" style={{ background: 'rgba(100,160,220,0.35)' }}></span>MC p10–p90 band</span>
          <span><span className="dot" style={{ background: '#22aa66' }}></span>SS income</span>
          <span><span className="dot" style={{ background: '#cc3322' }}></span>Net draw</span>
          <span><span className="dot" style={{ background: '#dd8800' }}></span>Health costs</span>
        </div>

        <svg id="chart" viewBox="0 0 560 200" style={{ width: '100%', display: 'block' }}></svg>
        <div className="note" id="evnote"></div>

      </div>
    </>
  );
}
