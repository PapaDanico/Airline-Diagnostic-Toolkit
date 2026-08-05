/* Extracted verbatim from tools/venture-builder.html so the site can carry a real
   script-src. Behaviour is unchanged: the tag sits where the inline
   block sat, with no defer or async, so execution order is identical.
   Edit here, not in the HTML. */

(function () {
  applyPartner(); mountChrome();
  mountPrintHead("Greenfield Venture Builder");

  const store = toolStore("venture");
  let state = store.load();
  const $ = id => document.getElementById(id);

  /* Sane bounds per field. The min/max attributes constrain the spinner,
     not typing or paste — and a negative interest rate or negative revenue
     produces a confident, wrong answer, which is worse than a rejected one.
     A negative EBITDA margin is deliberately allowed: loss-making is a real
     scenario the model should be able to express. */
  const BOUNDS = {
    "f-equity": [0, 1e12], "f-invest": [0, 1e12], "f-sub": [0, 1e12],
    "f-grant":  [0, 1e12], "f-debt":   [0, 1e12], "f-ltv":  [0, 100],
    "d-rate":   [0, 40],   "d-term":   [0, 50],   "d-rev":  [0, 1e12],
    "d-margin": [-100, 95], "d-cov":   [0, 5]
  };
  const num = id => {
    const b = BOUNDS[id] || [-Infinity, Infinity];
    return clampNum(parseFloat($(id).value), b[0], b[1]);
  };

  /* ---------- sector selection ---------- */
  const seg = $("sector-seg");
  JKV.sectors.forEach(s => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "seg"; b.dataset.sector = s.id;
    b.setAttribute("aria-pressed", "false");
    b.textContent = `${s.icon} ${s.short}`;
    b.addEventListener("click", () => selectSector(s.id, true));
    seg.appendChild(b);
  });

  function selectSector(id, resetLines) {
    const s = JKV.sector(id);
    if (!s) return;
    state.sector = id;
    if (resetLines || !state.capex || state.capexSector !== id) {
      state.capex = {}; state.capexSector = id;
      s.capital.lines.forEach((l, i) => { state.capex[i] = Math.round((l.lo + l.hi) / 2); });
    }
    seg.querySelectorAll(".seg").forEach(el => el.setAttribute("aria-pressed", String(el.dataset.sector === id)));
    $("sector-note").innerHTML = `<b>${s.name}.</b> ${s.capital.note} ${s.leadNote}`;
    renderCapex(s);
    recompute();
  }

  /* ---------- CAPEX lines ---------- */
  function renderCapex(s) {
    const host = $("capex-lines");
    host.innerHTML = s.capital.lines.map((l, i) => `
      <div class="field" style="margin-bottom:14px">
        <label for="cx-${i}" style="display:flex;justify-content:space-between;gap:1rem;align-items:baseline">
          <span>${l.k}${l.cat === "wc" ? ' <span class="tag" style="vertical-align:middle">working capital</span>' : ""}</span>
          <b class="tnum" data-out="${i}" style="font-family:var(--serif);font-size:1.05rem;white-space:nowrap">—</b>
        </label>
        <input type="range" id="cx-${i}" min="${l.lo}" max="${l.hi}" step="${Math.max(1000, Math.round((l.hi - l.lo) / 100))}"
               value="${state.capex[i]}" style="width:100%;accent-color:var(--accent);padding:0;border:0;background:none"
               aria-describedby="cxh-${i}">
        <p class="hint" id="cxh-${i}">Planning band ${fmtMoney(l.lo)} – ${fmtMoney(l.hi)}</p>
      </div>`).join("");

    s.capital.lines.forEach((l, i) => {
      const el = $("cx-" + i);
      el.addEventListener("input", () => { state.capex[i] = parseFloat(el.value); recompute(); });
    });
  }

  $("reset-capex").addEventListener("click", () => selectSector(state.sector, true));

  /* ---------- funding + persistence ---------- */
  const FIELDS = ["f-equity","f-invest","f-sub","f-grant","f-debt","f-ltv","d-rate","d-term","d-rev","d-margin","d-cov"];
  FIELDS.forEach(id => $(id).addEventListener("input", () => { state[id] = $(id).value; recompute(); }));

  /* Debt service comes from common.js — the Venture Control Room re-derives
     the same DSCR from this saved model, and two implementations would drift. */

  /* ---------- main recompute ---------- */
  function recompute() {
    const s = JKV.sector(state.sector);
    if (!s) return;

    // capex split
    let capex = 0, wc = 0;
    s.capital.lines.forEach((l, i) => {
      const v = state.capex[i] || 0;
      const out = document.querySelector(`[data-out="${i}"]`);
      if (out) out.textContent = fmtMoney(v);
      if (l.cat === "wc") wc += v; else capex += v;
    });
    const total = capex + wc;
    $("capex-total").textContent = fmtMoney(total);

    // funding
    const equity = num("f-equity"), invest = num("f-invest"), sub = num("f-sub"),
          grant = num("f-grant"), debt = num("f-debt"), ltv = num("f-ltv");
    const funded = equity + invest + sub + grant + debt;
    const gap = Math.max(0, total - funded);
    const surplus = Math.max(0, funded - total);

    const maxDebt = capex * (ltv / 100);
    const rows = [
      { l: "Senior debt",   v: debt,   c: "sb-debt"   },
      { l: "Sponsor equity",v: equity, c: "sb-equity" },
      { l: "Third-party equity", v: invest, c: "sb-equity" },
      { l: "Subordinated",  v: sub,    c: "sb-sub"    },
      { l: "Grant",         v: grant,  c: "sb-grant"  }
    ].filter(r => r.v > 0);
    if (gap > 0) rows.push({ l: "UNFUNDED GAP", v: gap, c: "sb-gap" });
    const denom = Math.max(total, funded, 1);
    $("stack").innerHTML = rows.length
      ? rows.map(r => `<div class="stack-row">
            <span class="sl">${r.l}</span>
            <span class="stack-bar ${r.c}"><i style="width:${(r.v / denom * 100).toFixed(1)}%"></i></span>
            <span class="sv">${fmtMoney(r.v)}</span>
          </div>`).join("")
      : `<p class="muted" style="font-size:.86rem;margin:.6rem 0 0">Enter your funding sources above to see the stack.</p>`;

    // gap / advance-rate notes
    const notes = [];
    if (gap > 0) notes.push(`<div class="note warn"><b>Funding gap of ${fmtMoney(gap)}</b>The stack does not cover the capital requirement. Close it before committing to a Schedule of Events — certification burns cash on a fixed clock.</div>`);
    else if (surplus > 0) notes.push(`<div class="note ok"><b>Headroom of ${fmtMoney(surplus)}</b>Funded above requirement. Contingency of 10–15% on fixed CAPEX is normal for a first-time greenfield build.</div>`);
    if (debt > maxDebt && capex > 0) notes.push(`<div class="note warn"><b>Debt above the advance rate</b>At ${ltv}% of fixed CAPEX a lender would size at about ${fmtMoney(maxDebt)}. You are assuming ${fmtMoney(debt)} — either raise more equity or expect the facility to be cut.</div>`);
    $("gap-note").innerHTML = notes.join("");

    // DSCR
    const rate = num("d-rate"), term = num("d-term"), rev = num("d-rev"), margin = num("d-margin"), cov = num("d-cov");
    const ds = annualDebtService(debt, rate, term);
    const scen = [
      { n: "Stress",       f: 0.60 },
      { n: "Conservative", f: 0.80 },
      { n: "Base",         f: 1.00 },
      { n: "Optimistic",   f: 1.25 }
    ];
    // Debt with no repayment term is an incomplete input, not an absence of
    // debt. Reporting it as "No debt" told the visitor the opposite of what
    // was wrong with their model.
    const noTerm = debt > 0 && term <= 0;
    const tb = $("sens").querySelector("tbody");
    let baseDscr = null;
    tb.innerHTML = scen.map(sc => {
      const r = rev * sc.f;
      const ebitda = r * (margin / 100);
      // With no revenue assumption there is nothing to divide, so report
      // "—" rather than a 0.00x that reads as a computed result sitting
      // next to a revenue column showing "—".
      const dscr = (ds > 0 && rev > 0) ? ebitda / ds : null;
      if (sc.f === 1) baseDscr = dscr;
      const ok = dscr === null ? "" : dscr >= cov ? "rag-green" : dscr >= 1 ? "rag-amber" : "rag-red";
      const label = noTerm ? "Set a repayment term"
        : ds <= 0 ? "No debt"
        : rev <= 0 ? "Add a revenue assumption"
        : dscr >= cov ? "Above floor" : dscr >= 1 ? "Below floor" : "Cannot service";
      return `<tr>
        <td><b>${sc.n}</b></td>
        <td class="num">${rev ? fmtMoney(r) : "—"}</td>
        <td class="num">${rev ? fmtMoney(ebitda) : "—"}</td>
        <td class="num">${ds ? fmtMoney(ds) : "—"}</td>
        <td class="num"><b>${fmtRatio(dscr)}</b></td>
        <td><span class="rag ${noTerm ? "rag-amber" : ok}">${(noTerm || ok) ? '<span class="dot"></span>' : ""}${label}</span></td>
      </tr>`;
    }).join("");

    // break-even
    const ebitdaBase = rev * (margin / 100);
    const beRev = margin > 0 ? ds / (margin / 100) : null;         // revenue needed to hit DSCR 1.00
    const beCov = margin > 0 ? (ds * cov) / (margin / 100) : null; // revenue needed to hit the covenant
    const payback = ebitdaBase > 0 ? total / ebitdaBase : null;
    $("be-kpis").innerHTML = `
      <div class="kpi ${beRev && rev >= beRev ? "is-green" : "is-red"}">
        <div class="kv">${beRev ? fmtMoney(beRev) : "—"}</div><div class="kl">Revenue to service debt</div></div>
      <div class="kpi ${beCov && rev >= beCov ? "is-green" : "is-amber"}">
        <div class="kv">${beCov ? fmtMoney(beCov) : "—"}</div><div class="kl">Revenue to meet covenant</div></div>
      <div class="kpi"><div class="kv">${payback ? payback.toFixed(1) + " yr" : "—"}</div><div class="kl">Capital payback on EBITDA</div></div>
      <div class="kpi"><div class="kv">${rev ? fmtMoney(ebitdaBase) : "—"}</div><div class="kl">EBITDA at base case</div></div>`;
    $("be-note").textContent = margin <= 0
      ? "Set a positive EBITDA margin to compute break-even."
      : `At a ${margin}% EBITDA margin you need ${fmtMoney(beCov)} of annual revenue to hold a ${cov.toFixed(2)}× covenant. Payback is measured on EBITDA before tax and reinvestment, so treat it as a floor, not a forecast.`;

    // rail
    $("r-capex").textContent = fmtMoney(total);
    $("r-gap").textContent = gap > 0 ? fmtMoney(gap) : "None";
    $("r-dscr").innerHTML = noTerm ? "—" : fmtRatio(baseDscr);
    $("r-lead").textContent = `${s.leadMonths[0]}–${s.leadMonths[1]}`;

    const gapKpi = $("r-gap").parentElement;
    gapKpi.className = "kpi " + (gap > 0 ? "is-red" : "is-green");
    const dscrKpi = $("r-dscr").parentElement;
    dscrKpi.className = "kpi " + (noTerm ? "is-amber" : baseDscr === null ? "" : baseDscr >= cov ? "is-green" : baseDscr >= 1 ? "is-amber" : "is-red");

    let v;
    if (noTerm) v = { c: "note warn", t: "Repayment term missing", d: `You have ${fmtMoney(debt)} of senior debt but no repayment term, so debt service cannot be computed. Set a term to test the covenant.` };
    else if (!rev) v = { c: "note", t: "Add a revenue assumption", d: "The capital side is sized. Enter steady-state revenue to test whether the venture can carry its own debt." };
    else if (gap > 0) v = { c: "note warn", t: "Not yet fundable", d: `A ${fmtMoney(gap)} gap has to close before this is financeable.` };
    else if (baseDscr !== null && baseDscr < 1) v = { c: "note warn", t: "Cannot service the debt", d: "Base-case EBITDA does not cover debt service. Reduce leverage, extend the term, or revisit the revenue case." };
    else if (baseDscr !== null && baseDscr < cov) v = { c: "note warn", t: "Below covenant", d: `Base case is ${fmtRatio(baseDscr)} against a ${cov.toFixed(2)}× floor. Expect the lender to cut the facility or demand more equity.` };
    else v = { c: "note ok", t: "Coherent first-pass model", d: "Capital covered and covenant held at base case. The next test is whether the revenue assumption survives scrutiny." };
    $("verdict").innerHTML = `<div class="${v.c}" style="margin:0"><b>${v.t}</b>${v.d}</div>`;

    const body =
      `Sector: ${s.name}\n` +
      `Total capital requirement: ${fmtMoney(total)} (fixed ${fmtMoney(capex)} + working capital ${fmtMoney(wc)})\n` +
      `Funding: equity ${fmtMoney(equity + invest)}, sub-debt ${fmtMoney(sub)}, grant ${fmtMoney(grant)}, senior debt ${fmtMoney(debt)}\n` +
      `Funding gap: ${gap > 0 ? fmtMoney(gap) : "none"}\n` +
      `Base-case DSCR: ${noTerm ? "n/a (no repayment term set)" : baseDscr === null ? "n/a" : baseDscr.toFixed(2) + "x"} against a ${cov.toFixed(2)}x covenant\n\n` +
      `I would like this model pressure-tested.`;
    const href = toolMailto("Venture", s.short + " venture model", body);
    $("talk").href = href; $("cta-mail").href = href;

    store.save(state);
  }

  $("print").addEventListener("click", () => window.print());

  /* ---------- restore ---------- */
  FIELDS.forEach(id => { if (state[id] !== undefined) $(id).value = state[id]; });
  const fromUrl = new URLSearchParams(location.search).get("sector");
  selectSector((fromUrl && JKV.sector(fromUrl)) ? fromUrl : (state.sector || "aoc"), false);
})();
