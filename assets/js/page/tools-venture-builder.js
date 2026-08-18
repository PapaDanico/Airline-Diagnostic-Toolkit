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
    renderRevenueBuilder(s);
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
    /* Each chip carries its own total range.

       A user on the smallest tier sees a slider capped at 2.40M and
       reasonably concludes the tool cannot model a large venture — the
       ladder out is a click away and invisible. Printing the range on
       the chip makes the whole scale legible without selecting
       anything: the group tier says USD 26.0M – USD 100.0M on its face.

       Range is summed from the tier's own bands, never typed, so it
       cannot drift from the numbers it describes. */
    const span = t => {
      const lo = t.lines.reduce((a, l) => a + l.lo, 0);
      const hi = t.lines.reduce((a, l) => a + l.hi, 0);
      return `${fmtMoney(lo)} – ${fmtMoney(hi)}`;
    };
    host.innerHTML = `<p class="eyebrow" style="margin:0 0 .5rem">${s.capital.scale}</p>
      <div class="segmented" role="group" aria-label="${s.capital.scale}">${ts.map(t => `
        <button type="button" class="seg tier-seg-btn${t.id === active ? " is-on" : ""}" data-tier="${t.id}"
                aria-pressed="${t.id === active}">${t.label}<small>${t.sub}</small><em>${span(t)}</em></button>`).join("")}</div>`;
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
    renderRevenueBuilder(s);
    recompute();
  }

  /* ---------- CAPEX lines ---------- */
  function renderCapex(s) {
    const host = $("capex-lines");
    const t = tierOf(s);
    if (!state.phase) state.phase = {};
    host.innerHTML = t.lines.map((l, i) => {
      const dep = (state.phase[i] && state.phase[i].dep) || 0;
      const bal = (state.phase[i] && state.phase[i].bal) || 0;
      return `
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
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:4px">
          <div class="field" style="margin:0;flex:1;min-width:140px">
            <label for="dep-${i}" style="font-size:var(--fs-xs);color:var(--jk-muted)">Deposit required (USD)</label>
            <input type="number" id="dep-${i}" min="0" step="1000" value="${dep}"
                   aria-label="Deposit required for ${l.k}" style="font-size:var(--fs-sm)">
          </div>
          <div class="field" style="margin:0;flex:1;min-width:140px">
            <label for="bal-${i}" style="font-size:var(--fs-xs);color:var(--jk-muted)">Balance on completion (USD)</label>
            <input type="number" id="bal-${i}" min="0" step="1000" value="${bal}"
                   aria-label="Balance on completion for ${l.k}" style="font-size:var(--fs-sm)">
          </div>
        </div>
      </div>`;
    }).join("");

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

      /* Phasing inputs — deposit and balance on completion. Both
         are stored per CAPEX line so the phasing health indicator
         can compare scheduled against total for each line. */
      const depIn = $("dep-" + i), balIn = $("bal-" + i);
      const setPhase = () => {
        if (!state.phase) state.phase = {};
        state.phase[i] = {
          dep: Math.max(0, parseFloat(depIn.value) || 0),
          bal: Math.max(0, parseFloat(balIn.value) || 0)
        };
        recompute();
      };
      if (depIn) depIn.addEventListener("input", setPhase);
      if (balIn) balIn.addEventListener("input", setPhase);
    });
  }

  $("reset-capex").addEventListener("click", () => selectSector(state.sector, true));

  /* ---------- funding + persistence ---------- */
  const FIELDS = ["f-equity","f-invest","f-sub","f-grant","f-debt","f-ltv","d-rate","d-term","d-rev","d-margin","d-cov"];
  FIELDS.forEach(id => $(id).addEventListener("input", () => { state[id] = $(id).value; recompute(); }));

  /* Debt service comes from common.js — the Venture Control Room re-derives
     the same DSCR from this saved model, and two implementations would drift. */

  /* ---------- revenue derivation ----------
     Steady-state revenue was a single typed number, and DSCR, covenant
     headroom, break-even and payback all rested on it. That is the
     weakest link in the model: every downstream figure was precise
     about an input nobody had tested.

     Derived instead from the drivers the operation actually earns on —
     and those differ by operation type, which is exactly why the tiers
     were split that way. A scheduled carrier earns on seats and load
     factor. A charter operator earns on block hours, where utilisation
     below roughly 400 a year is the failure mode. Medevac earns on
     missions plus retainers, and the retainer half is what makes 24/7
     standby survivable — a model resting on mission volume alone has
     not read its own contracts.

     Typing a figure directly still works. The derivation writes into
     the same field, so an operator with a real forecast is never forced
     through a model they do not need. */
  function revenueOf(tier, vals) {
    const d = id => Number(vals[id] ?? 0);
    switch (tier.id) {
      case "scheduled":
      case "group":
        return d("ac") * d("sec") * d("days") * d("seats") * (d("lf") / 100) * d("fare");
      case "bizav":
        return d("ac") * d("hrs") * d("rate");
      case "medevac-fw":
      case "medevac-rw":
        return d("miss") * d("fee") + d("ret");
      default:
        return null;
    }
  }

  function renderRevenueBuilder(s) {
    const host = $("rev-build");
    if (!host) return;
    const tier = tierOf(s);
    const cfg = tier.revenue;
    /* No driver set for this tier means the plain input stands. Better
       an honest gap than a revenue model invented for a sector nobody
       has thought about properly. */
    if (!cfg) { host.innerHTML = ""; host.hidden = true; return; }
    host.hidden = false;

    state.rev = state.rev || {};
    if (state.revTier !== tier.id) {
      state.revTier = tier.id;
      state.rev = {};
      cfg.drivers.forEach(dr => { state.rev[dr.id] = dr.dflt; });
    }

    host.innerHTML = `
      <details class="rev-details"${state.revOpen ? " open" : ""}>
        <summary><b>Derive it instead</b> — ${escapeHtml(cfg.basis)}</summary>
        <p class="hint" style="margin:.5rem 0 .9rem">${escapeHtml(cfg.note)}</p>
        ${cfg.drivers.map(dr => `
          <div class="field" style="margin-bottom:12px">
            <label for="rv-${dr.id}" style="display:flex;justify-content:space-between;gap:1rem">
              <span>${escapeHtml(dr.k)}${dr.unit ? ` <span class="muted">(${escapeHtml(dr.unit)})</span>` : ""}</span>
            </label>
            <input type="number" id="rv-${dr.id}" min="${dr.lo}" max="${dr.hi}" value="${state.rev[dr.id]}"
                   step="${dr.hi > 10000 ? 1000 : dr.hi > 100 ? 1 : 0.5}">
            <p class="hint">${escapeHtml(dr.drv)}</p>
          </div>`).join("")}
        <div class="rev-out">
          <b id="rev-total">—</b>
          <span>derived annual revenue — writes into the field above</span>
        </div>
      </details>`;

    const sync = () => {
      cfg.drivers.forEach(dr => {
        const el = $("rv-" + dr.id);
        if (el) state.rev[dr.id] = clampNum(parseFloat(el.value), dr.lo, dr.hi);
      });
      const v = revenueOf(tier, state.rev);
      const out = $("rev-total");
      if (out) out.textContent = v ? fmtMoney(v) : "—";
      if (v) { $("d-rev").value = Math.round(v); state["d-rev"] = String(Math.round(v)); }
      recompute();
    };
    cfg.drivers.forEach(dr => $("rv-" + dr.id)?.addEventListener("input", sync));
    /* Opening the panel IS the consent to derive, so it applies on open
       rather than waiting for a driver to be nudged. The first version
       painted a derived figure and left the revenue field on zero,
       which reads as a control that does nothing. Closing it leaves the
       last derived value in place — the operator can then type over it. */
    host.querySelector(".rev-details")?.addEventListener("toggle", e => {
      state.revOpen = e.target.open;
      if (e.target.open) sync();
    });
    const v0 = revenueOf(tier, state.rev);
    const out0 = $("rev-total");
    if (out0) out0.textContent = v0 ? fmtMoney(v0) : "—";
    if (state.revOpen && v0) sync();
  }

  /* ---------- cash phasing health ----------
     Reads the deposit and balance fields from the CAPEX lines and
     computes what share of Year 1 capital has no payment schedule.
     An unscheduled third of the programme is not an error — it is the
     number an investment committee will ask about, named here before
     the appraisal does. */
  function renderPhasingHealth(tier, total) {
    const host = $("phasing-health");
    if (!host) return;
    if (!total) { host.innerHTML = ""; return; }

    if (!state.phase) state.phase = {};
    let scheduled = 0;
    tier.lines.forEach((l, i) => {
      const p = state.phase[i] || {};
      scheduled += (p.dep || 0) + (p.bal || 0);
    });
    const unscheduled = Math.max(0, total - scheduled);
    const pct = total > 0 ? (unscheduled / total) * 100 : 0;
    const pctSch = 100 - pct;

    let cls, msg;
    if (pct <= 15) {
      cls = "note ok";
      msg = `<b>Phasing is tight but manageable</b>${(pct).toFixed(0)}% (${fmtMoney(unscheduled)}) has no phasing date yet.`;
    } else if (pct <= 35) {
      cls = "note warn";
      msg = `<b>${fmtMoney(unscheduled)} unscheduled</b>Certification burns cash on a fixed clock; add a monthly draw schedule for the ${(pct).toFixed(0)}% without payment dates.`;
    } else {
      cls = "note warn";
      msg = `<b>${fmtMoney(unscheduled)} unscheduled — ${(pct).toFixed(0)}% of Year 1 has no date.</b>More than a third of the programme is unphased. This is where programmes stall — a fixed regulatory clock does not pause while the draw schedule is assembled.`;
    }

    /* Inline the red border for the worst case — .note.warn already
       shows amber; a deep-red border marks the genuine stop finding. */
    const warnStyle = pct > 35 ? ' style="border-left-color:var(--jk-red)"' : "";

    host.innerHTML = `
      <div class="${cls}"${warnStyle}>${msg}</div>
      <div style="margin:.6rem 0 0">
        <div style="height:8px;border-radius:4px;overflow:hidden;background:var(--jk-parchment-2);display:flex">
          <div style="width:${Math.min(pctSch,100).toFixed(1)}%;background:var(--jk-green);transition:width .3s"></div>
          <div style="flex:1;background:${pct > 35 ? "var(--jk-red)" : "var(--jk-amber-sig)"}"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:var(--fs-xs);color:var(--jk-muted);margin-top:3px">
          <span>Scheduled: ${fmtMoney(scheduled)} (${pctSch.toFixed(0)}%)</span>
          <span>Unscheduled: ${fmtMoney(unscheduled)} (${pct.toFixed(0)}%)</span>
        </div>
      </div>
      <p class="muted" style="font-size:var(--fs-xs);margin:.5rem 0 0">Enter deposit and balance amounts on each CAPEX line above to schedule them.</p>`;
  }

  /* ---------- capital service test ----------
     The first thing an investment committee asks: can this fleet
     generate enough revenue to service its capital? Answered here,
     before the appraisal does it. Editable fleet rows let the operator
     adjust type, count, rate and hours without leaving the model. */
  function renderCapitalServiceTest(total, ds) {
    const host = $("cst-banner");
    if (!host) return;
    if (!total) { host.innerHTML = ""; return; }

    if (!state.cst) state.cst = {};
    if (state.cst.margin === undefined) state.cst.margin = 35;
    if (state.cst.overhead === undefined) state.cst.overhead = 4000000;
    if (!Array.isArray(state.cst.fleet)) state.cst.fleet = [];

    const margin = (state.cst.margin || 35) / 100;
    const overhead = state.cst.overhead || 4000000;

    /* Required annual revenue: enough to recover capital over 10 years
       at the stated contribution margin, plus debt service, plus the
       steady-state overhead floor. Named individually so each term is
       inspectable rather than opaque. */
    const capitalRecovery = total / 10 / margin;
    const debtServiceCover = ds / margin;
    const requiredRevenue = capitalRecovery + debtServiceCover + overhead;

    /* Capacity: sum the fleet rows. Each row is an aircraft type with
       an editable count, rate and hours. The user sets what the fleet
       is actually earning, not a default the tool invents. */
    const fleetRows = state.cst.fleet;
    const capacityRevenue = fleetRows.reduce((sum, row) => {
      return sum + (row.count || 0) * (row.rate || 0) * (row.hrs || 0);
    }, 0);

    const ratio = requiredRevenue > 0 && capacityRevenue > 0 ? capacityRevenue / requiredRevenue : 0;
    const shortfall = ratio > 0 && ratio < 1 ? (1 / ratio).toFixed(1) : null;

    let ragCls, ragMsg;
    if (!capacityRevenue) {
      ragCls = "note";
      ragMsg = `<b>Add fleet rows below to test capital serviceability.</b>Enter the aircraft types and utilisation rates this venture will earn on.`;
    } else if (ratio >= 0.8) {
      ragCls = "note ok";
      ragMsg = `<b>✓ The fleet can service its capital at projected utilisation</b>Capacity of ${fmtMoney(capacityRevenue)}/year covers ${(ratio * 100).toFixed(0)}% of the ${fmtMoney(requiredRevenue)}/year requirement.`;
    } else if (ratio >= 0.5) {
      ragCls = "note warn";
      ragMsg = `<b>⚠ The fleet is marginal</b>Capacity of ${fmtMoney(capacityRevenue)}/year covers ${(ratio * 100).toFixed(0)}% of ${fmtMoney(requiredRevenue)}/year required. Contracted demand or a lease structure is recommended before committing capital.`;
    } else {
      ragCls = "note warn";
      ragMsg = `<b>✗ The fleet cannot service its capital — ${shortfall ? shortfall + "×" : ""} shortfall</b>Capacity of ${fmtMoney(capacityRevenue)}/year covers only ${(ratio * 100).toFixed(0)}% of the ${fmtMoney(requiredRevenue)}/year requirement. Reduce fleet size, lease rather than own, or secure anchor contracts before proceeding.`;
    }

    const redBorder = ratio > 0 && ratio < 0.5 ? ' style="border-left-color:var(--jk-red)"' : "";

    const AIRCRAFT_TYPES = [
      { id: "jet-lr",   label: "Jet (long-range)",   rate: 9000,  hrs: 500 },
      { id: "jet-sm",   label: "Jet (super-midsize)", rate: 5000,  hrs: 500 },
      { id: "turboprop",label: "Turboprop",           rate: 1200,  hrs: 600 },
      { id: "helo",     label: "Helicopter",          rate: 2000,  hrs: 400 }
    ];

    const fleetHtml = fleetRows.map((row, ri) => {
      const typOpt = AIRCRAFT_TYPES.map(t =>
        `<option value="${t.id}"${row.type === t.id ? " selected" : ""}>${escapeHtml(t.label)}</option>`).join("");
      return `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px">
        <select data-cst-row="${ri}" data-cst-field="type" style="font-size:var(--fs-xs);flex:1;min-width:140px">${typOpt}</select>
        <input type="number" data-cst-row="${ri}" data-cst-field="count" min="1" max="50" step="1" value="${row.count || 1}"
               style="width:56px;font-size:var(--fs-xs)" aria-label="Aircraft count">
        <span style="font-size:var(--fs-xs);color:var(--jk-muted)">×</span>
        <input type="number" data-cst-row="${ri}" data-cst-field="rate" min="0" step="100" value="${row.rate || 0}"
               style="width:90px;font-size:var(--fs-xs)" aria-label="Rate USD per hour">
        <span style="font-size:var(--fs-xs);color:var(--jk-muted)">/hr ×</span>
        <input type="number" data-cst-row="${ri}" data-cst-field="hrs" min="0" step="10" value="${row.hrs || 0}"
               style="width:80px;font-size:var(--fs-xs)" aria-label="Hours per year">
        <span style="font-size:var(--fs-xs);color:var(--jk-muted)">hrs/yr =</span>
        <b style="font-size:var(--fs-xs);font-variant-numeric:lining-nums tabular-nums;white-space:nowrap">${fmtMoney((row.count||0)*(row.rate||0)*(row.hrs||0))}</b>
        <button data-cst-del="${ri}" class="btn btn-ghost btn-sm" style="padding:.2rem .5rem;font-size:var(--fs-xs)">×</button>
      </div>`;
    }).join("");

    host.innerHTML = `
      <div class="${ragCls}"${redBorder}>${ragMsg}</div>
      <div style="margin-top:.9rem">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:.8rem;margin-bottom:.5rem">
          <b style="font-size:var(--fs-sm)">Fleet revenue capacity</b>
          <button id="cst-add-row" class="btn btn-ghost btn-sm" style="padding:.25rem .7rem;font-size:var(--fs-xs)">+ Add aircraft type</button>
        </div>
        <div id="cst-fleet-rows">${fleetHtml}</div>
        ${!fleetRows.length ? `<p class="muted" style="font-size:var(--fs-xs)">No fleet rows. Click "Add aircraft type" to begin.</p>` : ""}
        <div style="border-top:1px solid var(--jk-line);margin-top:.6rem;padding-top:.6rem;font-size:var(--fs-sm)">
          <span>Total fleet capacity: <b class="tnum">${fmtMoney(capacityRevenue)}/yr</b></span>
          <span style="margin-left:1.2rem">Required: <b class="tnum">${fmtMoney(requiredRevenue)}/yr</b></span>
        </div>
        <details style="margin-top:.7rem;font-size:var(--fs-xs)">
          <summary style="cursor:pointer;color:var(--jk-muted)">Adjust contribution margin and overhead</summary>
          <div style="margin-top:.6rem;display:flex;gap:1rem;flex-wrap:wrap">
            <div class="field" style="margin:0;flex:1;min-width:140px">
              <label style="font-size:var(--fs-xs)">Contribution margin (%)</label>
              <input type="number" id="cst-margin-in" min="5" max="90" step="1" value="${state.cst.margin || 35}" style="font-size:var(--fs-sm)">
              <p class="hint" style="font-size:var(--fs-2xs)">Default 35%. Revenue less direct operating costs as a share of revenue.</p>
            </div>
            <div class="field" style="margin:0;flex:1;min-width:140px">
              <label style="font-size:var(--fs-xs)">Steady-state overhead (USD/yr)</label>
              <input type="number" id="cst-overhead-in" min="0" step="100000" value="${state.cst.overhead || 4000000}" style="font-size:var(--fs-sm)">
              <p class="hint" style="font-size:var(--fs-2xs)">Default $4M. Year 3 staff, admin and marketing.</p>
            </div>
          </div>
          <p class="hint" style="font-size:var(--fs-2xs);margin-top:.5rem">
            Required = (capital ÷ 10yr ÷ margin) + (debt service ÷ margin) + overhead.
            Capital: ${fmtMoney(capitalRecovery)}/yr · Debt service cover: ${fmtMoney(debtServiceCover)}/yr · Overhead: ${fmtMoney(overhead)}/yr
          </p>
        </details>
      </div>`;

    /* Wire fleet row inputs — event delegation on the host */
    const wireRows = () => {
      host.querySelectorAll("[data-cst-row]").forEach(el => {
        el.addEventListener("input", () => {
          const ri2 = parseInt(el.dataset.cstRow);
          const field = el.dataset.cstField;
          if (!state.cst.fleet[ri2]) return;
          if (field === "type") state.cst.fleet[ri2].type = el.value;
          else state.cst.fleet[ri2][field] = parseFloat(el.value) || 0;
          store.save(state);
          recompute();
        });
        el.addEventListener("change", () => {
          if (el.dataset.cstField === "type") {
            const ri2 = parseInt(el.dataset.cstRow);
            if (!state.cst.fleet[ri2]) return;
            state.cst.fleet[ri2].type = el.value;
            store.save(state);
            recompute();
          }
        });
      });
      host.querySelectorAll("[data-cst-del]").forEach(btn => {
        btn.addEventListener("click", () => {
          const ri2 = parseInt(btn.dataset.cstDel);
          state.cst.fleet.splice(ri2, 1);
          store.save(state);
          recompute();
        });
      });
    };
    wireRows();

    const addBtn = $("cst-add-row");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        const def = AIRCRAFT_TYPES[0];
        state.cst.fleet.push({ type: def.id, count: 1, rate: def.rate, hrs: def.hrs });
        store.save(state);
        recompute();
      });
    }

    const marginIn = $("cst-margin-in");
    if (marginIn) {
      marginIn.addEventListener("input", () => {
        state.cst.margin = parseFloat(marginIn.value) || 35;
        store.save(state);
        recompute();
      });
    }
    const overheadIn = $("cst-overhead-in");
    if (overheadIn) {
      overheadIn.addEventListener("input", () => {
        state.cst.overhead = parseFloat(overheadIn.value) || 4000000;
        store.save(state);
        recompute();
      });
    }
  }

  /* ---------- own vs. lease ----------
     Compares owning the aircraft fleet against an operating-lease
     structure. Reads aircraft-category CAPEX lines from the existing
     CAPEX table — the same values the operator has already entered.
     The difference in capital released and annual cost difference are
     the two numbers a transaction committee will circle. */
  function renderOwnVsLease(total, capex, s, tier, rate, term) {
    const host = $("ovl-panel");
    if (!host) return;
    if (!total) { host.innerHTML = ""; return; }

    /* Sum CAPEX lines whose label contains "Aircraft" or "Helicopter"
       — these are the acquisition or deposit lines that proxy fleet value
       in the current CAPEX structure. */
    let ownCapital = 0;
    const isRotorSector = tier && (tier.id === "medevac-rw");
    tier.lines.forEach((l, i) => {
      if (l.cat !== "capex") return;
      if (/aircraft|helicopter/i.test(l.k)) {
        ownCapital += state.capex[i] || 0;
      }
    });

    /* Allow user override via a persistent state field. */
    if (!state.ovl) state.ovl = {};
    if (state.ovl.ownCapitalOverride !== undefined) {
      ownCapital = state.ovl.ownCapitalOverride;
    }

    const hurdleRate = rate || 9;
    const loanTerm = term || 7;
    const ownAnnual = annualDebtService(ownCapital, hurdleRate, loanTerm);

    /* Lease rates: 1.00%/month for fixed-wing jets (midpoint of 0.90–1.10%),
       1.10%/month for rotorcraft (midpoint of 1.00–1.20%). */
    const leaseMonthly = isRotorSector ? 0.0110 : 0.0100;
    const leaseDeposit = ownCapital * leaseMonthly * 3;  // 3 months' rent as security
    const leaseAnnual = ownCapital * leaseMonthly * 12;

    const totalCapOwn = total;
    const totalCapLease = total - ownCapital + leaseDeposit;
    const capDiff = ownCapital - leaseDeposit;
    const annualDiff = ownAnnual - leaseAnnual;

    const bigSaving = capDiff > 20000000;
    const annualSaving = annualDiff > 0;

    const diffStyle = (highlight, v, positive) => {
      if (!highlight) return `<td class="num tnum">${fmtMoney(v)}</td>`;
      const col = positive ? "var(--jk-green)" : "var(--jk-red-dk)";
      return `<td class="num tnum" style="color:${col};font-weight:700">${fmtMoney(v)}</td>`;
    };

    host.innerHTML = `
      <div class="card card-flat">
        <div class="table-scroll">
          <table class="dtable">
            <thead><tr>
              <th>Item</th>
              <th class="num">Own</th>
              <th class="num">Lease</th>
              <th class="num">Difference</th>
            </tr></thead>
            <tbody>
              <tr>
                <td>Aircraft capital / deposits</td>
                <td class="num tnum">${fmtMoney(ownCapital)}</td>
                <td class="num tnum">${fmtMoney(leaseDeposit)}</td>
                ${diffStyle(bigSaving, capDiff, true)}
              </tr>
              <tr>
                <td>Other programme capital</td>
                <td class="num tnum" colspan="3">${fmtMoney(total - ownCapital)} (unchanged)</td>
              </tr>
              <tr style="border-top:2px solid var(--jk-line-2)">
                <td><b>Total programme capital</b></td>
                <td class="num tnum"><b>${fmtMoney(totalCapOwn)}</b></td>
                <td class="num tnum"><b>${fmtMoney(totalCapLease)}</b></td>
                ${diffStyle(bigSaving, totalCapOwn - totalCapLease, true)}
              </tr>
              <tr>
                <td>Annual debt service / lease rental</td>
                <td class="num tnum">${fmtMoney(ownAnnual)}</td>
                <td class="num tnum">${fmtMoney(leaseAnnual)}</td>
                ${diffStyle(annualSaving, annualDiff, annualSaving)}
              </tr>
            </tbody>
          </table>
        </div>
        ${bigSaving ? `<div class="note ok" style="margin-top:.8rem"><b>Lease releases ${fmtMoney(capDiff)}</b>Moving from own to lease reduces the capital commitment by more than $20M. That is capital available for working capital, growth or covenant headroom.</div>` : ""}
        ${annualSaving ? `<div class="note ok" style="margin-top:.6rem"><b>Leasing costs ${fmtMoney(annualDiff)}/year less in annual charges</b>${fmtMoney(annualDiff)} of annual cash saved against ownership debt service.</div>` : ""}
        <div style="margin-top:.9rem;font-size:var(--fs-xs)">
          <details>
            <summary style="cursor:pointer;color:var(--jk-muted)">Override aircraft fleet value</summary>
            <div class="field" style="margin:.6rem 0 0;max-width:300px">
              <label style="font-size:var(--fs-xs)">Aircraft fleet value to compare (USD)</label>
              <input type="number" id="ovl-override" min="0" step="100000" value="${ownCapital}"
                     placeholder="Reads from CAPEX table if blank" style="font-size:var(--fs-sm)">
              <p class="hint" style="font-size:var(--fs-2xs)">Default is the sum of aircraft CAPEX lines above. Enter a value to override (e.g. full purchase price).</p>
            </div>
          </details>
          <p class="muted" style="margin-top:.5rem">Lease rate ${(leaseMonthly * 100).toFixed(2)}%/month · Security deposit 3 months · Debt service on ${hurdleRate}% over ${loanTerm} years. For ${isRotorSector ? "rotorcraft" : "fixed-wing"}.</p>
        </div>
      </div>`;

    const ovlOvr = $("ovl-override");
    if (ovlOvr) {
      ovlOvr.addEventListener("input", () => {
        const v = parseFloat(ovlOvr.value);
        state.ovl.ownCapitalOverride = isFinite(v) && v >= 0 ? v : undefined;
        store.save(state);
        recompute();
      });
    }
  }

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

    /* Answer-first summary for the printed pack. Ordered by what would
       stop the venture, not by the order the panels happen to appear in:
       an unfunded gap outranks a covenant breach, which outranks a
       structural observation, because that is the order in which they
       kill the deal. */
    const sev = gap > 0 ? "stop" : (!noTerm && baseDscr !== null && baseDscr < cov) ? "warn" : "ok";
    const headline = gap > 0
      ? `${fmtMoney(total)} venture with an unfunded gap of ${fmtMoney(gap)}`
      : (!noTerm && baseDscr !== null && baseDscr < cov)
        ? `${fmtMoney(total)} venture, fully funded, but the covenant does not hold`
        : `${fmtMoney(total)} venture, funded and covenant-compliant on the base case`;

    const sf = [];
    if (gap > 0) sf.push({ sev: "stop", h: `Unfunded gap of ${fmtMoney(gap)}`,
      d: `The stack covers ${fmtMoney(funded)} of a ${fmtMoney(total)} requirement. Certification burns cash on a fixed clock, so this closes before a Schedule of Events is committed, not during it.` });
    if (debt > maxDebt && capex > 0) sf.push({ sev: "warn", h: "Senior debt exceeds the advance rate",
      d: `At ${ltv}% of ${fmtMoney(capex)} fixed CAPEX a lender sizes at about ${fmtMoney(maxDebt)}; the model assumes ${fmtMoney(debt)}. Expect the facility to be cut or the equity cheque to grow.` });
    if (!noTerm && baseDscr !== null && baseDscr < cov) sf.push({ sev: baseDscr < 1 ? "stop" : "warn",
      h: `DSCR of ${fmtRatio(baseDscr)} against a ${cov.toFixed(2)}× covenant`,
      d: baseDscr < 1 ? "Base-case earnings do not cover debt service at all." : "The base case services the debt but breaches the covenant, which is a default event before it is a cash problem." });
    if (wc / (total || 1) < 0.15) sf.push({ sev: "warn", h: "Working capital is thin",
      d: `${fmtMoney(wc)} of ${fmtMoney(total)} — under 15%. Lenders size term debt against fixed assets, so a shortfall here lands entirely on equity.` });
    if (beCov && rev && rev < beCov) sf.push({ sev: "warn", h: `Revenue is below the covenant break-even`,
      d: `${fmtMoney(rev)} assumed against ${fmtMoney(beCov)} required at a ${margin}% margin.` });
    if (!sf.length) sf.push({ sev: "ok", h: "No blocking finding on the capital model",
      d: `Funded to ${fmtMoney(funded)}, ${noTerm ? "with no debt to service" : `carrying ${fmtRatio(baseDscr)} against a ${cov.toFixed(2)}× covenant`}. The constraint is delivery, not capital.` });

    mountPrintSummary({
      title: `${s.name} — ${tier.label}`,
      verdict: headline,
      findings: sf,
      basis: `${tier.note} Lead time to certificate ${s.leadMonths[0]}–${s.leadMonths[1]} months. Figures are the operator's own inputs against indicative planning bands, not quotations.`
    });
    void sev;

    // Cash Phasing Health, Capital Service Test and Own vs. Lease
    renderPhasingHealth(tier, total);
    renderCapitalServiceTest(total, ds);
    renderOwnVsLease(total, capex, s, tier, rate, term);

    store.save(state);
  }

  $("print").addEventListener("click", () => window.print());

  /* ---------- restore ---------- */
  FIELDS.forEach(id => { if (state[id] !== undefined) $(id).value = state[id]; });
  const fromUrl = new URLSearchParams(location.search).get("sector");
  selectSector((fromUrl && JKV.sector(fromUrl)) ? fromUrl : (state.sector || "aoc"), false);
})();
