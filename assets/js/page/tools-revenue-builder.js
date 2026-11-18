(function () {
  applyPartner(); mountChrome();

  const $ = id => document.getElementById(id);
  /* Storage goes through toolStore, like every other venture-track tool.
     It was "jk_revenue_v1" and hand-rolled, which put this tool outside
     the jk_*_v3 namespace the Venture File reads, exports and snapshots
     — so venture-file.js had to special-case it, and that special case
     read live localStorage instead of the source it was handed, which
     made every saved scenario show today's revenue figures. Naming it
     the way the platform names things removes the special case rather
     than working around it. */
  const store = toolStore("revenue");
  const FLAT = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  const REVENUE_SEGMENTS = {
    executiveJet: {
      group: "flight", label: "Executive Jet Charter",
      aircraft: ["Dassault Falcon 7X", "Cessna Citation Sovereign", "Gulfstream G280"],
      rateBands: { low: 7500, base: 9000, high: 12000 },
      docBands: { low: 4200, base: 5250, high: 6800 },
      utilBands: { conservative: 300, base: 500, optimistic: 750 },
      seasonality: [0.7, 0.8, 0.9, 1.0, 1.1, 1.0, 0.9, 0.8, 0.9, 1.0, 1.1, 1.2]
    },
    safariCharter: {
      group: "flight", label: "Safari / Tourism Charter",
      aircraft: ["Cessna C208 Caravan", "Cessna C206", "Pilatus PC-12"],
      rateBands: { low: 900, base: 1200, high: 1600 },
      docBands: { low: 400, base: 550, high: 750 },
      utilBands: { conservative: 400, base: 600, optimistic: 900 },
      seasonality: [0.9, 0.9, 1.0, 1.1, 1.2, 1.1, 1.0, 0.8, 0.7, 0.9, 1.0, 1.1]
    },
    aeromedical: {
      group: "flight", label: "Aeromedical / HEMS Retainer",
      aircraft: ["Airbus H125", "Airbus AS355", "Bell 407"],
      rateBands: { low: 1500, base: 2200, high: 3000 },
      docBands: { low: 700, base: 950, high: 1300 },
      utilBands: { conservative: 200, base: 400, optimistic: 600 },
      seasonality: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
      retainerBands: { low: 25000, base: 45000, high: 80000 },
      defaultMix: { adHoc: 0, blockHours: 0, retainer: 100 }
    },
    acmiWetLease: {
      group: "flight", label: "ACMI / Wet Lease",
      aircraft: ["ATR 72-600", "Embraer E190", "Boeing 737-800"],
      rateBands: { low: 3500, base: 5000, high: 7500 },
      docBands: { low: 2200, base: 3200, high: 4800 },
      utilBands: { conservative: 800, base: 1200, optimistic: 1800 },
      seasonality: FLAT
    },
    corporateCharter: {
      group: "flight", label: "Corporate / Official Charter",
      aircraft: ["Cessna Citation Sovereign+", "Bombardier Challenger 350", "Embraer Legacy 600"],
      rateBands: { low: 3800, base: 5200, high: 7000 },
      docBands: { low: 2000, base: 2800, high: 3800 },
      utilBands: { conservative: 250, base: 400, optimistic: 600 },
      seasonality: [0.8, 0.9, 1.0, 1.0, 1.0, 0.9, 0.9, 1.0, 1.1, 1.1, 1.1, 1.2]
    },
    jetCard: {
      group: "flight", label: "Jet Card / Membership",
      aircraft: ["Cessna Citation Sovereign+", "Embraer Phenom 300E", "Bombardier Challenger 350"],
      rateBands: { low: 5200, base: 6800, high: 9000 },
      docBands: { low: 2600, base: 3600, high: 4800 },
      utilBands: { conservative: 100, base: 200, optimistic: 350 },
      seasonality: [0.8, 0.9, 1.0, 1.0, 1.0, 0.9, 0.9, 1.0, 1.1, 1.1, 1.1, 1.2],
      defaultMix: { adHoc: 0, blockHours: 100, retainer: 0 }
    },
    ngoCharter: {
      group: "flight", label: "NGO / UN / Humanitarian Charter",
      aircraft: ["Cessna C208 Caravan", "Pilatus PC-12", "Dash 8-300"],
      rateBands: { low: 1200, base: 1700, high: 2400 },
      docBands: { low: 650, base: 900, high: 1300 },
      utilBands: { conservative: 300, base: 500, optimistic: 800 },
      seasonality: FLAT,
      retainerBands: { low: 15000, base: 30000, high: 55000 },
      defaultMix: { adHoc: 0, blockHours: 0, retainer: 100 }
    },
    miningShuttle: {
      group: "flight", label: "Extractive / Infrastructure Shuttle",
      aircraft: ["Dash 8-300", "Pilatus PC-12", "Beechcraft 1900D"],
      rateBands: { low: 2000, base: 2900, high: 4200 },
      docBands: { low: 1200, base: 1800, high: 2500 },
      utilBands: { conservative: 500, base: 800, optimistic: 1200 },
      seasonality: FLAT,
      retainerBands: { low: 30000, base: 55000, high: 95000 },
      defaultMix: { adHoc: 0, blockHours: 0, retainer: 100 }
    },
    helicopterCharter: {
      group: "flight", label: "Helicopter Charter / Utility",
      aircraft: ["Airbus H125", "Airbus H135", "Bell 407"],
      rateBands: { low: 1800, base: 2500, high: 3400 },
      docBands: { low: 800, base: 1100, high: 1500 },
      utilBands: { conservative: 200, base: 350, optimistic: 550 },
      seasonality: [0.9, 0.9, 1.0, 1.1, 1.2, 1.1, 1.0, 0.9, 0.8, 0.9, 1.0, 1.1]
    },
    medevacFixedWing: {
      group: "flight", label: "Fixed-Wing Medevac / CASEVAC",
      aircraft: ["Beechcraft King Air 350i", "Pilatus PC-12", "Cessna Citation Sovereign+"],
      rateBands: { low: 2400, base: 3300, high: 4600 },
      docBands: { low: 1300, base: 1800, high: 2500 },
      utilBands: { conservative: 120, base: 250, optimistic: 400 },
      seasonality: FLAT,
      retainerBands: { low: 25000, base: 45000, high: 85000 },
      defaultMix: { adHoc: 0, blockHours: 0, retainer: 100 }
    },
    aerialSurvey: {
      group: "flight", label: "Aerial Survey / Special Missions",
      aircraft: ["Cessna C208 Caravan", "Beechcraft King Air 350i", "Pilatus PC-12", "Cessna C206"],
      rateBands: { low: 900, base: 1500, high: 2300 },
      docBands: { low: 450, base: 700, high: 1000 },
      utilBands: { conservative: 250, base: 400, optimistic: 650 },
      seasonality: [1.2, 1.2, 1.0, 0.7, 0.6, 0.7, 1.2, 1.3, 1.2, 1.0, 0.8, 0.8]
    },
    lightCargo: {
      group: "flight", label: "Light Cargo / Express",
      aircraft: ["Cessna C208 Caravan", "Let L-410", "Pilatus PC-12"],
      rateBands: { low: 1000, base: 1500, high: 2200 },
      docBands: { low: 600, base: 850, high: 1200 },
      utilBands: { conservative: 450, base: 750, optimistic: 1150 },
      seasonality: FLAT
    },
    /* Non-flight streams. kind "unit": revenue = price x volume, cost =
       unit cost x volume. kind "pct": revenue = rate% x base, cost = cost%
       x base. They reuse the rate / doc / hours fields (price, cost,
       volume) so the saved shape, the sensitivity sliders, the Venture
       File fallback and the JSON export all work unchanged. */
    managementFee: {
      group: "services", kind: "unit", label: "Aircraft Management Fees",
      unit: "aircraft-months managed", priceLabel: "Fee / aircraft-month (USD)", costLabel: "Cost to serve / aircraft-month (USD)", volLabel: "Aircraft-months / year",
      rateBands: { low: 6000, base: 12000, high: 25000 },
      docBands: { low: 3500, base: 7000, high: 14000 },
      utilBands: { conservative: 24, base: 60, optimistic: 120 },
      seasonality: FLAT
    },
    brokerage: {
      group: "services", kind: "pct", label: "Charter Brokerage Commission",
      priceLabel: "Commission (% of value brokered)", costLabel: "Cost of sales (% of value brokered)", volLabel: "Gross charter value brokered (USD / year)",
      rateBands: { low: 5, base: 10, high: 15 },
      docBands: { low: 2, base: 4, high: 7 },
      utilBands: { conservative: 1000000, base: 3000000, optimistic: 8000000 },
      seasonality: FLAT
    },
    mroLabour: {
      group: "services", kind: "unit", label: "MRO Labour (third-party work)",
      unit: "labour hours billed", priceLabel: "Labour rate / hour (USD)", costLabel: "Cost / hour incl. overhead (USD)", volLabel: "Billed labour hours / year",
      rateBands: { low: 60, base: 85, high: 140 },
      docBands: { low: 30, base: 48, high: 80 },
      utilBands: { conservative: 4000, base: 9000, optimistic: 18000 },
      seasonality: FLAT
    },
    partsMargin: {
      group: "services", kind: "pct", label: "Parts Margin (net of pass-through)",
      priceLabel: "Mark-up on parts cost (%)", costLabel: "Handling and logistics (% of parts cost)", volLabel: "Parts bought for customers (USD / year)",
      rateBands: { low: 8, base: 15, high: 25 },
      docBands: { low: 1, base: 3, high: 6 },
      utilBands: { conservative: 500000, base: 1500000, optimistic: 4000000 },
      seasonality: FLAT
    },
    fboHandling: {
      group: "services", kind: "unit", label: "FBO Handling Fees",
      unit: "turnarounds handled", priceLabel: "Handling fee / turnaround (USD)", costLabel: "Cost / turnaround (USD)", volLabel: "Turnarounds / year",
      rateBands: { low: 250, base: 500, high: 900 },
      docBands: { low: 120, base: 230, high: 450 },
      utilBands: { conservative: 600, base: 1500, optimistic: 3000 },
      seasonality: FLAT
    },
    fuelMargin: {
      group: "services", kind: "unit", label: "FBO Fuel Margin",
      unit: "thousand litres sold", priceLabel: "Margin / 1,000 litres (USD)", costLabel: "Into-plane cost / 1,000 litres (USD)", volLabel: "Thousand litres / year",
      rateBands: { low: 80, base: 140, high: 250 },
      docBands: { low: 15, base: 30, high: 60 },
      utilBands: { conservative: 500, base: 1500, optimistic: 4000 },
      seasonality: FLAT
    },
    hangarage: {
      group: "services", kind: "unit", label: "Hangarage and Parking",
      unit: "aircraft-months hangared", priceLabel: "Hangar fee / aircraft-month (USD)", costLabel: "Cost / aircraft-month (USD)", volLabel: "Aircraft-months / year",
      rateBands: { low: 1500, base: 2800, high: 6000 },
      docBands: { low: 500, base: 900, high: 2000 },
      utilBands: { conservative: 60, base: 180, optimistic: 360 },
      seasonality: FLAT
    },
    groundHandling: {
      group: "services", kind: "unit", label: "Ground Handling (third-party)",
      unit: "turnarounds handled", priceLabel: "Fee / turnaround (USD)", costLabel: "Cost / turnaround (USD)", volLabel: "Turnarounds / year",
      rateBands: { low: 350, base: 650, high: 1200 },
      docBands: { low: 220, base: 420, high: 800 },
      utilBands: { conservative: 1000, base: 3000, optimistic: 8000 },
      seasonality: FLAT
    },
    ancillary: {
      group: "services", kind: "pct", label: "Ancillary Services (catering, ground transport, permits)",
      priceLabel: "Revenue (% of charter revenue)", costLabel: "Cost (% of charter revenue)", volLabel: "Charter revenue it attaches to (USD / year)",
      rateBands: { low: 4, base: 10, high: 15 },
      docBands: { low: 2, base: 6, high: 10 },
      utilBands: { conservative: 1000000, base: 4000000, optimistic: 10000000 },
      seasonality: FLAT
    }
  };
  /* Indicative planning defaults, NOT sourced benchmarks.

     Everything in SEGMENT_TYPES above and AIRCRAFT_VALUES below is an
     order-of-magnitude starting point, carried here so a new segment
     arrives with something to argue with rather than an empty form.
     None of it is attributed, because none of it comes from a named
     publication — unlike the benchmarks in data.js, which check-data
     requires to name a source and a date.

     That distinction has to survive contact with a board pack, so it
     is stated three times where it can be read: on the page beside the
     segment editor, in the basis line of the printed pack, and here.
     Every one of these values is editable in the UI, and the figure
     that drives the model is whatever the operator enters. Do not
     promote these into data.js or cite them as evidence of anything. */
  const AIRCRAFT_VALUES = {
    "Dassault Falcon 7X": 22000000,
    "Cessna Citation Sovereign": 10000000,
    "Gulfstream G280": 15000000,
    "Cessna C208 Caravan": 1800000,
    "Cessna C206": 400000,
    "Pilatus PC-12": 4500000,
    "Airbus H125": 3300000,
    "Airbus AS355": 5000000,
    "Bell 407": 3200000,
    "ATR 72-600": 26000000,
    "Embraer E190": 30000000,
    "Boeing 737-800": 45000000,
    "Cessna Citation Sovereign+": 12000000,
    "Bombardier Challenger 350": 16000000,
    "Embraer Legacy 600": 8000000,
    "Embraer Phenom 300E": 9500000,
    "Dash 8-300": 7000000,
    "Beechcraft 1900D": 3500000,
    "Airbus H135": 6500000,
    "Beechcraft King Air 350i": 8500000,
    "Let L-410": 2500000
  };

  /* One-time adoption of anything saved under the old key, so the move
     to the platform namespace does not cost a visitor the model they
     built before it. The old key is left in place rather than deleted:
     it costs a few hundred bytes and means a half-finished migration
     never lands between the two. */
  function loadState() {
    const cur = store.load();
    if (Object.keys(cur).length) return cur;
    try {
      const legacy = JSON.parse(localStorage.getItem("jk_revenue_v1"));
      if (legacy && typeof legacy === "object") return legacy;
    } catch {}
    return {};
  }
  /* reportingWrite (via toolStore.save), not a bare catch. A silently
     dropped write here loses the whole revenue model on reload with
     nothing on screen — the failure tests/storage.mjs exists to catch. */
  function saveState(st) { return store.save(st); }

  let state = loadState();
  if (!Array.isArray(state.segments)) state.segments = [];
  if (!state.sens) state.sens = { rate: 0, util: 0, doc: 0 };
  if (!state.cst) state.cst = { programmeTotal: 0, annualDebtService: 0 };

  let _nextId = Date.now();
  function newId() { return "s" + (_nextId++).toString(36); }

  function mixShares(seg) {
    const adHoc = clampNum(parseFloat(seg.adHoc) || 0, 0, 100);
    const blockHours = clampNum(parseFloat(seg.blockHours) || 0, 0, 100);
    const retainer = clampNum(parseFloat(seg.retainer) || 0, 0, 100);
    const total = adHoc + blockHours + retainer;
    if (total <= 0) return { adHoc: 1, blockHours: 0, retainer: 0, total: 0 };
    return {
      adHoc: adHoc / total,
      blockHours: blockHours / total,
      retainer: retainer / total,
      total
    };
  }

  /* One formula for a segment's revenue and direct cost over `hours` of
     activity (hours, or the unit volume for non-flight streams). Annual
     and Year 1 both go through it, so the two cannot drift apart. */
  function revenueFor(seg, cfg, sa, hours, retainerShare) {
    const rate = (parseFloat(seg.rate) || 0) * sa.rate;
    const doc = (parseFloat(seg.doc) || 0) * sa.doc;
    if (cfg.kind === "unit") return { rev: rate * hours, doc: doc * hours };
    if (cfg.kind === "pct") return { rev: rate / 100 * hours, doc: doc / 100 * hours };
    const mix = mixShares(seg);
    let rev;
    if (cfg.retainerBands && mix.retainer > 0) {
      const retainerMonthly = parseFloat(seg.retainerAmt) || cfg.retainerBands.base;
      rev = retainerMonthly * retainerShare + rate * hours;
    } else {
      rev = (rate * hours * mix.adHoc) + (rate * hours * mix.blockHours * 0.85) + (rate * hours * mix.retainer * 0.85);
    }
    return { rev, doc: doc * hours };
  }

  function segmentAnnualRevenue(seg, sensAdj) {
    const sa = sensAdj || { rate: 1, util: 1, doc: 1 };
    const cfg = REVENUE_SEGMENTS[seg.type];
    if (!cfg) return { rev: 0, doc: 0 };
    return revenueFor(seg, cfg, sa, (parseFloat(seg.hours) || 0) * sa.util, 12);
  }

  function year1Revenue(seg, sensAdj) {
    const cfg = REVENUE_SEGMENTS[seg.type];
    if (!cfg) return { rev: 0, doc: 0 };
    const sa = sensAdj || { rate: 1, util: 1, doc: 1 };
    const hours = (parseFloat(seg.hours) || 0) * sa.util;
    const avgSeasonality = cfg.seasonality.reduce((a, b) => a + b, 0) / 12;
    let totalRev = 0, totalDoc = 0;
    cfg.seasonality.forEach(sf => {
      const r = revenueFor(seg, cfg, sa, (hours / 12) * (sf / avgSeasonality), 1);
      totalRev += r.rev;
      totalDoc += r.doc;
    });
    return { rev: totalRev, doc: totalDoc };
  }

  function computeProjection(segments, sensAdj) {
    const rows = [];
    let cumulative = 0;
    for (let yr = 1; yr <= 10; yr++) {
      let rev = 0, doc = 0;
      segments.forEach(seg => {
        const result = yr === 1 ? year1Revenue(seg, sensAdj) : segmentAnnualRevenue(seg, sensAdj);
        rev += result.rev;
        doc += result.doc;
      });
      const contrib = rev - doc;
      cumulative += contrib;
      rows.push({ yr, rev, doc, contrib, cumulative });
    }
    return rows;
  }

  /* The capital a ten-year contribution stream has to recover: the
     programme total plus ten years of debt service.

     This was computed one way here (divided by a contribution margin),
     described a second way in the caption directly beneath it, and
     saved to the Venture File a third way — so the banner, its own
     explanation and the dashboard disagreed about the single number
     this tool exists to produce.

     The margin divisor was the error. It is the right term in the
     Venture Builder's test, which compares a *revenue* capacity against
     a revenue requirement. Here the numerator is already contribution —
     revenue less direct operating cost, from the operator's own segment
     figures — so dividing the requirement by margin as well counts the
     margin twice. At the 35% default it inflated the requirement almost
     threefold and reported "cannot service its capital" against models
     that comfortably could. Contribution is compared against capital
     directly, which is also what the caption always claimed. */
  function capitalRecovery(programmeTotal, annualDebtService) {
    return (programmeTotal || 0) + (annualDebtService || 0) * 10;
  }

  /* The verdict re-renders on every keystroke; the controls do not.

     This block used to rebuild its own innerHTML on each recompute(),
     which destroyed the input being typed into: focus fell to <body>,
     the panel folded shut, and characters typed into the node that was
     about to be replaced went with it — entering "50000000" left "50"
     in the field. So the shell is built once and only the verdict line
     is rewritten. There is then nothing to restore and nothing to drop. */
  function buildCstShell(host) {
    host.innerHTML = `<p class="eyebrow" style="margin:0 0 .5rem">Capital recovery test</p>
      <div id="cst-msg"></div>
      <div class="muted" style="margin-top:.8rem;font-size:var(--fs-xs)">
        Capital recovery requirement = programme total + (annual debt service \u00D7 10).
        This asks whether the contribution this model earns pays the capital back over ten years.
        The Venture Builder asks a different question of the same venture \u2014 whether the planned
        fleet can generate the <i>revenue</i> that capital requires \u2014 so the two can disagree,
        and a venture usually needs to satisfy both.
        <a href="#" id="cst-edit-toggle">Edit programme figures \u25BE</a>
      </div>
      <div id="cst-inputs" style="display:none;margin-top:.8rem">
        <div class="field-row">
          <div class="field"><label for="cst-pt">Programme total (USD)</label>
            <input type="number" id="cst-pt" min="0" step="1000000"></div>
          <div class="field"><label for="cst-ds">Annual debt service (USD)</label>
            <input type="number" id="cst-ds" min="0" step="100000"></div>
        </div>
      </div>`;

    const tog = $("cst-edit-toggle");
    tog.addEventListener("click", e => {
      e.preventDefault();
      state.cst.open = !state.cst.open;
      $("cst-inputs").style.display = state.cst.open ? "block" : "none";
      tog.textContent = `Edit programme figures ${state.cst.open ? "\u25B4" : "\u25BE"}`;
      saveState(state);
    });

    /* No contribution-margin field: the segments already carry the
       operator's own direct operating cost, so the margin is an output
       of this model, not an input to it. */
    ["cst-pt", "cst-ds"].forEach(id => {
      $(id).addEventListener("input", e => {
        if (id === "cst-pt") state.cst.programmeTotal = parseFloat(e.target.value) || 0;
        else state.cst.annualDebtService = parseFloat(e.target.value) || 0;
        saveState(state);
        recompute();
      });
    });
  }

  function renderCapitalServiceTest(tenYrContrib) {
    const host = $("cst-banner");
    if (!host) return;
    const pt = state.cst.programmeTotal || 0;
    const ds = state.cst.annualDebtService || 0;
    if (!pt && !ds && !state.cst.open) { host.innerHTML = ""; host.dataset.built = ""; return; }

    if (host.dataset.built !== "1") { buildCstShell(host); host.dataset.built = "1"; }

    /* Write a value back only when the field is not the one being typed
       into, so a half-entered figure is never overwritten mid-keystroke. */
    const ptIn = $("cst-pt"), dsIn = $("cst-ds");
    if (document.activeElement !== ptIn && ptIn.value !== String(pt)) ptIn.value = pt;
    if (document.activeElement !== dsIn && dsIn.value !== String(ds)) dsIn.value = ds;
    $("cst-inputs").style.display = state.cst.open ? "block" : "none";
    $("cst-edit-toggle").textContent = `Edit programme figures ${state.cst.open ? "\u25B4" : "\u25BE"}`;

    const capRecovery = capitalRecovery(pt, ds);
    const ratio = capRecovery > 0 && tenYrContrib > 0 ? tenYrContrib / capRecovery : 0;

    let cls, msg;
    if (ratio >= 0.8) {
      cls = "note ok";
      msg = `<b>\u2713 This model recovers its capital</b>10-year contribution of ${fmtMoney(tenYrContrib)} covers ${(ratio * 100).toFixed(0)}% of the capital recovery requirement of ${fmtMoney(capRecovery)}.`;
    } else if (ratio >= 0.5) {
      cls = "note warn";
      msg = `<b>\u26A0 This model is marginal against its capital</b>10-year contribution of ${fmtMoney(tenYrContrib)} covers ${(ratio * 100).toFixed(0)}% of ${fmtMoney(capRecovery)}. Contracted demand or lease structure recommended.`;
    } else {
      /* Guarded: a model with segments but no contribution gives ratio
         zero, and 1/0 printed "a Infinity\u00D7 shortfall". */
      const shortfall = ratio > 0 ? `a ${(1 / ratio).toFixed(1)}\u00D7 shortfall` : "no contribution against it at all";
      cls = "note";
      msg = `<b>\u2717 This model does not recover its capital</b>10-year contribution of ${fmtMoney(tenYrContrib || 0)} covers only ${(ratio * 100).toFixed(0)}% of the ${fmtMoney(capRecovery)} capital recovery requirement \u2014 ${shortfall}. Reduce fleet, lease rather than own, or secure anchor contracts.`;
    }

    const style = ratio < 0.5 ? ` style="border-left-color:var(--jk-red);background:var(--jk-parchment)"` : "";
    $("cst-msg").innerHTML = `<div class="${cls}"${style}>${msg}</div>`;
  }

  function importFleet() {
    try {
      const vb = JSON.parse(localStorage.getItem("jk_venture_v3") || "{}");
      if (!vb || !vb.sector) {
        $("import-status").textContent = "No Venture Builder data found on this device.";
        return;
      }
      const sec = JKV.sector(vb.sector);
      const tier = (sec && sec.capital.tiers.find(t => t.id === vb.tier)) || (sec && sec.capital.tiers[0]);
      let total = 0;
      if (tier && vb.capex) {
        tier.lines.forEach((l, i) => { total += (vb.capex[i] || 0); void l; });
      }
      state.cst.programmeTotal = total;
      const debt = parseFloat(vb["f-debt"]) || 0;
      const rate = parseFloat(vb["d-rate"]) || 9;
      const term = parseFloat(vb["d-term"]) || 7;
      state.cst.annualDebtService = annualDebtService(debt, rate, term);
      saveState(state);
      $("import-status").textContent = `Imported: ${sec ? sec.short : "venture"}, ${fmtMoney(total)} capital.`;
      recompute();
    } catch (e) {
      $("import-status").textContent = "Could not read Venture Builder data.";
    }
  }

  function renderProjectionTable(proj) {
    const body = $("proj-body");
    if (!body) return;
    body.innerHTML = proj.length ? proj.map(r => `<tr>
      <td>Year ${r.yr}</td>
      <td class="num">${fmtMoney(r.rev)}</td>
      <td class="num">${fmtMoney(r.doc)}</td>
      <td class="num ${r.contrib >= 0 ? "" : "rag-red"}"><b>${fmtMoney(r.contrib)}</b></td>
      <td class="num tnum">${fmtMoney(r.cumulative)}</td>
    </tr>`).join("") : `<tr><td colspan="5" class="muted">Add segments above to build the revenue projection.</td></tr>`;
  }

  function renderBreakEvenTable(segments) {
    const body = $("be-body");
    if (!body) return;
    const rows = [];
    segments.forEach(seg => {
      const cfg = REVENUE_SEGMENTS[seg.type];
      if (!cfg || cfg.kind) return;
      const contrib = (parseFloat(seg.rate) || 0) - (parseFloat(seg.doc) || 0);
      if (contrib <= 0) return;
      const aircraftVal = parseFloat(seg.aircraftValue) || AIRCRAFT_VALUES[seg.aircraft] || 5000000;
      const ownCapCharge = annualDebtService(aircraftVal, 12, 10);
      const leaseMonthlyRate = cfg.retainerBands ? 0.011 : 0.010;
      const leaseAnnual = aircraftVal * leaseMonthlyRate * 12;
      const bEOwned = ownCapCharge / contrib;
      const bELeased = leaseAnnual / contrib;
      rows.push({
        aircraft: seg.aircraft,
        rate: parseFloat(seg.rate) || 0,
        doc: parseFloat(seg.doc) || 0,
        contrib,
        bEOwned,
        bELeased
      });
    });
    body.innerHTML = rows.length ? rows.map(r => `<tr>
      <td>${escapeHtml(r.aircraft)}</td>
      <td class="num">${fmtMoney(r.rate)}/hr</td>
      <td class="num">${fmtMoney(r.doc)}/hr</td>
      <td class="num"><b>${fmtMoney(r.contrib)}/hr</b></td>
      <td class="num tnum">${Math.round(r.bEOwned).toLocaleString("en-GB")} hrs</td>
      <td class="num tnum">${Math.round(r.bELeased).toLocaleString("en-GB")} hrs</td>
    </tr>`).join("") : `<tr><td colspan="6" class="muted">Add segments above to see break-even analysis.</td></tr>`;
  }

  function renderRail(proj, sa) {
    const yr1 = proj[0] || { rev: 0, doc: 0, contrib: 0 };
    const tenYr = proj.reduce((a, r) => a + r.contrib, 0);
    const baseProjNoSens = computeProjection(state.segments, { rate: 1, util: 1, doc: 1 });
    const baseTenYr = baseProjNoSens.reduce((a, r) => a + r.contrib, 0);
    void sa;

    $("r-rev").textContent = fmtMoney(yr1.rev);
    $("r-doc").textContent = fmtMoney(yr1.doc);
    $("r-contrib").textContent = fmtMoney(yr1.contrib);
    $("r-10yr").textContent = fmtMoney(tenYr);

    $("r-rev").parentElement.className = "kpi " + (yr1.rev > 0 ? "is-green" : "");
    $("r-contrib").parentElement.className = "kpi " + (yr1.contrib > 0 ? "is-green" : "is-red");

    const atRisk = tenYr - baseTenYr;
    const atRiskEl = $("sens-at-risk");
    if (atRiskEl) {
      atRiskEl.textContent = fmtMoney(Math.abs(atRisk));
      atRiskEl.style.color = atRisk < 0 ? "var(--jk-red-dk)" : "var(--jk-green)";
    }
  }

  function renderSegCard(seg) {
    const cfg = REVENUE_SEGMENTS[seg.type];
    if (!cfg) return "";
    if (cfg.kind) {
      const isPct = cfg.kind === "pct";
      const fmtBand = v => isPct ? v + "%" : fmtMoney(v);
      return `<div class="card card-flat" id="card-${seg.id}" style="margin-bottom:1.2rem">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:1rem;margin-bottom:1rem">
        <b style="font-size:var(--fs-md)">${escapeHtml(cfg.label)} <span class="muted" style="font-weight:400;font-size:var(--fs-xs)">non-flight stream</span></b>
        <button class="btn btn-ghost-sm btn-sm" data-delete="${seg.id}">Remove</button>
      </div>
      <div class="field-row">
        <div class="field">
          <label>${escapeHtml(cfg.priceLabel)}</label>
          <input type="number" min="0" step="${isPct ? 0.5 : 10}" value="${seg.rate}" data-seg="${seg.id}" data-field="rate">
          <p class="hint">Band ${fmtBand(cfg.rateBands.low)}\u2013${fmtBand(cfg.rateBands.high)}</p>
        </div>
        <div class="field">
          <label>${escapeHtml(cfg.costLabel)}</label>
          <input type="number" min="0" step="${isPct ? 0.5 : 10}" value="${seg.doc}" data-seg="${seg.id}" data-field="doc">
          <p class="hint">Band ${fmtBand(cfg.docBands.low)}\u2013${fmtBand(cfg.docBands.high)}</p>
        </div>
      </div>
      <div class="field">
        <label>${escapeHtml(cfg.volLabel)}</label>
        <input type="number" min="0" step="${isPct ? 100000 : 10}" value="${seg.hours}" data-seg="${seg.id}" data-field="hours" style="max-width:260px">
        <p class="hint">Band ${cfg.utilBands.conservative.toLocaleString("en-GB")}\u2013${cfg.utilBands.optimistic.toLocaleString("en-GB")}. The utilisation slider scales this volume; the rate slider scales the price.</p>
      </div>
    </div>`;
    }
    const isAero = !!cfg.retainerBands;
    const totalMix = (parseFloat(seg.adHoc) || 0) + (parseFloat(seg.blockHours) || 0) + (parseFloat(seg.retainer) || 0);
    const mixOk = Math.abs(totalMix - 100) <= 1;
    const aircraftVal = parseFloat(seg.aircraftValue) || AIRCRAFT_VALUES[seg.aircraft] || 0;

    return `<div class="card card-flat" id="card-${seg.id}" style="margin-bottom:1.2rem">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:1rem;margin-bottom:1rem">
        <b style="font-size:var(--fs-md)">${escapeHtml(cfg.label)}</b>
        <button class="btn btn-ghost-sm btn-sm" data-delete="${seg.id}">Remove</button>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Aircraft</label>
          <select data-seg="${seg.id}" data-field="aircraft">
            ${cfg.aircraft.map(a => `<option value="${escapeHtml(a)}"${seg.aircraft === a ? " selected" : ""}>${escapeHtml(a)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>Rate / hour (USD)</label>
          <input type="number" min="100" step="100" value="${seg.rate}" data-seg="${seg.id}" data-field="rate">
          <p class="hint">Band ${fmtMoney(cfg.rateBands.low)}–${fmtMoney(cfg.rateBands.high)}/hr</p>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>DOC / hour (USD)</label>
          <input type="number" min="0" step="100" value="${seg.doc}" data-seg="${seg.id}" data-field="doc">
          <p class="hint">Band ${fmtMoney(cfg.docBands.low)}–${fmtMoney(cfg.docBands.high)}/hr</p>
        </div>
        <div class="field">
          <label>Hours / year</label>
          <input type="number" min="0" step="10" value="${seg.hours}" data-seg="${seg.id}" data-field="hours">
          <p class="hint">Band ${cfg.utilBands.conservative}–${cfg.utilBands.optimistic} hrs/yr</p>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Ad-hoc (%)</label>
          <input type="number" min="0" max="100" step="5" value="${seg.adHoc || 0}" data-seg="${seg.id}" data-field="adHoc">
        </div>
        <div class="field">
          <label>Block hours (%)</label>
          <input type="number" min="0" max="100" step="5" value="${seg.blockHours || 0}" data-seg="${seg.id}" data-field="blockHours">
        </div>
        <div class="field">
          <label>Retainer (%)</label>
          <input type="number" min="0" max="100" step="5" value="${seg.retainer || 0}" data-seg="${seg.id}" data-field="retainer">
        </div>
      </div>
      ${!mixOk ? `<p class="hint" style="color:var(--jk-amber-text)">Contract mix sums to ${totalMix}% — should be 100%.</p>` : ""}
      ${isAero ? `<div class="field">
        <label>Monthly retainer (USD/month)</label>
        <input type="number" min="0" step="1000" value="${seg.retainerAmt || cfg.retainerBands.base}" data-seg="${seg.id}" data-field="retainerAmt">
        <p class="hint">Band ${fmtMoney(cfg.retainerBands.low)}–${fmtMoney(cfg.retainerBands.high)}/month standby</p>
      </div>` : ""}
      <div class="field" style="margin-top:.6rem">
        <label>Aircraft value (USD) <span class="muted" style="font-weight:400;font-size:var(--fs-xs)">for break-even calculation</span></label>
        <input type="number" min="0" step="100000" value="${aircraftVal}" data-seg="${seg.id}" data-field="aircraftValue" style="max-width:220px">
      </div>
    </div>`;
  }

  /* The printed pack opened with the segment cards, which is the
     working, not the answer: a reader reached the verdict on page
     three. This puts it on the opening page, and withdraws it entirely
     when there is no model to have a verdict about. */
  function renderPrintSummary(proj) {
    if (!state.segments.length) { mountPrintSummary(null); return; }

    const yr1 = proj[0] || { rev: 0, contrib: 0 };
    const tenYr = proj.length ? proj[proj.length - 1].cumulative : 0;
    const capRecovery = capitalRecovery(state.cst.programmeTotal, state.cst.annualDebtService);
    const ratio = capRecovery > 0 && tenYr > 0 ? tenYr / capRecovery : null;

    const f = [];
    if (ratio === null) {
      f.push({ sev: "note", h: "No capital programme entered",
        d: "Enter the programme total and annual debt service, or import them from the Venture Builder, to test whether this revenue model recovers the capital behind it. Without them this pack is a revenue projection, not a serviceability test." });
    } else if (ratio < 0.5) {
      f.push({ sev: "stop", h: `Capital recovery covered ${(ratio * 100).toFixed(0)}%`,
        d: `Ten-year contribution of ${fmtMoney(tenYr)} against a capital recovery requirement of ${fmtMoney(capRecovery)}. Reduce fleet size, lease rather than own, or secure anchor contracts before committing capital.` });
    } else if (ratio < 0.8) {
      f.push({ sev: "warn", h: `Capital recovery covered ${(ratio * 100).toFixed(0)}% \u2014 marginal`,
        d: `Ten-year contribution of ${fmtMoney(tenYr)} against ${fmtMoney(capRecovery)}. Contracted demand or a lease structure is the usual route to closing a gap this size.` });
    } else {
      f.push({ sev: "ok", h: `Capital recovery covered ${(ratio * 100).toFixed(0)}%`,
        d: `Ten-year contribution of ${fmtMoney(tenYr)} against a requirement of ${fmtMoney(capRecovery)}, at the utilisation entered here.` });
    }

    if (yr1.contrib <= 0) f.push({ sev: "stop", h: "Year 1 contribution is not positive",
      d: "At the rates, utilisation and direct operating costs entered, the first year does not cover its own variable cost. Nothing downstream of this line is worth reading until it does." });

    const sens = state.sens || {};
    if (sens.rate || sens.util || sens.doc) f.push({ sev: "note", h: "Figures carry a sensitivity adjustment",
      d: `Rate ${sens.rate > 0 ? "+" : ""}${sens.rate || 0}%, utilisation ${sens.util > 0 ? "+" : ""}${sens.util || 0}%, direct cost ${sens.doc > 0 ? "+" : ""}${sens.doc || 0}%. This pack is not the unadjusted base case.` });

    const verdict = ratio === null
      ? `${fmtMoney(yr1.rev)} Year 1 revenue across ${state.segments.length} segment${state.segments.length !== 1 ? "s" : ""}`
      : ratio >= 0.8 ? "This revenue model recovers its capital at projected utilisation"
      : ratio >= 0.5 ? "This revenue model is marginal against its capital"
      : "This revenue model does not recover its capital";

    mountPrintSummary({
      title: `Revenue model \u2014 ${state.segments.length} segment${state.segments.length !== 1 ? "s" : ""}`,
      verdict,
      findings: f,
      basis: "Ten-year projection from the operator's own rates, utilisation and direct operating costs. Segment defaults are indicative planning estimates, not quotations or sourced benchmarks. Non-flight streams earn price x volume or a percentage of an entered base. Capital recovery requirement = programme total + (annual debt service \u00D7 10)."
    });
  }

  function recompute() {
    const sa = {
      rate: 1 + (state.sens.rate || 0) / 100,
      util: 1 + (state.sens.util || 0) / 100,
      doc: 1 + (state.sens.doc || 0) / 100
    };
    const proj = computeProjection(state.segments, sa);
    renderProjectionTable(proj);
    renderBreakEvenTable(state.segments);
    renderRail(proj, sa);
    renderCapitalServiceTest(proj.length ? proj[proj.length - 1].cumulative : 0);
    renderPrintSummary(proj);
    saveState(state);
  }

  function renderAll() {
    const host = $("seg-cards");
    if (host) host.innerHTML = state.segments.map(renderSegCard).join("");
    recompute();
  }

  $("add-seg").addEventListener("click", () => {
    const type = $("seg-type").value;
    if (!type || !REVENUE_SEGMENTS[type]) return;
    state.segments.push(makeSegment(type));
    renderAll();
  });
  function makeSegment(type, over) {
    const cfg = REVENUE_SEGMENTS[type];
    const mix = cfg.defaultMix || { adHoc: 100, blockHours: 0, retainer: 0 };
    const ac = cfg.kind ? (cfg.unit || "% of base") : cfg.aircraft[0];
    return Object.assign({
      id: newId(),
      type,
      kind: cfg.kind || "",
      aircraft: ac,
      rate: cfg.rateBands.base,
      doc: cfg.docBands.base,
      hours: cfg.utilBands.base,
      adHoc: mix.adHoc,
      blockHours: mix.blockHours,
      retainer: mix.retainer,
      retainerAmt: cfg.retainerBands ? cfg.retainerBands.base : 0,
      aircraftValue: cfg.kind ? 0 : (AIRCRAFT_VALUES[cfg.aircraft[0]] || 0)
    }, over || {});
  }
  void 0;


  $("seg-cards").addEventListener("input", e => {
    const segId = e.target.dataset.seg;
    const field = e.target.dataset.field;
    if (!segId || !field) return;
    const seg = state.segments.find(s => s.id === segId);
    if (!seg) return;
    if (field === "aircraft") {
      seg.aircraft = e.target.value;
    } else {
      const val = parseFloat(e.target.value);
      if (isFinite(val)) seg[field] = val;
    }
    recompute();
  });

  $("seg-cards").addEventListener("change", e => {
    const segId = e.target.dataset.seg;
    const field = e.target.dataset.field;
    if (!segId || !field) return;
    const seg = state.segments.find(s => s.id === segId);
    if (!seg) return;
    if (field === "aircraft") {
      seg.aircraft = e.target.value;
      seg.aircraftValue = AIRCRAFT_VALUES[e.target.value] || seg.aircraftValue || 0;
      renderAll();
    }
  });

  $("seg-cards").addEventListener("click", e => {
    const delBtn = e.target.closest("[data-delete]");
    if (!delBtn) return;
    const id = delBtn.dataset.delete;
    state.segments = state.segments.filter(s => s.id !== id);
    renderAll();
  });

  ["rate", "util", "doc"].forEach(k => {
    const sl = $("sens-" + k);
    const vl = $("sens-" + k + "-v");
    if (sl && vl) {
      sl.addEventListener("input", () => {
        vl.textContent = (sl.value >= 0 ? "+" : "") + sl.value + "%";
        state.sens[k] = parseInt(sl.value, 10) || 0;
        recompute();
      });
    }
  });

  /* Ultra Caelum preset: the delivery plan's commercial lines mapped onto
     this tool's segments. Volumes are the tool's base planning defaults
     scaled to the seven-tail Balanced Hybrid fleet (Scenario 2), which
     carries no Cessna 208 Caravan; they are planning estimates,
     not bookings, and every figure stays editable. */
  const UC_PRESET = [
    ["corporateCharter", { aircraft: "Cessna Citation Sovereign+", hours: 900, aircraftValue: 12000000 }],
    ["executiveJet", { aircraft: "Dassault Falcon 7X", hours: 450, aircraftValue: 22000000 }],
    ["jetCard", { aircraft: "Cessna Citation Sovereign+", hours: 200 }],
    ["ngoCharter", { aircraft: "Pilatus PC-12", hours: 500 }],
    ["miningShuttle", { aircraft: "Pilatus PC-12", hours: 600 }],
    ["aeromedical", { aircraft: "Airbus H125", hours: 300 }],
    ["aerialSurvey", { aircraft: "Pilatus PC-12", hours: 350 }],
    ["safariCharter", { aircraft: "Pilatus PC-12", hours: 700 }],
    ["managementFee", { hours: 48 }],
    ["brokerage", {}],
    ["mroLabour", {}],
    ["fboHandling", {}],
    ["hangarage", {}]
  ];
  $("load-uc").addEventListener("click", () => {
    if (state.segments.length && !confirm("Replace the segments on this page with the Ultra Caelum preset?")) return;
    state.segments = UC_PRESET.map(([t, o]) => {
      const seg = makeSegment(t, o);
      if (o.aircraft && !o.aircraftValue) seg.aircraftValue = AIRCRAFT_VALUES[o.aircraft] || 0;
      return seg;
    });
    renderAll();
    $("seg-status").textContent = "Loaded the Ultra Caelum preset: thirteen streams from the delivery plan's commercial lines. Planning estimates, not bookings.";
  });
  $("clear-segs").addEventListener("click", () => {
    if (state.segments.length && !confirm("Remove every segment from this model?")) return;
    state.segments = [];
    renderAll();
  });

  $("btn-save-vf").addEventListener("click", () => {
    try {
      const profile = JKW.read(JKW.PROFILE_KEY);
      const proj = computeProjection(state.segments, { rate: 1, util: 1, doc: 1 });
      const yr1 = proj[0] || { rev: 0, contrib: 0 };
      const tenYr = proj.reduce((a, r) => a + r.contrib, 0);
      const pt = state.cst.programmeTotal || 0;
      const ds = state.cst.annualDebtService || 0;
      const capRecovery = capitalRecovery(pt, ds);
      const ratio = capRecovery > 0 ? tenYr / capRecovery : null;
      const rag = ratio === null ? "idle" : ratio >= 0.8 ? "green" : ratio >= 0.5 ? "amber" : "red";
      profile.revenue = {
        savedAt: new Date().toISOString(),
        yr1Rev: yr1.rev,
        yr1Contrib: yr1.contrib,
        tenYrContrib: tenYr,
        capRecovery,
        ratio,
        rag,
        segCount: state.segments.length
      };
      /* Read-modify-write on the raw profile rather than JKW.saveProfile:
         that helper normalises the profile down to its four declared
         fields, which would drop this key on the next tool to touch it.
         reportingWrite so a refused write is surfaced, not swallowed. */
      const ok = reportingWrite(() =>
        localStorage.setItem(JKW.PROFILE_KEY, JSON.stringify(profile)));
      $("save-status").textContent = ok === false
        ? "Could not save \u2014 storage is blocked in this browser."
        : "Saved to venture file.";
      setTimeout(() => { $("save-status").textContent = ""; }, 3000);
    } catch (e) {
      $("save-status").textContent = "Could not save.";
    }
  });

  $("btn-export-json").addEventListener("click", () => {
    const proj = computeProjection(state.segments, { rate: 1, util: 1, doc: 1 });
    const data = { exportedAt: new Date().toISOString(), segments: state.segments, projection: proj };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "revenue-model.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  $("btn-print").addEventListener("click", () => window.print());
  $("import-fleet").addEventListener("click", importFleet);

  ["rate", "util", "doc"].forEach(k => {
    const sl = $("sens-" + k);
    const vl = $("sens-" + k + "-v");
    if (sl) sl.value = state.sens[k] || 0;
    if (vl) vl.textContent = ((state.sens[k] || 0) >= 0 ? "+" : "") + (state.sens[k] || 0) + "%";
  });

  mountPrintHead("Revenue Model Builder");
  renderAll();

  const href = toolMailto("Revenue", "Revenue model", "I would like help building a bankable revenue model.");
  $("cta-mail").href = href;
  wireToolEnquiryForm("rev-enquiry", "Revenue Model Builder");
})();
