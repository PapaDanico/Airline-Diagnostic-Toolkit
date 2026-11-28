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
    "d-margin": [-100, 95], "d-cov":   [0, 5],
    "t-ramp":   [0, 100],  "t-growth": [-50, 100], "t-life": [1, 50],
    "t-tax":    [0, 60]
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

  /* Licence financial-fitness rules, one per jurisdiction, each from the
     regulator's own instrument as read in November 2026. months: fixed and
     operating costs to be covered without revenue; oblig: months over which
     actual and potential obligations must be met. A planning aid: confirm
     the current text with the regulator before an application. */
  const ASL_RULES = {
    KE: { name: "Kenya", months: 3, oblig: 24, extra: "",
          cite: "Civil Aviation (Licensing of Air Services) Regulations, 2025 (L.N. 22/2026), reg. 19" },
    TZ: { name: "Tanzania", months: 6, oblig: 12,
          extra: "Obligations must be met over a 12-month horizon here, not the 24 months the other States set. The test sits in the Part on internal air services; confirm with the TCAA how it is applied to an international licence.",
          cite: "Civil Aviation (Licensing of Air Services) Regulations, 2006 (G.N. 81/2006), reg. 8" },
    UG: { name: "Uganda", months: 6, oblig: 24,
          extra: "The UCAA guidelines also ask for evidence of ability to finance operations up to USD 0.5m for domestic, USD 1m for regional or USD 2m for international services.",
          cite: "UCAA Air Service Licence guidelines CAA/05/ASLA/59 (2014), under the Civil Aviation (Licensing of Air Services) Regulations, 2001" },
    RW: { name: "Rwanda", months: 3, oblig: 24,
          extra: "A carrier flying only aircraft under 10 t MTOW or with fewer than 20 seats is tested instead on net capital of at least RWF 50 million.",
          cite: "Rwanda Civil Aviation Regulations, Part 37, 37.085" },
    ET: { name: "Ethiopia", months: null, oblig: null,
          extra: "The Proclamation asks the Authority to consider the applicant's fitness and qualifications but sets no quantified financial test, so no figure is computed here. Ask the ECAA which financial evidence it expects.",
          cite: "Civil Aviation Proclamation No. 616/2008, Art. 62(1)" }
  };

  /* ---------- funding + persistence ---------- */
  const FIELDS = ["f-equity","f-invest","f-sub","f-grant","f-debt","f-ltv","d-rate","d-term","d-rev","d-margin","d-cov","asl-juris","t-ramp","t-growth","t-life","t-tax"];
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
  /* Aircraft categories offered as fleet rows. Module scope so the
     shell builder and the per-render update both see one list. The
     rates and hours are indicative planning defaults the operator is
     expected to overwrite with their own — every row is editable, and
     the figure that drives the test is whatever they enter. */
  const AIRCRAFT_TYPES = [
    { id: "jet-lr",    label: "Jet (long-range)",     rate: 9000, hrs: 500 },
    { id: "jet-sm",    label: "Jet (super-midsize)",  rate: 5000, hrs: 500 },
    { id: "turboprop", label: "Turboprop",            rate: 1200, hrs: 600 },
    { id: "helo",      label: "Helicopter",           rate: 2000, hrs: 400 }
  ];

  const rowTotal = r => (r.count || 0) * (r.rate || 0) * (r.hrs || 0);

  function fleetRowHtml(row, ri) {
    const typOpt = AIRCRAFT_TYPES.map(t =>
      `<option value="${t.id}"${row.type === t.id ? " selected" : ""}>${escapeHtml(t.label)}</option>`).join("");
    return `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px">
      <select data-cst-row="${ri}" data-cst-field="type" style="font-size:var(--fs-xs);flex:1;min-width:140px">${typOpt}</select>
      <input type="number" data-cst-row="${ri}" data-cst-field="count" min="1" max="50" step="1" value="${row.count || 1}"
             style="width:56px;font-size:var(--fs-xs)" aria-label="Aircraft count">
      <span class="muted" style="font-size:var(--fs-xs)">\u00D7</span>
      <input type="number" data-cst-row="${ri}" data-cst-field="rate" min="0" step="100" value="${row.rate || 0}"
             style="width:90px;font-size:var(--fs-xs)" aria-label="Rate USD per hour">
      <span class="muted" style="font-size:var(--fs-xs)">/hr \u00D7</span>
      <input type="number" data-cst-row="${ri}" data-cst-field="hrs" min="0" step="10" value="${row.hrs || 0}"
             style="width:80px;font-size:var(--fs-xs)" aria-label="Hours per year">
      <span class="muted" style="font-size:var(--fs-xs)">hrs/yr =</span>
      <b data-cst-rowtotal="${ri}" style="font-size:var(--fs-xs);font-variant-numeric:lining-nums tabular-nums;white-space:nowrap">${fmtMoney(rowTotal(row))}</b>
      <button data-cst-del="${ri}" class="btn btn-ghost-lt btn-sm" style="padding:.2rem .5rem;font-size:var(--fs-xs)"
              aria-label="Remove this aircraft row">\u00D7</button>
    </div>`;
  }

  /* The figures re-render on every keystroke; the controls do not.

     This block used to rebuild its whole innerHTML on each recompute(),
     which destroyed the input being typed into. Focus fell to <body>
     after one character, and because the element was replaced between
     keystrokes the characters typed into the old node went with it —
     "5500" into a rate field landed as something else entirely. The
     rate field could not be filled in at all.

     So the shell is built once, the fleet rows are rebuilt only when a
     row is added or removed, and every render after that writes only
     derived text: the verdict, the row totals and the two summary
     figures. Inputs are never replaced while someone is typing. */
  function buildCstShell(host) {
    host.innerHTML = `
      <p style="margin:0 0 .5rem;font-size:var(--fs-xs);font-weight:600">Capital service test</p>
      <div id="cst-msg"></div>
      <div style="margin-top:.9rem">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:.8rem;margin-bottom:.5rem">
          <b style="font-size:var(--fs-sm)">Fleet revenue capacity</b>
          <button id="cst-add-row" class="btn btn-ghost-lt btn-sm" style="padding:.25rem .7rem;font-size:var(--fs-xs)">+ Add aircraft type</button>
        </div>
        <div id="cst-fleet-rows"></div>
        <p class="muted" id="cst-empty" style="font-size:var(--fs-xs);display:none">No fleet rows. Click "Add aircraft type" to begin.</p>
        <div style="border-top:1px solid var(--jk-line);margin-top:.6rem;padding-top:.6rem;font-size:var(--fs-sm)">
          <span>Total fleet capacity: <b class="tnum" id="cst-cap">\u2014</b></span>
          <span style="margin-left:1.2rem">Required: <b class="tnum" id="cst-req">\u2014</b></span>
        </div>
        <details style="margin-top:.7rem;font-size:var(--fs-xs)">
          <summary class="muted" style="cursor:pointer">Adjust contribution margin and overhead</summary>
          <div style="margin-top:.6rem;display:flex;gap:1rem;flex-wrap:wrap">
            <div class="field" style="margin:0;flex:1;min-width:140px">
              <label for="cst-margin-in" style="font-size:var(--fs-xs)">Contribution margin (%)</label>
              <input type="number" id="cst-margin-in" min="5" max="90" step="1" style="font-size:var(--fs-sm)">
              <p class="hint muted" style="font-size:var(--fs-2xs)">Default 35%. Revenue less direct operating costs as a share of revenue.</p>
            </div>
            <div class="field" style="margin:0;flex:1;min-width:140px">
              <label for="cst-overhead-in" style="font-size:var(--fs-xs)">Steady-state overhead (USD/yr)</label>
              <input type="number" id="cst-overhead-in" min="0" step="100000" style="font-size:var(--fs-sm)">
              <p class="hint muted" style="font-size:var(--fs-2xs)">Default $4M. Year 3 staff, admin and marketing.</p>
            </div>
          </div>
          <p class="hint muted" id="cst-formula" style="font-size:var(--fs-2xs);margin-top:.5rem"></p>
          <p class="hint muted" style="font-size:var(--fs-2xs);margin-top:.4rem">
            This asks whether the planned fleet can generate the <i>revenue</i> the capital requires.
            The Revenue Model Builder asks whether the contribution a built model earns pays that capital
            back over ten years. They are different tests, they can disagree, and a venture usually needs
            to satisfy both.
          </p>
        </details>
      </div>`;

    $("cst-add-row").addEventListener("click", () => {
      const def = AIRCRAFT_TYPES[0];
      state.cst.fleet.push({ type: def.id, count: 1, rate: def.rate, hrs: def.hrs });
      store.save(state);
      recompute();
    });
    $("cst-margin-in").addEventListener("input", e => {
      state.cst.margin = parseFloat(e.target.value) || 35;
      store.save(state); recompute();
    });
    $("cst-overhead-in").addEventListener("input", e => {
      state.cst.overhead = parseFloat(e.target.value) || 4000000;
      store.save(state); recompute();
    });
  }

  /* Rebuilt only when the number of rows changes, so the listeners are
     attached to nodes that then stay put for the life of the row set. */
  function renderFleetRows(host) {
    const rows = state.cst.fleet;
    $("cst-fleet-rows").innerHTML = rows.map(fleetRowHtml).join("");
    $("cst-empty").style.display = rows.length ? "none" : "";

    host.querySelectorAll("[data-cst-row]").forEach(el => {
      const apply = () => {
        const ri = parseInt(el.dataset.cstRow, 10);
        const row = state.cst.fleet[ri];
        if (!row) return;
        if (el.dataset.cstField === "type") row.type = el.value;
        else row[el.dataset.cstField] = parseFloat(el.value) || 0;
        store.save(state);
        recompute();
      };
      el.addEventListener("input", apply);
      if (el.tagName === "SELECT") el.addEventListener("change", apply);
    });
    host.querySelectorAll("[data-cst-del]").forEach(btn => {
      btn.addEventListener("click", () => {
        state.cst.fleet.splice(parseInt(btn.dataset.cstDel, 10), 1);
        store.save(state);
        recompute();
      });
    });
  }

  function renderCapitalServiceTest(total, ds) {
    const host = $("cst-banner");
    if (!host) return;
    if (!total) { host.innerHTML = ""; host.dataset.built = ""; return; }

    if (!state.cst) state.cst = {};
    if (state.cst.margin === undefined) state.cst.margin = 35;
    if (state.cst.overhead === undefined) state.cst.overhead = 4000000;
    if (!Array.isArray(state.cst.fleet)) state.cst.fleet = [];

    if (host.dataset.built !== "1") { buildCstShell(host); host.dataset.built = "1"; host.dataset.rows = "-1"; }
    if (host.dataset.rows !== String(state.cst.fleet.length)) {
      renderFleetRows(host);
      host.dataset.rows = String(state.cst.fleet.length);
    }

    const margin = (state.cst.margin || 35) / 100;
    const overhead = state.cst.overhead || 4000000;

    /* Required annual revenue: enough to recover capital over ten years
       at the stated contribution margin, plus debt service, plus the
       steady-state overhead floor. Compared against a *revenue*
       capacity, so dividing by margin is correct here — unlike the
       Revenue Model Builder's test, whose numerator is contribution. */
    const capitalRecovery = total / 10 / margin;
    const debtServiceCover = ds / margin;
    const requiredRevenue = capitalRecovery + debtServiceCover + overhead;
    const capacityRevenue = state.cst.fleet.reduce((sum, r) => sum + rowTotal(r), 0);
    const ratio = requiredRevenue > 0 && capacityRevenue > 0 ? capacityRevenue / requiredRevenue : 0;

    /* Derived text only — never the inputs themselves. */
    state.cst.fleet.forEach((r, ri) => {
      const b = host.querySelector(`[data-cst-rowtotal="${ri}"]`);
      if (b) b.textContent = fmtMoney(rowTotal(r));
    });
    $("cst-cap").textContent = `${fmtMoney(capacityRevenue)}/yr`;
    $("cst-req").textContent = `${fmtMoney(requiredRevenue)}/yr`;
    $("cst-formula").textContent =
      `Required = (capital \u00F7 10yr \u00F7 margin) + (debt service \u00F7 margin) + overhead. ` +
      `Capital: ${fmtMoney(capitalRecovery)}/yr \u00B7 Debt service cover: ${fmtMoney(debtServiceCover)}/yr \u00B7 Overhead: ${fmtMoney(overhead)}/yr`;

    const mIn = $("cst-margin-in"), oIn = $("cst-overhead-in");
    if (document.activeElement !== mIn && mIn.value !== String(state.cst.margin)) mIn.value = state.cst.margin;
    if (document.activeElement !== oIn && oIn.value !== String(state.cst.overhead)) oIn.value = state.cst.overhead;

    let ragCls, ragMsg;
    if (!capacityRevenue) {
      ragCls = "note";
      ragMsg = `<b>Add fleet rows below to test capital serviceability.</b>Enter the aircraft types and utilisation rates this venture will earn on.`;
    } else if (ratio >= 0.8) {
      ragCls = "note ok";
      ragMsg = `<b>\u2713 The planned fleet can generate the revenue its capital requires</b>Capacity of ${fmtMoney(capacityRevenue)}/year covers ${(ratio * 100).toFixed(0)}% of the ${fmtMoney(requiredRevenue)}/year requirement.`;
    } else if (ratio >= 0.5) {
      ragCls = "note warn";
      ragMsg = `<b>\u26A0 The planned fleet is marginal against its capital</b>Capacity of ${fmtMoney(capacityRevenue)}/year covers ${(ratio * 100).toFixed(0)}% of ${fmtMoney(requiredRevenue)}/year required. Contracted demand or a lease structure is recommended before committing capital.`;
    } else {
      const shortfall = ratio > 0 ? ` \u2014 ${(1 / ratio).toFixed(1)}\u00D7 shortfall` : "";
      ragCls = "note warn";
      ragMsg = `<b>\u2717 The planned fleet cannot generate the revenue its capital requires${shortfall}</b>Capacity of ${fmtMoney(capacityRevenue)}/year covers only ${(ratio * 100).toFixed(0)}% of the ${fmtMoney(requiredRevenue)}/year requirement. Reduce fleet size, lease rather than own, or secure anchor contracts before proceeding.`;
    }
    const redBorder = ratio > 0 && ratio < 0.5 ? ' style="border-left-color:var(--jk-red)"' : "";
    $("cst-msg").innerHTML = `<div class="${ragCls}"${redBorder}>${ragMsg}</div>`;
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
    /* EBITDA is revenue times the margin, and that sentence lives here
       once. The sensitivity table, the break-even, the licence test's
       operating cost and the three statements all call it, so they
       cannot disagree about what the venture earns. */
    const ebitdaAt = r => r * (margin / 100);
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
      const ebitda = ebitdaAt(r);
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
        <td class="num"${sc.f === 1 ? ` data-k="ds" data-v="${ds}"` : ""}>${ds ? fmtMoney(ds) : "—"}</td>
        <td class="num"><b>${fmtRatio(dscr)}</b></td>
        <td><span class="rag ${noTerm ? "rag-amber" : ok}">${(noTerm || ok) ? '<span class="dot"></span>' : ""}${label}</span></td>
      </tr>`;
    }).join("");

    // break-even
    const ebitdaBase = ebitdaAt(rev);
    const beRev = margin > 0 ? ds / (margin / 100) : null;         // revenue needed to hit DSCR 1.00
    const beCov = margin > 0 ? (ds * cov) / (margin / 100) : null; // revenue needed to hit the covenant
    const payback = ebitdaBase > 0 ? total / ebitdaBase : null;
    $("be-kpis").innerHTML = `
      <div class="kpi ${beRev && rev >= beRev ? "is-green" : "is-red"}">
        <div class="kv">${beRev ? fmtMoney(beRev) : "—"}</div><div class="kl">Revenue to service debt</div></div>
      <div class="kpi ${beCov && rev >= beCov ? "is-green" : "is-amber"}">
        <div class="kv">${beCov ? fmtMoney(beCov) : "—"}</div><div class="kl">Revenue to meet covenant</div></div>
      <div class="kpi"><div class="kv">${payback ? payback.toFixed(1) + " yr" : "—"}</div><div class="kl">Capital payback on EBITDA</div></div>
      <div class="kpi"><div class="kv" data-k="ebitda-base" data-v="${ebitdaBase}">${rev ? fmtMoney(ebitdaBase) : "—"}</div><div class="kl">EBITDA at base case</div></div>`;
    $("be-note").textContent = margin <= 0
      ? "Set a positive EBITDA margin to compute break-even."
      : `At a ${margin}% EBITDA margin you need ${fmtMoney(beCov)} of annual revenue to hold a ${cov.toFixed(2)}× covenant. Payback is measured on EBITDA before tax and reinvestment, so treat it as a floor, not a forecast.`;

    /* Air Service Licence financial fitness, by jurisdiction. Each rule is
       read from the regulator's own text (research note
       docs/EA_FINANCIAL_FITNESS_2026-11.md, November 2026): the months of
       fixed and operating cost to be covered without revenue, and the
       horizon over which obligations must be met. Ethiopia sets no
       quantified test, so nothing is computed for it rather than borrowing
       another State's figure. Operating cost is revenue less EBITDA, the
       same margin the debt test uses, so the two can never disagree about
       what the venture costs to run. Air services only: an ATO, an MRO or a
       UAS operator holds no Air Service Licence. The jurisdiction <select>
       lives in the page, outside this host, so a re-render cannot destroy it. */
    const aslHost = $("asl-fit");
    const rule = ASL_RULES[$("asl-juris").value] || ASL_RULES.KE;
    $("asl-juris-wrap").hidden = s.id !== "aoc";
    const mo = (n) => ({ 3: "three months", 6: "six months" })[n] || `${n} months`;
    const horizon = (n) => n === 24 ? "two-year (24-month)" : `${n}-month`;
    if (s.id !== "aoc") aslHost.innerHTML = "";
    else if (!rule.months) aslHost.innerHTML = `<div class="note" style="margin:0"><b>Licence financial-fitness test: ${rule.name}</b>${rule.extra} ${rule.cite}.</div>`;
    else if (rev <= 0 || margin >= 100) aslHost.innerHTML = `<div class="note" style="margin:0"><b>Licence financial-fitness test: ${rule.name}</b>The Air Service Licence asks you to show ${mo(rule.months)} of fixed and operating costs covered without revenue. Enter planned revenue and an EBITDA margin above to compute it against your working capital. ${rule.cite}.</div>`;
    else {
      const opex = rev - ebitdaAt(rev);
      const need = opex * rule.months / 12;
      const ok = wc >= need;
      const oblig = baseDscr === null || baseDscr >= 1;
      aslHost.innerHTML = `<div class="note ${ok && oblig ? "ok" : "warn"}" style="margin:0"><b>Licence financial-fitness test (${rule.name}): ${mo(rule.months)} ${ok ? "covered" : "not covered"}</b>` +
        `${mo(rule.months).replace(/^./, (c) => c.toUpperCase())} of fixed and operating costs is ${fmtMoney(need)} (annual operating cost ${fmtMoney(opex)}: revenue less EBITDA). Working capital in the plan is ${fmtMoney(wc)}` +
        (ok ? `, which covers it ${(wc / need).toFixed(1)} times.` : `, ${fmtMoney(need - wc)} short. Raise working capital before the licence application, or expect the Authority to ask for evidence of committed funding.`) +
        (oblig ? "" : ` The base case also does not cover debt service, so the ${horizon(rule.oblig)} obligations test in the business plan would fail too.`) +
        (rule.extra ? ` ${rule.extra}` : "") +
        ` ${rule.cite}.</div>`;
    }

    const ts = renderStatements({ rev, ebitdaAt, capex, wc, equity, invest, sub, grant, debt, rate, term, noTerm });

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
    wireToolEnquiryForm("vent-enquiry", "Greenfield Venture Builder");

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
    if (ts && ts.low < -0.5) sf.push({ sev: "warn", h: `Cash runs out in year ${ts.lowYear}`,
      d: `The three statements reach a cash low of ${fmtMoney(ts.low)} in year ${ts.lowYear}. Fund that before launch, or move the ramp, the margin or the debt terms until it closes.` });
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

  /* ---------- three statements, years 1–5 ----------
     Built from the plan's own inputs, never a second copy of them:
     EBITDA comes from the same ebitdaAt() the DSCR uses, and the debt
     schedule splits the same annualDebtService() payment into interest on
     the opening balance and principal. The four extra inputs live in the
     page and are never rebuilt; only #ts-out is rewritten (CLAUDE.md §6).
     Their defaults are planning defaults from no publication, and the
     page says so beside each one (CLAUDE.md §7).

     Every cell carries its raw figure in data-v so a check can test the
     arithmetic itself (assets = liabilities + equity each year) rather
     than formatted text. Returns the cash low point for the summary. */
  const YEARS = 5;
  /* A cleared box is not a value. clampNum maps NaN to the lower bound,
     which would turn an emptied growth box into -50%: fall back to the
     input's own default instead. */
  const inputOr = id => {
    const v = parseFloat($(id).value), b = BOUNDS[id];
    return isFinite(v) ? clampNum(v, b[0], b[1]) : parseFloat($(id).defaultValue);
  };

  function debtSchedule(principal, ratePct, years, n) {
    const pay = annualDebtService(principal, ratePct, years);
    const out = [];
    let bal = principal;
    for (let y = 1; y <= n; y++) {
      const interest = bal * ratePct / 100;
      const prin = pay > 0 ? Math.min(bal, Math.max(0, pay - interest)) : 0;
      out.push({ interest, prin });
      bal -= prin;
      if (Math.abs(bal) < 0.005) bal = 0;
    }
    return out;
  }

  function renderStatements(p) {
    const host = $("ts-out"), summary = $("ts-summary");
    summary.textContent = "";
    if (p.noTerm) { host.innerHTML = `<div class="note warn" style="margin:1rem 0 0"><b>Set a repayment term</b>The statements need the senior debt's term to split each year's payment into interest and principal.</div>`; return null; }
    if (!(p.rev > 0)) { host.innerHTML = `<div class="note" style="margin:1rem 0 0"><b>Add a revenue assumption</b>Enter steady-state revenue and an EBITDA margin in Step 4 to build the three statements.</div>`; return null; }

    const ramp = inputOr("t-ramp") / 100, growth = inputOr("t-growth") / 100,
          life = inputOr("t-life"), taxRate = inputOr("t-tax") / 100;
    const paidIn = p.equity + p.invest + p.grant;
    const sched = debtSchedule(p.debt, p.rate, p.term, YEARS);
    const Y = [];
    let cash = 0, nfa = 0, re = 0, losses = 0, debtBal = p.debt;
    for (let y = 1; y <= YEARS; y++) {
      const first = y === 1;
      const rev = first ? p.rev * ramp : p.rev * Math.pow(1 + growth, y - 2);
      const ebitda = p.ebitdaAt(rev);
      const capexIn = first ? p.capex : 0;
      const dep = Math.min(p.capex / life, nfa + capexIn);
      const ebit = ebitda - dep;
      const { interest, prin } = sched[y - 1];
      const pbt = ebit - interest;
      /* No tax on a loss; a loss is carried forward without time limit
         and set against the next profits. Stated on the page. */
      let taxable = 0;
      if (pbt < 0) losses -= pbt;
      else { const used = Math.min(losses, pbt); losses -= used; taxable = pbt - used; }
      const tax = taxable * taxRate;
      const ni = pbt - tax;
      const dwc = first ? p.wc : 0;
      const cfo = ni + dep - dwc;
      const eqIn = first ? paidIn : 0, subIn = first ? p.sub : 0, debtIn = first ? p.debt : 0;
      const ncf = cfo - capexIn + eqIn + subIn + debtIn - prin;
      const open = cash;
      cash = open + ncf;
      nfa += capexIn - dep;
      debtBal = Math.max(0, debtBal - prin);
      re += ni;
      const assets = cash + p.wc + nfa;
      const le = debtBal + p.sub + paidIn + re;
      Y.push({ rev, opex: rev - ebitda, ebitda, dep, ebit, int: interest, pbt, tax, ni,
               dwc, cfo, capex: capexIn, eqin: eqIn, subin: subIn, debtin: debtIn, prin, ncf,
               dsy: interest + prin, open, close: cash,
               cash, wc: p.wc, nfa, assets, debt: debtBal, sub: p.sub, paidin: paidIn, re, le, losses });
    }

    /* USD thousands, deductions and negatives in brackets: the convention
       a lender reads without a legend. */
    /* Round the magnitude, then sign it: Math.round(-397.5) is -397 but
       Math.round(397.5) is 398, so depreciation printed (397) in the P&L
       and 398 when added back in the cash flow. */
    const k = v => {
      const r = Math.round(Math.abs(v) / 1000);
      return v < 0 && r > 0 ? `(${fmtNum(r)})` : fmtNum(r);
    };
    const row = (key, label, opt) => {
      const o = opt || {};
      const sign = o.neg ? -1 : 1;
      return `<tr${o.total ? ' class="ts-total"' : ""}><th scope="row">${label}</th>${Y.map((d, i) =>
        `<td class="num" data-k="${key}" data-y="${i + 1}" data-v="${d[key]}">${k(sign * d[key])}</td>`).join("")}</tr>`;
    };
    const subHead = t => `<tr class="ts-sub"><td colspan="${YEARS + 1}">${t}</td></tr>`;
    const table = (caption, rows) => `<div class="table-scroll" style="margin-top:1.1rem"><table class="dtable ts-table">
        <caption>${caption} <span>USD thousands</span></caption>
        <thead><tr><th scope="col">Year</th>${Y.map((_, i) => `<th scope="col" class="num">${i + 1}</th>`).join("")}</tr></thead>
        <tbody>${rows.join("")}</tbody></table></div>`;

    const worst = Math.max(...Y.map(d => Math.abs(d.assets - d.le)));
    const lowIdx = Y.reduce((m, d, i) => d.close < Y[m].close ? i : m, 0);
    const low = Y[lowIdx].close;
    const notes = [];
    if (low < -0.5) notes.push(`<div class="note warn" style="margin:1rem 0 0"><b>Cash goes negative</b>Closing cash falls to ${fmtMoney(low)} in year ${lowIdx + 1}. The plan needs that much more funding, or a faster ramp, a better margin or gentler debt terms.</div>`);
    if (worst > 1) notes.push(`<div class="note warn" style="margin:1rem 0 0"><b>The balance sheet does not balance</b>It is out by ${fmtMoney(worst)}. That is a fault in the tool, not in your plan.</div>`);
    const carried = Y[YEARS - 1].losses;
    /* The one sentence a screen reader hears on each recompute (the
       tables themselves are not a live region). */
    summary.textContent = `Year ${YEARS} closing cash is ${fmtMoney(Y[YEARS - 1].close)}; ` +
      (low < -0.5 ? `cash goes negative in year ${Y.findIndex(d => d.close < -0.5) + 1}, lowest ${fmtMoney(low)} in year ${lowIdx + 1}; ` : "cash does not go negative in any year; ") +
      (worst <= 1 ? "the balance sheet balances in every year." : `the balance sheet does not balance (out by ${fmtMoney(worst)}).`);

    host.innerHTML = notes.join("") +
      table("Profit and loss", [
        row("rev", "Revenue"), row("opex", "Operating cost", { neg: true }),
        row("ebitda", "EBITDA", { total: true }), row("dep", "Depreciation", { neg: true }),
        row("ebit", "EBIT", { total: true }), row("int", "Interest on senior debt", { neg: true }),
        row("pbt", "Profit before tax", { total: true }), row("tax", "Tax", { neg: true }),
        row("ni", "Net income", { total: true })
      ]) +
      table("Cash flow", [
        row("ni", "Net income"), row("dep", "Add back depreciation"),
        row("dwc", "Working capital funded", { neg: true }), row("cfo", "Cash from operations", { total: true }),
        row("capex", "Fixed CAPEX", { neg: true }),
        row("eqin", "Equity and grant received"), row("subin", "Subordinated loan received"),
        row("debtin", "Senior debt drawn"), row("prin", "Senior debt principal repaid", { neg: true }),
        row("ncf", "Net cash flow", { total: true }),
        row("open", "Opening cash"), row("close", "Closing cash", { total: true }),
        subHead("Memo"), row("dsy", "Debt service paid (interest and principal)")
      ]) +
      table("Balance sheet, end of year", [
        row("cash", "Cash"), row("wc", "Working capital"), row("nfa", "Net fixed assets"),
        row("assets", "Total assets", { total: true }),
        row("debt", "Senior debt outstanding"), row("sub", "Subordinated loan"),
        row("paidin", "Paid-in equity and grant"), row("re", "Retained earnings"),
        row("le", "Total liabilities and equity", { total: true })
      ]) +
      `<p class="muted" style="font-size:var(--fs-xs);margin:.6rem 0 0">${worst <= 1 ? "Assets equal liabilities and equity in every year." : ""}` +
      `${carried > 0.5 ? ` Tax losses of ${fmtMoney(carried)} are still to be used after year ${YEARS}.` : ""}</p>`;
    return { low, lowYear: lowIdx + 1 };
  }

  $("print").addEventListener("click", () => window.print());

  /* ---------- restore ---------- */
  FIELDS.forEach(id => { if (state[id] !== undefined) $(id).value = state[id]; });
  /* ?juris= arrives from the licence financial-fitness page's "Test your
     plan" links. An explicit, valid code beats the saved choice (the
     visitor just asked for that country) and is saved with the plan, so
     what is shown and what is stored agree; anything else is ignored and
     the saved or default choice stands. Set before the first recompute,
     so nothing is rebuilt (CLAUDE.md §6). */
  const jurisUrl = (new URLSearchParams(location.search).get("juris") || "").toUpperCase();
  if (Object.prototype.hasOwnProperty.call(ASL_RULES, jurisUrl)) {
    $("asl-juris").value = jurisUrl; state["asl-juris"] = jurisUrl;
  }
  const fromUrl = new URLSearchParams(location.search).get("sector");
  selectSector((fromUrl && JKV.sector(fromUrl)) ? fromUrl : (state.sector || "aoc"), false);
})();
