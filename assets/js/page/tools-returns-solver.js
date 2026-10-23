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
  const IDS = ["rs-capital", "rs-r1", "rs-r2", "rs-r3", "rs-r4", "rs-r5", "rs-margin", "rs-rate", "rs-term", "rs-cov", "rs-debt", "rs-hurdle", "rs-yield"];
  const DEFAULTS = { "rs-capital": 100, "rs-r1": 8, "rs-r2": 12, "rs-r3": 18, "rs-r4": 26, "rs-r5": 36, "rs-margin": 22, "rs-rate": 9, "rs-term": 7, "rs-cov": 1.25, "rs-debt": 30, "rs-hurdle": 10, "rs-yield": 15, "rs-phase": "even" };
  /* Bounds on typing and paste: a negative rate or a margin above the
     revenue is a confident wrong answer, which is worse than a refused one.
     A negative margin is deliberately allowed — a loss-making case is a
     real scenario. */
  const BOUNDS = { "rs-capital": [0, 1e6], "rs-r1": [0, 1e6], "rs-r2": [0, 1e6], "rs-r3": [0, 1e6], "rs-r4": [0, 1e6], "rs-r5": [0, 1e6], "rs-margin": [-100, 95], "rs-rate": [0, 40], "rs-term": [1, 50], "rs-cov": [0.5, 5], "rs-debt": [0, 1e6], "rs-hurdle": [0, 50], "rs-yield": [0, 100] };
  const num = id => clampNum(parseFloat($(id).value), BOUNDS[id][0], BOUNDS[id][1]);
  const m = x => `USD ${x.toLocaleString("en-GB", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}m`;

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
    const maxDebt = f > 0 && cov > 0 ? last / cov / f : 0;
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
    return { cap, rev, mg, rate, term, cov, debt, hur, yld, phase, ebitda, f, last, maxDebt, ds, dscr, byYear, marginForYield, tvs, cum };
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
    ["rs-kpis", "rs-findings", "rs-years", "rs-grid", "rs-tv"].forEach(id => { $(id).innerHTML = ""; });
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
    items.push(["Note", `Cumulative EBITDA covers ${(M.cum / M.cap * 100).toFixed(0)}% of the capital`, `${m(M.cum)} over five years against ${m(M.cap)} deployed. ${hurTv.none ? "The cash flow alone earns the hurdle." : `For a ${(M.hur * 100).toFixed(1)}% return the business must be worth ${m(hurTv.tv)} (${Math.round(hurTv.pct * 100)}% of capital) at the end of year 5.`}`]);
    $("rs-findings").innerHTML = items.map(([t, h, d]) => `<div style="padding:.55rem 0;border-bottom:1px solid rgba(255,255,255,.12);font-size:var(--fs-sm)"><b style="color:var(--jk-amber);font-size:var(--fs-xs);text-transform:uppercase;letter-spacing:.08em">${t}</b><div><b>${escapeHtml(h)}</b></div><div>${escapeHtml(d)}</div></div>`).join("");
    M._items = items;
  }

  function summarise(M) {
    const f = M._items.map(([t, h, d]) => ({ sev: t === "Stop" ? "stop" : t === "Warning" ? "warn" : "note", h, d }));
    if (!f.some(x => x.sev === "stop" || x.sev === "warn")) f.unshift({ sev: "ok", h: "The planned debt is within what the cash flow carries", d: `${m(M.debt)} drawn against a capacity of ${m(M.maxDebt)} at ${M.cov.toFixed(2)}×, with cover above the floor in every year of the facility.` });
    mountPrintSummary({
      title: "Returns and reverse-solve",
      verdict: `On ${m(M.rev[4])} of year-5 revenue at a ${(M.mg * 100).toFixed(1)}% margin, cash flow supports about ${m(M.maxDebt)} of debt, ${M.cap > 0 ? Math.round(M.maxDebt / M.cap * 100) : 0}% of the ${m(M.cap)} of capital.`,
      findings: f,
      basis: `Revenue and capital are as entered. Debt is a level payment at ${M.rate}% over ${M.term} years with a ${M.cov.toFixed(2)}× covenant floor, sized to year-5 EBITDA. Required exit value assumes capital ${M.phase === "start" ? "all deployed at the start" : "spread evenly over years 1 to 3"} and EBITDA received at each year-end, discounted at the return shown. A first-pass test, not a forecast or valuation.`
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
