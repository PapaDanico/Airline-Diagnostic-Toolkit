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

  /* The active tier's lines ARE the model. Every read of s.capital.lines
     went through here after tiers landed, because line COUNT now varies
     between tiers — a medevac operation carries a medical interior and a
     rotary one carries life-limited parts, neither of which a scheduled
     carrier has. Indexing state.capex by position is only safe if the
     tier is pinned alongside it. */
  function tierOf(s) {
    const ts = s.capital.tiers;
    return ts.find(t => t.id === state.tier) || ts[0];
  }

  function selectTier(id) {
    state.tier = id;
    const s = JKV.sector(state.sector);
    seedCapex(s, tierOf(s));
    renderTierBar(s);
    renderCapex(s);
    $("sector-note").innerHTML = `<b>${s.name}.</b> ${tierOf(s).note} ${s.leadNote}`;
    store.save(state);
    recompute();
  }

  function seedCapex(s, t) {
    state.capex = {}; state.capexSector = state.sector; state.capexTier = t.id;
    t.lines.forEach((l, i) => { state.capex[i] = Math.round((l.lo + l.hi) / 2); });
  }

  function renderTierBar(s) {
    const host = $("tier-seg");
    const ts = s.capital.tiers;
    /* A single-tier sector shows no chooser at all — an empty control bar
       reads as a broken feature rather than an absent choice. */
    if (ts.length < 2) { host.innerHTML = ""; host.hidden = true; return; }
    host.hidden = false;
    const active = tierOf(s).id;
    host.innerHTML = `<p class="eyebrow" style="margin:0 0 .5rem">${s.capital.scale}</p>
      <div class="segmented" role="group" aria-label="${s.capital.scale}">${ts.map(t => `
        <button type="button" class="seg${t.id === active ? " is-on" : ""}" data-tier="${t.id}"
                aria-pressed="${t.id === active}">${t.label}<small style="display:block;font-weight:400;opacity:.75">${t.sub}</small></button>`).join("")}</div>`;
    host.querySelectorAll("[data-tier]").forEach(b =>
      b.addEventListener("click", () => selectTier(b.dataset.tier)));
  }

  function selectSector(id, resetLines) {
    const s = JKV.sector(id);
    if (!s) return;
    state.sector = id;
    /* Normalise the tier before anything reads it. Tier ids are unique
       per sector, so a tier carried over from the previous sector is a
       dangling reference — tierOf() falls back safely, but leaving the
       stale id in state means the chooser highlights nothing. */
    if (!s.capital.tiers.some(t => t.id === state.tier)) state.tier = s.capital.tiers[0].id;
    if (resetLines || !state.capex || state.capexSector !== id || state.capexTier !== state.tier) {
      seedCapex(s, tierOf(s));
    }
    seg.querySelectorAll(".seg").forEach(el => el.setAttribute("aria-pressed", String(el.dataset.sector === id)));
    /* The note lives on the tier now, not the sector — each tier states
       its own scale assumption, which is the point of having tiers. */
    $("sector-note").innerHTML = `<b>${s.name}.</b> ${tierOf(s).note} ${s.leadNote}`;
    renderTierBar(s);
    renderCapex(s);
    recompute();
  }

  /* ---------- CAPEX lines ---------- */
  function renderCapex(s) {
    const host = $("capex-lines");
    const t = tierOf(s);
    host.innerHTML = t.lines.map((l, i) => `
      <div class="field" style="margin-bottom:16px">
        <label for="cx-${i}" style="display:flex;justify-content:space-between;gap:1rem;align-items:baseline">
          <span>${l.k}${l.cat === "wc" ? ' <span class="tag" style="vertical-align:middle">working capital</span>' : ""}</span>
        </label>
        <div class="cx-row">
          <input type="range" id="cx-${i}" min="${l.lo}" max="${l.hi}" step="${Math.max(1000, Math.round((l.hi - l.lo) / 100))}"
                 value="${Math.min(state.capex[i], l.hi)}" aria-describedby="cxh-${i}">
          <input type="number" id="cxn-${i}" class="cx-num" min="0" step="1000" value="${state.capex[i]}"
                 aria-label="${l.k} — exact amount in USD">
        </div>
        <p class="hint" id="cxh-${i}">
          <b data-band="${i}">Planning band ${fmtMoney(l.lo)} – ${fmtMoney(l.hi)}</b>
          ${l.drv ? ` · ${l.drv}` : ""}
        </p>
      </div>`).join("");

    t.lines.forEach((l, i) => {
      const sl = $("cx-" + i), nu = $("cxn-" + i);
      /* Slider and number field are two views of one value. The slider
         is bounded by the planning band because that is what a band is
         for; the number field is not, because an operator with a real
         quotation should never be told their own figure is impossible.
         A linear slider stretched to hold every case would make the
         common case unsettable — 1M steps cannot express 1.65M. */
      const set = (v, fromSlider) => {
        v = Math.max(0, Math.min(1e12, v || 0));
        state.capex[i] = v;
        if (!fromSlider) sl.value = Math.max(l.lo, Math.min(l.hi, v));
        if (fromSlider) nu.value = v;
        const band = document.querySelector(`[data-band="${i}"]`);
        if (band) {
          const out = v > l.hi || v < l.lo;
          band.textContent = out
            ? `Outside the planning band of ${fmtMoney(l.lo)} – ${fmtMoney(l.hi)}`
            : `Planning band ${fmtMoney(l.lo)} – ${fmtMoney(l.hi)}`;
          band.style.color = out ? "var(--jk-amber-text)" : "";
        }
        recompute();
      };
      sl.addEventListener("input", () => set(parseFloat(sl.value), true));
      nu.addEventListener("input", () => set(parseFloat(nu.value), false));
    });
  }

  $("reset-capex").addEventListener("click", () => selectSector(state.sector, true));

  /* ---------- funding + persistence ---------- */
  const FIELDS = ["f-equity","f-invest","f-sub","f-grant","f-debt","f-ltv","d-rate","d-term","d-rev","d-margin","d-cov"];
  FIELDS.forEach(id => $(id).addEventListener("input", () => { state[id] = $(id).value; recompute(); }));

  /* Debt service comes from common.js — the Venture Control Room re-derives
     the same DSCR from this saved model, and two implementations would drift. */

  /* ---------- capital analysis ----------
     The difference between a calculator and a diagnostic. A calculator
     adds up what was typed. This reads the same figures back and says
     what they imply — which line is outside its band, whether the set
     describes one coherent venture, and whether the tier is even the
     right one. Every finding names the number that triggered it, because
     an unexplained warning is noise the user learns to scroll past. */
  function renderCapexAnalysis(s, tier, capex, wc, total) {
    const host = $("capex-analysis");
    if (!host) return;
    if (!total) { host.innerHTML = ""; return; }

    const findings = [];
    const bandMid = tier.lines.reduce((a, l) => a + (l.lo + l.hi) / 2, 0);
    const bandMax = tier.lines.reduce((a, l) => a + l.hi, 0);
    const bandMin = tier.lines.reduce((a, l) => a + l.lo, 0);

    /* 1 — tier fit. Sitting far outside the tier's own envelope usually
       means the wrong tier is selected, not that the figures are wrong. */
    const tiers = s.capital.tiers;
    const idx = tiers.indexOf(tier);
    if (total > bandMax * 1.15 && idx < tiers.length - 1) {
      findings.push({ t: "warn", h: "This is a larger venture than the tier assumes",
        d: `Your figures total ${fmtMoney(total)} against a ${tier.label} ceiling of ${fmtMoney(bandMax)}. ` +
           `${tiers[idx + 1].label} (${tiers[idx + 1].sub}) is built for this size and carries different line items, not just larger numbers.` });
    } else if (total < bandMin * 0.85 && idx > 0) {
      findings.push({ t: "warn", h: "This is smaller than the tier assumes",
        d: `Your figures total ${fmtMoney(total)} against a ${tier.label} floor of ${fmtMoney(bandMin)}. ` +
           `${tiers[idx - 1].label} (${tiers[idx - 1].sub}) may describe the venture better.` });
    }

    /* 2 — lines pushed well outside their own band. Named individually,
       because "something is off" is not a finding. */
    const outliers = tier.lines
      .map((l, i) => ({ l, v: state.capex[i] || 0 }))
      .filter(x => x.v > x.l.hi * 1.5 || (x.v > 0 && x.v < x.l.lo * 0.5));
    if (outliers.length) {
      findings.push({ t: "info", h: `${outliers.length} line${outliers.length > 1 ? "s sit" : " sits"} well outside the planning band`,
        d: outliers.map(x => `${x.l.k} at ${fmtMoney(x.v)} against ${fmtMoney(x.l.lo)}–${fmtMoney(x.l.hi)}`).join("; ") +
           ". That is fine where it comes from a quotation, and worth checking where it does not." });
    }

    /* 3 — working capital share. The line that actually kills ventures,
       and the one founders trim first when the total looks too big. */
    const wcShare = wc / total;
    if (wcShare < 0.15) {
      findings.push({ t: "warn", h: "Working capital looks thin",
        d: `Working capital is ${(wcShare * 100).toFixed(0)}% of total capital. Below roughly 15% a venture is funding assets and hoping revenue arrives on schedule. ` +
           `Lenders size term debt against fixed assets, not against this — so a shortfall here lands on equity.` });
    } else if (wcShare > 0.55) {
      findings.push({ t: "info", h: "Working capital dominates the requirement",
        d: `Working capital is ${(wcShare * 100).toFixed(0)}% of total capital, so most of what you are raising is not financeable with term debt. ` +
           `Check the funding mix below — this shape needs equity or a revolving facility.` });
    }

    /* 4 — certification as a share. High share is not an error; it is the
       structural fact that makes small operations expensive to certify,
       and it is worth naming rather than leaving the user to notice. */
    const cert = tier.lines
      .map((l, i) => ({ l, v: state.capex[i] || 0 }))
      .filter(x => /certification/i.test(x.l.k))
      .reduce((a, x) => a + x.v, 0);
    if (cert && cert / total > 0.06) {
      findings.push({ t: "info", h: "Certification is a large share of a small entry",
        d: `Regulatory certification is ${((cert / total) * 100).toFixed(1)}% of total capital. ` +
           `The programme costs roughly the same whatever the fleet size, so this share falls as the venture grows — it is the arithmetic that makes small operations expensive per aircraft, not an error in your figures.` });
    }

    const ratios = [
      { k: "Fixed capex", v: fmtMoney(capex) },
      { k: "Working capital", v: fmtMoney(wc) },
      { k: "WC share", v: `${(wcShare * 100).toFixed(0)}%` },
      { k: "Against tier mid-point", v: `${total >= bandMid ? "+" : ""}${(((total / bandMid) - 1) * 100).toFixed(0)}%` }
    ];

    host.innerHTML = `
      <div class="cx-ratios">${ratios.map(r =>
        `<div><b>${r.v}</b><span>${r.k}</span></div>`).join("")}</div>
      ${findings.map(f => `<div class="note ${f.t === "warn" ? "warn" : ""}" style="margin-top:.8rem">
        <b>${f.h}</b><p style="margin:.3rem 0 0">${f.d}</p></div>`).join("")}`;
  }

  /* ---------- main recompute ---------- */
  function recompute() {
    const s = JKV.sector(state.sector);
    if (!s) return;

    // capex split
    const tier = tierOf(s);
    let capex = 0, wc = 0;
    tier.lines.forEach((l, i) => {
      const v = state.capex[i] || 0;
      if (l.cat === "wc") wc += v; else capex += v;
    });
    const total = capex + wc;
    $("capex-total").textContent = fmtMoney(total);
    renderCapexAnalysis(s, tier, capex, wc, total);

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
