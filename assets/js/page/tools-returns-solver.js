/* Returns & Reverse-Solve: what you would have to believe.

   A capital plan almost always states revenue and capital and stops, and
   leaves the reader to guess whether the one earns anything on the other.
   The usual response is to build a forecast, which answers "what will
   happen" with more confidence than the inputs can support. This asks the
   question the other way round: given the plan's own revenue and capital,
   what must be true — how much debt the cash flow will carry, what margin
   a return needs, and what the business must be worth at the end for a
   hurdle rate to be met.

   Debt service is annualDebtService from common.js, the same function the
   Venture Builder and the Control Room use. Two implementations of one
   lender formula would drift on exactly the number a credit committee
   reads, so there is one.

   Nothing here is a benchmark. Every figure is the reader's, and the one
   default that is not — the 22% margin — is labelled on the page as a
   JK planning default, a house assumption rather than a published figure. */

(function () {
  applyPartner(); mountChrome();

  const store = toolStore("returns");
  let state = store.load();
  const $ = id => document.getElementById(id);
  const IDS = ["rs-capital", "rs-r1", "rs-r2", "rs-r3", "rs-r4", "rs-r5", "rs-margin", "rs-rate", "rs-term", "rs-cov", "rs-debt", "rs-hurdle", "rs-yield", "rs-urev", "rs-umg", "rs-urate", "rs-exit"];
  const DEFAULTS = { "rs-capital": 100, "rs-r1": 8, "rs-r2": 12, "rs-r3": 18, "rs-r4": 26, "rs-r5": 36, "rs-margin": 22, "rs-rate": 9, "rs-term": 7, "rs-cov": 1.25, "rs-debt": 30, "rs-hurdle": 10, "rs-yield": 15, "rs-urev": 20, "rs-umg": 5, "rs-urate": 3, "rs-exit": 6, "rs-phase": "even" };
  /* Bounds on typing and paste: a negative rate or a margin above the
     revenue is a confident wrong answer, which is worse than a refused one.
     A negative margin is deliberately allowed — a loss-making case is a
     real scenario. */
  const BOUNDS = { "rs-capital": [0, 1e6], "rs-r1": [0, 1e6], "rs-r2": [0, 1e6], "rs-r3": [0, 1e6], "rs-r4": [0, 1e6], "rs-r5": [0, 1e6], "rs-margin": [-100, 95], "rs-rate": [0, 40], "rs-term": [1, 50], "rs-cov": [0.5, 5], "rs-debt": [0, 1e6], "rs-hurdle": [0, 50], "rs-yield": [0, 100], "rs-urev": [0, 80], "rs-umg": [0, 40], "rs-urate": [0, 15], "rs-exit": [0, 40] };
  const num = id => clampNum(parseFloat($(id).value), BOUNDS[id][0], BOUNDS[id][1]);
  /* A negative amount prints with a real minus sign, and anything that rounds to zero prints as zero, never "-0.0". */
  const m = x => { const v = Math.abs(x) < 0.05 ? 0 : x; return `USD ${v < 0 ? "\u2212" : ""}${Math.abs(v).toLocaleString("en-GB", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}m`; };
  const pc = x => x === null || !isFinite(x) ? "n/a" : `${x < 0 && Math.abs(x) >= 0.0005 ? "\u2212" : ""}${Math.abs(x * 100).toFixed(1)}%`;
  const mult = x => x === null || !isFinite(x) ? "n/a" : `${x.toFixed(1)}×`;

  /* Internal rate of return by bisection. No sign change in the cash flows means there is no rate, and the answer is null rather than a number. */
  function irr(cfs) {
    const f = r => cfs.reduce((a, c, t) => a + c / Math.pow(1 + r, t), 0);
    let lo = -0.99, hi = 10; const flo = f(lo), fhi = f(hi);
    if (!isFinite(flo) || !isFinite(fhi) || flo * fhi > 0) return null;
    for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (f(lo) * f(mid) <= 0) hi = mid; else lo = mid; }
    return (lo + hi) / 2;
  }

  IDS.concat(["rs-phase"]).forEach(id => {
    if (state[id] !== undefined) $(id).value = state[id];
    $(id).addEventListener("input", () => run());
    $(id).addEventListener("change", () => run());
  });

  function model() {
    const cap = num("rs-capital"), rev = [1, 2, 3, 4, 5].map(i => num("rs-r" + i)), mg = num("rs-margin") / 100;
    const rate = num("rs-rate"), term = num("rs-term"), cov = num("rs-cov"), debt = num("rs-debt"), hur = num("rs-hurdle") / 100, yld = num("rs-yield") / 100;
    const phase = $("rs-phase").value;
    const ebitda = rev.map(r => r * mg);
    const f = annualDebtService(1, rate, term);             // debt service per USD of debt
    const last = ebitda[4];
    const maxDebt = f > 0 && cov > 0 ? Math.max(0, last / cov / f) : 0;
    const ds = debt * f;
    const dscr = ds > 0 ? last / ds : null;
    const facility = Math.max(0, maxDebt);
    const dsFac = facility * f;
    const byYear = ebitda.map((e, i) => ({ year: i + 1, rev: rev[i], ebitda: e, cover: dsFac > 0 ? e / dsFac : null }));
    const marginForYield = rev[4] > 0 ? yld * cap / rev[4] : null;
    const tvAt = h => {
      const pvCapex = phase === "start" ? cap : (cap / 3) * (1 + 1 / (1 + h) + 1 / Math.pow(1 + h, 2));
      const pv = ebitda.reduce((a, e, i) => a + e / Math.pow(1 + h, i + 1), 0);
      const T = (pvCapex - pv) * Math.pow(1 + h, 5);
      return { h, tv: Math.max(0, T), none: T <= 0, pct: cap > 0 ? Math.max(0, T) / cap : 0 };
    };
    const tvs = [hur - 0.02, hur, hur + 0.02].map(h => Math.max(0, h)).map(tvAt);
    const cum = ebitda.reduce((a, b) => a + b, 0);
    const spread = { rev: num("rs-urev") / 100, mg: num("rs-umg") / 100, rate: num("rs-urate") };

    /* ---- the debt you plan to draw, tested year by year ----
       The facility in the headline is sized to year 5. The debt actually
       planned is what a lender reads, and it is read at its weakest year.
       Payments run for the term only, so a term shorter than five years
       leaves the later years with nothing to service. */
    const xm = num("rs-exit");
    const pay = ebitda.map((e, i) => i + 1 <= term ? ds : 0);
    const planCover = ds > 0 ? ebitda.map((e, i) => pay[i] > 0 ? e / pay[i] : null) : null;
    const covered = planCover ? planCover.filter(c => c !== null) : [];
    const below1 = covered.filter(c => c < 1).length;
    const minCover = covered.length ? Math.min(...covered) : null;
    const minYear = minCover === null ? null : planCover.indexOf(minCover) + 1;
    const avgCover = covered.length ? covered.reduce((a, c) => a + c, 0) / covered.length : null;
    const firstOk = planCover ? planCover.findIndex(c => c !== null && c >= cov) + 1 : 0;
    /* how far revenue can fall before the planned debt only just meets the covenant */
    const needE = cov * ds;
    const revNeed = mg > 0 && needE > 0 ? needE / mg : null;
    const headroom = revNeed !== null && rev[4] > 0 ? 1 - revNeed / rev[4] : null;
    const marginNeed = needE > 0 && rev[4] > 0 ? needE / rev[4] : null;

    /* ---- the funding position through the ramp ----
       Capital goes out at the start of its year, the draw comes in at the
       start of year 1, operating cash and debt service fall at year-ends.
       The capital figure is what the plan spends before the operation
       earns, so debt service during the ramp is on top of it, which is the
       point: it is paid from a business that has not yet got there. */
    const capex = phase === "start" ? [cap, 0, 0, 0, 0] : [cap / 3, cap / 3, cap / 3, 0, 0];
    /* Capital is paid, and the debt drawn, at the start of a year; cash and debt service arrive at its end. The lowest
       point in a year is therefore either just after the start-of-year payment or at the year-end, whichever is lower:
       testing the year-ends alone can call a ramp funded when the equity cannot meet the capex when it falls due. */
    let run = 0;
    const fund = ebitda.map((e, i) => {
      const draw = i === 0 ? debt : 0, start = run - capex[i] + draw, net = -capex[i] + e - pay[i] + draw; run += net;
      return { year: i + 1, capex: capex[i], ebitda: e, ds: pay[i], draw, net, cum: run, low: Math.min(start, run) };
    });
    const trough = fund.reduce((a, y) => y.low < a.low ? y : a, fund[0]);
    const peak = Math.max(0, -trough.low), equity = Math.max(0, cap - debt), gap = Math.max(0, peak - equity);

    /* ---- returns at an exit ----
       Same timing as the required-exit-value calculation above, so the two
       agree: an exit at the multiple the hurdle needs earns the hurdle. */
    const cf = [0, 0, 0, 0, 0, 0];
    capex.forEach((x, i) => { cf[i] -= x; }); ebitda.forEach((e, i) => { cf[i + 1] += e; });
    const exitValue = Math.max(0, xm * last); cf[5] += exitValue;
    const eq = cf.slice(); let bal = debt; eq[0] += debt;
    for (let t = 1; t <= 5; t++) { bal = Math.max(0, bal + bal * rate / 100 - pay[t - 1]); eq[t] -= pay[t - 1]; }
    const owed = bal; eq[5] -= owed;
    const outs = eq.filter(x => x < 0).reduce((a, x) => a + x, 0), ins = eq.filter(x => x > 0).reduce((a, x) => a + x, 0);
    const npv = cf.reduce((a, c, t) => a + c / Math.pow(1 + hur, t), 0);
    /* Three different situations, not one. The cash flow can earn the hurdle on its own (nothing is needed from an exit); there can be
       a required exit value but a year-5 EBITDA of zero or less to hang a multiple on; or there is a multiple. A blank is none of them. */
    const earns = tvs[1].none, noEbitda = !earns && !(last > 0);
    const reqMult = !earns && last > 0 ? tvs[1].tv / last : null;
    const ret = { earns, noEbitda, xm, exitValue, projIrr: irr(cf), eqIrr: irr(eq), moic: outs < 0 ? ins / -outs : null, npv, owed, reqMult };
    return { spread, cap, rev, mg, rate, term, cov, debt, hur, yld, phase, ebitda, f, last, maxDebt, ds, dscr, byYear, marginForYield, tvs, cum,
      plan: { cover: planCover, below1, minCover, minYear, avgCover, firstOk, needE, revNeed, headroom, marginNeed }, fund, peak, trough, equity, gap, ret };
  }


  /* Sensitivity. Two views of one question, how much does the answer move
     when the inputs are wrong. The tornado moves one input at a time and
     ranks them; the simulation moves them together across the ranges the
     reader states. The generator is seeded, so the same inputs always give
     the same percentiles: a number that changes on reload cannot be
     quoted to a lender. */
  function capacity(M, o) {
    const f = annualDebtService(1, Math.max(0, o.rate), o.term);
    return f > 0 && o.cov > 0 ? Math.max(0, M.rev[4] * o.revMult * o.mg / o.cov / f) : 0;
  }
  function exitPct(M, o) {
    const ebitda = M.rev.map(r => r * o.revMult * o.mg), h = M.hur;
    const pvCapex = M.phase === "start" ? M.cap : (M.cap / 3) * (1 + 1 / (1 + h) + 1 / Math.pow(1 + h, 2));
    const pv = ebitda.reduce((a, e, i) => a + e / Math.pow(1 + h, i + 1), 0);
    return Math.max(0, (pvCapex - pv) * Math.pow(1 + h, 5)) / M.cap;
  }
  const baseOf = M => ({ revMult: 1, mg: M.mg, rate: M.rate, term: M.term, cov: M.cov });
  function tornado(M) {
    const b = baseOf(M), sp = M.spread;
    const vars = [
      ["Revenue, all years", `±${(sp.rev * 100).toFixed(0)}%`, { revMult: 1 - sp.rev }, { revMult: 1 + sp.rev }],
      ["EBITDA margin", `±${(sp.mg * 100).toFixed(1)} pts`, { mg: b.mg - sp.mg }, { mg: b.mg + sp.mg }],
      ["Interest rate", `±${sp.rate.toFixed(1)} pts`, { rate: b.rate + sp.rate }, { rate: Math.max(0, b.rate - sp.rate) }],
      ["Repayment term", "±2 years", { term: Math.max(1, b.term - 2) }, { term: b.term + 2 }],
      ["Covenant floor", "±0.15×", { cov: b.cov + 0.15 }, { cov: Math.max(0.5, b.cov - 0.15) }]
    ];
    const base = capacity(M, b);
    return { base, rows: vars.map(([n, r, lo, hi]) => ({ n, r, lo: capacity(M, Object.assign({}, b, lo)), hi: capacity(M, Object.assign({}, b, hi)) })).sort((x, y) => Math.abs(y.hi - y.lo) - Math.abs(x.hi - x.lo)) };
  }
  function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const tri = (rnd, c, w) => { const u = rnd(); return u < 0.5 ? c - w + w * Math.sqrt(2 * u) : c + w - w * Math.sqrt(2 * (1 - u)); };
  const pctile = (arr, p) => arr[Math.min(arr.length - 1, Math.max(0, Math.floor(p * (arr.length - 1))))];
  function simulate(M) {
    const N = 2000, rnd = seeded(20261023), sp = M.spread, caps = [], exits = [];
    let breach = 0;
    for (let i = 0; i < N; i++) {
      const o = { revMult: tri(rnd, 1, sp.rev), mg: tri(rnd, M.mg, sp.mg), rate: Math.max(0, tri(rnd, M.rate, sp.rate)), term: M.term, cov: M.cov };
      const c = capacity(M, o); caps.push(c); exits.push(exitPct(M, o));
      if (M.debt > 0 && c < M.debt) breach++;
    }
    caps.sort((a, b) => a - b); exits.sort((a, b) => a - b);
    return { N, caps, exits, breach: M.debt > 0 ? breach / N : null };
  }


  /* Assumption register. Every figure the tool supplies for the reader
     carries a grade and a basis, and an override shows how far it moved.
     A = sourced to a published, dated reference; B = derived; C = a JK
     planning default, a house assumption and not a published benchmark.
     The reader's own figures (capital, revenue) are theirs, not defaults. */
  const ASSUMP = [
    ["rs-margin", "EBITDA margin", "%", " pts", "C", "JK planning default for a first-pass test. A house assumption, not a published benchmark."],
    ["rs-rate", "Interest rate", "%", " pts", "C", "JK planning default. Reference: Kenya's average commercial lending rate was 14.34% in August 2026 (Central Bank of Kenya), in shillings; pricing for dollar aircraft debt is not published."],
    ["rs-term", "Repayment term", " years", " years", "C", "JK planning default for aircraft and asset-backed debt."],
    ["rs-cov", "Covenant floor", "×", "×", "C", "JK lender floor; lenders commonly quote 1.20× to 1.30×. Not a lender's term sheet."],
    ["rs-hurdle", "Return you need", "%", " pts", "C", "Illustrative cost of capital. Set it to your sponsor's hurdle."],
    ["rs-yield", "EBITDA yield wanted", "%", " pts", "C", "Illustrative target. Set it to your own."],
    ["rs-exit", "Exit multiple", "×", "×", "C", "Illustrative. A multiple is a market observation, not a default; no published multiple is used here. Set it to the one you would defend."]
  ];
  function assumptions() {
    return `<div class="table-scroll"><table class="gap-table"><thead><tr><th>Assumption</th><th>Your value</th><th>Default</th><th>Grade</th><th>Basis</th></tr></thead><tbody>` +
      ASSUMP.map(([id, n, u, du, g, basis]) => {
        const v = num(id), d = DEFAULTS[id], diff = v - d, moved = Math.abs(diff) > 1e-9;
        const fmt = x => (Number.isInteger(x) ? x : x.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")) + u;
        const chg = moved ? `<div><b>changed by ${diff > 0 ? "+" : "−"}${Math.abs(diff).toFixed(du === "×" ? 2 : 1).replace(/\.0$/, du === "×" ? "" : ".0")}${du}</b></div>` : `<div class="muted">default</div>`;
        return `<tr><td>${escapeHtml(n)}</td><td class="tnum">${fmt(v)}${chg}</td><td class="tnum">${fmt(d)}</td><td><b>${g}</b></td><td>${escapeHtml(basis)}</td></tr>`;
      }).join("") + `</tbody></table></div><p class="hint" style="margin-top:.5rem">A = published, dated source. B = derived. C = JK planning default. Capital and revenue are your own figures, not defaults.</p>`;
  }

  function ok(M) { return M.cap > 0 && M.rev[4] > 0 && isFinite(M.f) && M.f > 0; }

  function run() {
    IDS.forEach(id => { state[id] = $(id).value; }); state["rs-phase"] = $("rs-phase").value;
    const M = model();
    if (!ok(M)) { blank(M); return; }
    render(M); summarise(M);
    store.save(state);
  }

  function blank() {
    $("rs-head").textContent = "—"; $("rs-band").textContent = "Enter the plan's revenue and capital.";
    $("rs-qual").textContent = "Capital, final-year revenue and a repayment term above zero are needed before anything can be tested.";
    ["rs-kpis", "rs-findings", "rs-years", "rs-grid", "rs-tv", "rs-tornado", "rs-mc", "rs-assump", "rs-plan", "rs-funding", "rs-breakeven", "rs-irr", "rs-hist"].forEach(id => { $(id).innerHTML = ""; });
    mountPrintSummary(null);
  }

  const cover = (c, floor) => c === null ? "—" : `<b class="tnum" style="color:${c >= floor ? "var(--jk-green)" : c >= 1 ? "var(--jk-amber-text)" : "var(--jk-red-dk)"}">${fmtRatio(c)}</b>`;

  function render(M) {
    const debtPct = M.cap > 0 ? M.maxDebt / M.cap * 100 : 0;
    $("rs-head").textContent = m(M.maxDebt);
    $("rs-band").textContent = `Debt the final year's cash flow will carry, at ${M.cov.toFixed(2)}× cover`;
    $("rs-qual").textContent = `${debtPct.toFixed(0)}% of the capital. The balance, ${m(Math.max(0, M.cap - M.maxDebt))}, has to be equity or sponsor funding, and the plan should say whose.`;
    const hurTv = M.tvs[1];
    $("rs-kpis").innerHTML = [
      ["EBITDA yield on capital, yr 5", (M.last / M.cap * 100).toFixed(1) + "%", ""],
      ["Margin for a " + (M.yld * 100).toFixed(0) + "% yield", M.marginForYield === null ? "—" : (M.marginForYield * 100).toFixed(1) + "%", M.marginForYield !== null && M.marginForYield > M.mg + 0.1 ? "is-amber" : ""],
      ["Cover on planned debt", M.dscr === null ? "none drawn" : fmtRatio(M.dscr), M.dscr !== null && M.dscr < M.cov ? "is-red" : "is-green"],
      ["Exit value needed", hurTv.none ? "none" : Math.round(hurTv.pct * 100) + "% of capital", !hurTv.none && hurTv.pct > 1.1 ? "is-amber" : ""]
    ].map(([l, v, c]) => `<div class="kpi ${c}"><div class="kv tnum">${v}</div><div class="kl">${l}</div></div>`).join("");

    /* per-year cover on the facility sized to the final year */
    $("rs-years").innerHTML = `<div class="table-scroll"><table class="gap-table"><thead><tr><th>Year</th><th>Revenue</th><th>EBITDA</th><th>Cover on a ${m(M.maxDebt)} facility</th></tr></thead><tbody>` +
      M.byYear.map(y => `<tr><td>Year ${y.year}</td><td class="tnum">${m(y.rev)}</td><td class="tnum">${m(y.ebitda)}</td><td>${cover(y.cover, M.cov)}</td></tr>`).join("") + `</tbody></table></div>`;

    /* cover grid: debt as a share of capital against margin */
    const shares = [0.3, 0.4, 0.5, 0.6, 0.7], mgs = [M.mg, M.mg + 0.04, M.mg + 0.08, M.mg + 0.13].map(x => Math.min(0.95, x));
    $("rs-grid").innerHTML = `<div class="table-scroll"><table class="gap-table"><thead><tr><th>Debt drawn</th>${mgs.map(x => `<th>${(x * 100).toFixed(0)}% margin</th>`).join("")}</tr></thead><tbody>` +
      shares.map(s => { const d = M.cap * s, dsv = annualDebtService(d, M.rate, M.term);
        return `<tr><td class="tnum">${m(d)} · ${Math.round(s * 100)}%</td>${mgs.map(x => `<td>${cover(dsv > 0 ? M.rev[4] * x / dsv : null, M.cov)}</td>`).join("")}</tr>`; }).join("") +
      `</tbody></table></div><p class="hint" style="margin-top:.5rem">Green clears the ${M.cov.toFixed(2)}× covenant; amber covers the debt but not the covenant; red does not cover it.</p>`;

    $("rs-tv").innerHTML = `<div class="table-scroll"><table class="gap-table"><thead><tr><th>Return needed</th><th>Cumulative EBITDA, 5 yrs</th><th>Business must be worth</th><th>As % of capital</th></tr></thead><tbody>` +
      M.tvs.map(t => `<tr><td class="tnum">${(t.h * 100).toFixed(1)}%</td><td class="tnum">${m(M.cum)}</td><td class="tnum">${t.none ? "nothing: the cash flow alone earns it" : m(t.tv)}</td><td class="tnum">${t.none ? "—" : Math.round(t.pct * 100) + "%"}</td></tr>`).join("") +
      `</tbody></table></div>`;

    /* findings, ordered by how fatal they are */
    const items = [];
    if (M.debt > M.maxDebt + 1e-9) items.push(["Stop", "Planned debt exceeds what the cash flow carries", `${m(M.debt)} drawn against a capacity of ${m(M.maxDebt)} at ${M.cov.toFixed(2)}×: cover is ${fmtRatio(M.dscr)}.`]);
    const bad = M.byYear.filter(y => y.cover !== null && y.cover < 1);
    if (bad.length) items.push(["Warning", "Debt sized to the end state fails in the ramp", `Cover is below 1.00× in year${bad.length > 1 ? "s" : ""} ${bad.map(y => y.year).join(", ")} on a ${m(M.maxDebt)} facility. Size debt to contracted cash flow, not to year 5.`]);
    if (M.marginForYield !== null && M.marginForYield > M.mg + 0.001) items.push(["Warning", `A ${(M.yld * 100).toFixed(0)}% EBITDA yield needs a ${(M.marginForYield * 100).toFixed(1)}% margin`, `The plan's margin is ${(M.mg * 100).toFixed(1)}%. The gap is ${((M.marginForYield - M.mg) * 100).toFixed(1)} points of revenue.`]);
    const P = M.plan, R = M.ret;
    if (M.debt > 0 && P.cover && P.below1 > 0) items.push(["Warning", `Cover on the planned ${m(M.debt)} is below 1.00× in ${P.below1} of ${P.cover.filter(c => c !== null).length} years`, `The lowest is ${fmtRatio(P.minCover)} in year ${P.minYear}; ${P.firstOk ? `it first reaches the ${M.cov.toFixed(2)}× covenant in year ${P.firstOk}` : `it does not reach the ${M.cov.toFixed(2)}× covenant within five years`}. A lender reads the weakest year.`]);
    if (M.gap > 0.05) items.push(["Stop", "The equity does not fund the ramp", `Peak funding need is ${m(M.peak)} in year ${M.trough.year}, against ${m(M.equity)} of equity: short by ${m(M.gap)}. Debt service during the ramp is paid from a business that has not yet got there.`]);
    if (P.headroom !== null && P.headroom >= 0 && P.headroom < 0.1) items.push(["Warning", `Only ${(P.headroom * 100).toFixed(1)}% of revenue headroom on the planned debt`, `Year-5 revenue can fall to ${m(P.revNeed)} before ${m(M.debt)} only just meets the ${M.cov.toFixed(2)}× covenant.`]);
    if (R.noEbitda) items.push(["Warning", "No exit multiple can earn the hurdle: year-5 EBITDA is not positive", `The business would have to be worth ${m(M.tvs[1].tv)} at the end of year 5 with nothing earning, and a multiple of nothing is nothing. Look at the margin first.`]);
    if (R.reqMult !== null && R.reqMult > R.xm * 1.25) items.push(["Warning", `The hurdle needs a ${mult(R.reqMult)} exit multiple, against ${mult(R.xm)} assumed`, `At ${mult(R.xm)} the project returns ${pc(R.projIrr)} against a ${(M.hur * 100).toFixed(1)}% hurdle. Ask whether a buyer would pay ${mult(R.reqMult)} year-5 EBITDA for this business.`]);
    items.push(["Note", `Cumulative EBITDA covers ${(M.cum / M.cap * 100).toFixed(0)}% of the capital`, `${m(M.cum)} over five years against ${m(M.cap)} deployed. ${hurTv.none ? "The cash flow alone earns the hurdle." : `For a ${(M.hur * 100).toFixed(1)}% return the business must be worth ${m(hurTv.tv)} (${Math.round(hurTv.pct * 100)}% of capital) at the end of year 5.`}`]);
    $("rs-findings").innerHTML = items.map(([t, h, d]) => `<div style="padding:.55rem 0;border-bottom:1px solid rgba(255,255,255,.12);font-size:var(--fs-sm)"><b style="color:var(--jk-amber);font-size:var(--fs-xs);text-transform:uppercase;letter-spacing:.08em">${t}</b><div><b>${escapeHtml(h)}</b></div><div>${escapeHtml(d)}</div></div>`).join("");
    M._items = items;

    /* sensitivity */
    const T = tornado(M), S = simulate(M), swing = Math.max(1e-9, ...T.rows.map(r => Math.max(Math.abs(r.lo - T.base), Math.abs(r.hi - T.base))));
    $("rs-tornado").innerHTML = `<div class="table-scroll"><table class="gap-table"><thead><tr><th>Input moved</th><th>Range</th><th>Debt capacity, low case</th><th>High case</th><th>Swing</th></tr></thead><tbody>` +
      T.rows.map(r => `<tr><td>${escapeHtml(r.n)}</td><td class="tnum">${escapeHtml(r.r)}</td><td class="tnum">${m(Math.min(r.lo, r.hi))}</td><td class="tnum">${m(Math.max(r.lo, r.hi))}</td><td><div class="rs-bar" aria-hidden="true"><span style="width:${Math.round(Math.abs(r.hi - r.lo) / (2 * swing) * 100)}%"></span></div><span class="tnum">${m(Math.abs(r.hi - r.lo))}</span></td></tr>`).join("") +
      `</tbody></table></div><p class="hint" style="margin-top:.5rem">Each input moved alone, the rest held at your figures. Base capacity ${m(T.base)}.</p>`;
    const q = (a, p) => pctile(a, p);
    $("rs-mc").innerHTML = `<div class="table-scroll"><table class="gap-table"><thead><tr><th>Across ${S.N.toLocaleString("en-GB")} draws</th><th>P10</th><th>P50</th><th>P90</th></tr></thead><tbody>` +
      `<tr><td>Debt the cash flow carries</td><td class="tnum">${m(q(S.caps, .1))}</td><td class="tnum">${m(q(S.caps, .5))}</td><td class="tnum">${m(q(S.caps, .9))}</td></tr>` +
      `<tr><td>Exit value needed, % of capital</td><td class="tnum">${Math.round(q(S.exits, .1) * 100)}%</td><td class="tnum">${Math.round(q(S.exits, .5) * 100)}%</td><td class="tnum">${Math.round(q(S.exits, .9) * 100)}%</td></tr>` +
      `</tbody></table></div><p class="hint" style="margin-top:.5rem">${S.breach === null ? "No debt planned, so no breach test." : `Planned debt of ${m(M.debt)} breaches the covenant in <b>${Math.round(S.breach * 100)}%</b> of draws.`} P10 is the cautious end: nine draws in ten do better. A spread test on your own ranges, not a forecast.</p>`;
    $("rs-assump").innerHTML = assumptions();
    $("rs-plan").innerHTML = planView(M);
    $("rs-funding").innerHTML = fundingView(M);
    $("rs-breakeven").innerHTML = breakevenView(M);
    $("rs-irr").innerHTML = returnsView(M);
    $("rs-hist").innerHTML = histView(M, S);
    M._T = T; M._S = S;
  }


  /* ---- the added analysis. Output only: built from the model on each run, never an input. ---- */
  const tone = (c, floor) => c === null ? "" : c >= floor ? "ok" : c >= 1 ? "mid" : "bad";
  function planView(M) {
    const P = M.plan;
    if (!(M.debt > 0) || !P.cover) return `<p class="muted">No debt is planned, so there is no cover to test.</p>`;
    const top = Math.max(M.cov * 1.3, ...P.cover.filter(c => c !== null));
    const rows = P.cover.map((c, i) => `<div class="rs-crow"><span>Year ${i + 1}</span><span class="rs-track" aria-hidden="true">${c === null ? "" : `<i class="${tone(c, M.cov)}" style="width:${Math.min(100, c / top * 100).toFixed(1)}%"></i>`}<b class="rs-mark" style="left:${(M.cov / top * 100).toFixed(1)}%" title="Covenant ${M.cov.toFixed(2)}×"></b></span><span class="tnum">${c === null ? "no payment" : fmtRatio(c)}</span></div>`).join("");
    const n = P.cover.filter(c => c !== null).length;
    return `<div class="rs-chart">${rows}</div><p class="rs-note">Cover on the planned ${m(M.debt)} is below 1.00× in <b>${P.below1} of ${n}</b> years. The lowest is <b>${fmtRatio(P.minCover)}</b> in year ${P.minYear}; the average is ${fmtRatio(P.avgCover)}. ${P.firstOk ? `It first reaches the ${M.cov.toFixed(2)}× covenant in year ${P.firstOk}.` : `It does not reach the ${M.cov.toFixed(2)}× covenant within five years.`} The line marks the covenant.</p>`;
  }
  function fundingView(M) {
    const scale = Math.max(M.peak, M.equity, 1) * 1.08;
    const rows = M.fund.map(y => `<div class="rs-crow"><span>Year ${y.year}</span><span class="rs-track" aria-hidden="true">${y.low < 0 ? `<i class="${-y.low > M.equity ? "bad" : "mid"}" style="width:${Math.min(100, -y.low / scale * 100).toFixed(1)}%"></i>` : `<i class="ok" style="width:${Math.min(100, y.cum / scale * 100).toFixed(1)}%"></i>`}<b class="rs-mark" style="left:${Math.min(100, M.equity / scale * 100).toFixed(1)}%" title="Equity ${m(M.equity)}"></b></span><span class="tnum">${y.low < 0 ? "need " + m(-y.low) : "surplus " + m(y.cum)}</span></div>`).join("");
    const tbl = `<div class="table-scroll"><table class="gap-table"><thead><tr><th>Year</th><th>Capex</th><th>EBITDA</th><th>Debt service</th><th>Net cash</th><th>Year-end</th><th>Lowest</th></tr></thead><tbody>` +
      M.fund.map(y => `<tr><td>Year ${y.year}</td><td class="tnum">${m(-y.capex)}</td><td class="tnum">${m(y.ebitda)}</td><td class="tnum">${m(-y.ds)}</td><td class="tnum">${m(y.net)}</td><td class="tnum">${m(y.cum)}</td><td class="tnum"><b>${m(y.low)}</b></td></tr>`).join("") + `</tbody></table></div>`;
    const verdict = M.gap > 0.05 ? `Peak funding need is <b>${m(M.peak)}</b> in year ${M.trough.year}, against ${m(M.equity)} of equity: <b>short by ${m(M.gap)}</b>.` : `Peak funding need is ${m(M.peak)} in year ${M.trough.year}, against ${m(M.equity)} of equity: covered, with ${m(M.equity - M.peak)} to spare.`;
    return `<div class="rs-chart">${rows}</div><p class="rs-note">${verdict} The line marks the equity (capital less debt). The debt draw is year 1; capital goes out at the start of its year, cash and debt service fall at year-ends, so the lowest point in a year can be just after the capital goes out.</p>${tbl}`;
  }
  function breakevenView(M) {
    const P = M.plan;
    if (!(M.debt > 0) || P.needE <= 0) return `<p class="muted">No debt is planned, so there is no covenant to break.</p>`;
    const hr = P.headroom;
    const rows = [
      ["EBITDA the covenant needs", m(P.needE), `${M.cov.toFixed(2)}× the ${m(M.ds)} a year of debt service`],
      ["Year-5 revenue needed", P.revNeed === null ? "n/a (no positive margin)" : m(P.revNeed), `The plan has ${m(M.rev[4])}`],
      ["Revenue headroom", hr === null ? "n/a" : `${hr < 0 ? "−" : ""}${Math.abs(hr * 100).toFixed(1)}%`, hr === null ? "" : hr < 0 ? "Already short: the plan's revenue does not carry this debt at the covenant." : "How far year-5 revenue can fall before the covenant is only just met."],
      ["Margin needed at planned revenue", P.marginNeed === null ? "n/a" : `${(P.marginNeed * 100).toFixed(1)}%`, `The plan's margin is ${(M.mg * 100).toFixed(1)}%`]
    ];
    return `<div class="table-scroll"><table class="gap-table"><tbody>` + rows.map(([a, b, c]) => `<tr><td>${escapeHtml(a)}</td><td class="tnum"><b>${b}</b></td><td class="muted">${escapeHtml(c)}</td></tr>`).join("") + `</tbody></table></div>`;
  }
  function returnsView(M) {
    const R = M.ret;
    const rows = [
      ["Exit multiple assumed", mult(R.xm), `Exit value ${m(R.exitValue)} at the end of year 5`],
      ["Project IRR", pc(R.projIrr), `Against a ${(M.hur * 100).toFixed(1)}% hurdle. NPV at the hurdle ${m(R.npv)}`],
      ["Equity IRR", pc(R.eqIrr), R.projIrr !== null && R.eqIrr !== null ? (R.eqIrr > R.projIrr ? "Leverage adds to the return." : "Leverage costs more than the project earns, so the debt lowers the return.") : "No rate: the cash flows do not change sign."],
      ["Equity multiple", R.moic === null ? "n/a" : fmtRatio(R.moic), `Cash back for each dollar of equity put in. ${m(R.owed)} of debt is repaid from the exit`],
      ["Exit multiple the hurdle needs", R.earns ? "none needed" : R.noEbitda ? "n/a" : mult(R.reqMult), R.earns ? "The cash flow alone earns the hurdle." : R.noEbitda ? `Year-5 EBITDA is not positive, so no exit multiple can earn the hurdle: the business would have to be worth ${m(M.tvs[1].tv)} with nothing earning.` : `${mult(R.reqMult)} year-5 EBITDA, from the value the hurdle needs of ${m(M.tvs[1].tv)}`]
    ];
    return `<div class="table-scroll"><table class="gap-table"><tbody>` + rows.map(([a, b, c]) => `<tr><td>${escapeHtml(a)}</td><td class="tnum"><b>${b}</b></td><td class="muted">${escapeHtml(c)}</td></tr>`).join("") + `</tbody></table></div><p class="hint" style="margin-top:.5rem">Capital goes out at the start of its year and cash arrives at year-ends. An exit at the multiple the hurdle needs earns exactly the hurdle. A multiple is your assumption; none is a benchmark.</p>`;
  }
  function histView(M, S) {
    const B = 20, hi = Math.max(S.caps[S.caps.length - 1], M.debt * 1.1, 1), bins = new Array(B).fill(0);
    S.caps.forEach(c => { bins[Math.min(B - 1, Math.floor(c / hi * B))]++; });
    const top = Math.max(...bins), at = v => Math.min(100, Math.max(0, v / hi * 100)).toFixed(1);
    const q = p => pctile(S.caps, p);
    return `<div class="rs-hist" role="img" aria-label="Distribution of the debt capacity across ${S.N.toLocaleString("en-GB")} draws, P10 ${m(q(.1))}, P50 ${m(q(.5))}, P90 ${m(q(.9))}, planned debt ${m(M.debt)}">` +
      bins.map((n, i) => `<i class="rs-hbar${(i + 0.5) / B * hi < M.debt ? " below" : ""}" style="height:${Math.max(2, n / top * 100).toFixed(1)}%"></i>`).join("") +
      (M.debt > 0 ? `<b class="rs-pin plan" style="left:${at(M.debt)}%"><span>Planned ${m(M.debt)}</span></b>` : "") +
      `<b class="rs-pin p" style="left:${at(q(.1))}%"><span>P10</span></b><b class="rs-pin p" style="left:${at(q(.5))}%"><span>P50</span></b><b class="rs-pin p" style="left:${at(q(.9))}%"><span>P90</span></b></div>` +
      `<div class="rs-axis"><span>${m(0)}</span><span>${m(hi)}</span></div><p class="rs-note">Bars to the left of the planned-debt line are draws in which the cash flow would not carry it${S.breach === null ? "" : ` (${Math.round(S.breach * 100)}% of draws)`}. A spread test on your own ranges, not a forecast.</p>`;
  }

  function summarise(M) {
    const f = M._items.map(([t, h, d]) => ({ sev: t === "Stop" ? "stop" : t === "Warning" ? "warn" : "note", h, d }));
    if (!f.some(x => x.sev === "stop" || x.sev === "warn")) f.unshift({ sev: "ok", h: "The planned debt is within what the cash flow carries", d: `${m(M.debt)} drawn against a capacity of ${m(M.maxDebt)} at ${M.cov.toFixed(2)}×, with cover above the floor in every year of the facility.` });
    const P = M.plan, R = M.ret;
    if (M.debt > 0 && P.cover && P.minCover !== null) f.push({ sev: P.below1 > 0 ? "warn" : "note", h: `Cover on the planned ${m(M.debt)} runs from ${fmtRatio(P.minCover)} (year ${P.minYear}) to ${fmtRatio(Math.max(...P.cover.filter(c => c !== null)))}`, d: P.headroom === null ? "" : `Year-5 revenue can ${P.headroom < 0 ? "not fall at all: it is already short by" : "fall by"} ${Math.abs(P.headroom * 100).toFixed(1)}% before the covenant is only just met.` });
    f.push({ sev: M.gap > 0.05 ? "stop" : "note", h: M.gap > 0.05 ? `The equity is short of the ramp by ${m(M.gap)}` : `The equity covers the ramp, with ${m(M.equity - M.peak)} to spare`, d: `Peak funding need ${m(M.peak)} in year ${M.trough.year} against ${m(M.equity)} of equity.` });
    f.push({ sev: R.noEbitda || (R.reqMult !== null && R.reqMult > R.xm * 1.25) ? "warn" : "note", h: `At a ${mult(R.xm)} exit the project returns ${pc(R.projIrr)} and the equity ${pc(R.eqIrr)}`, d: R.earns ? "The cash flow alone earns the hurdle." : R.noEbitda ? "Year-5 EBITDA is not positive, so no exit multiple can earn the hurdle." : `The hurdle needs a ${mult(R.reqMult)} exit multiple.` });
    const S = M._S;
    if (S) { const b = S.breach; f.push({ sev: b !== null && b >= 0.2 ? "warn" : "note", h: `Across the stated ranges, debt capacity runs ${m(pctile(S.caps, .1))} to ${m(pctile(S.caps, .9))} (P10 to P90)`, d: b === null ? "No debt is planned, so no breach test was run." : `Planned debt of ${m(M.debt)} breaches the covenant in ${Math.round(b * 100)}% of ${S.N.toLocaleString("en-GB")} seeded draws.` }); }
    mountPrintSummary({
      title: "Returns and reverse-solve",
      verdict: `On ${m(M.rev[4])} of year-5 revenue at a ${(M.mg * 100).toFixed(1)}% margin, cash flow supports about ${m(M.maxDebt)} of debt, ${M.cap > 0 ? Math.round(M.maxDebt / M.cap * 100) : 0}% of the ${m(M.cap)} of capital.`,
      findings: f,
      basis: `Revenue and capital are as entered. Debt is a level payment at ${M.rate}% over ${M.term} years with a ${M.cov.toFixed(2)}× covenant floor, sized to year-5 EBITDA. Equity returns assume the debt is drawn at the start of year 1, serviced at each year-end and the balance repaid from the exit, at the exit multiple entered. Required exit value assumes capital ${M.phase === "start" ? "all deployed at the start" : "spread evenly over years 1 to 3"} and EBITDA received at each year-end, discounted at the return shown. A first-pass test, not a forecast or valuation.`
    });
  }

  $("print").addEventListener("click", () => window.print());
  $("reset").addEventListener("click", () => {
    IDS.forEach(id => { $(id).value = DEFAULTS[id]; }); $("rs-phase").value = DEFAULTS["rs-phase"]; run();
  });
  wireToolEnquiryForm("rs-enquiry", "Returns & Reverse-Solve");
  mountPrintHead("Returns & Reverse-Solve", "What you would have to believe for the capital to earn its keep");
  run();
})();
