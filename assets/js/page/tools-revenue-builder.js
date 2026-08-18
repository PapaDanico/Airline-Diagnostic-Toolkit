(function () {
  applyPartner(); mountChrome();

  const $ = id => document.getElementById(id);
  const STORE_KEY = "jk_revenue_v1";
  const REVENUE_SEGMENTS = {
    executiveJet: {
      label: "Executive Jet Charter",
      aircraft: ["Dassault Falcon 7X", "Cessna Citation Sovereign", "Gulfstream G280"],
      rateBands: { low: 7500, base: 9000, high: 12000 },
      docBands: { low: 4200, base: 5250, high: 6800 },
      utilBands: { conservative: 300, base: 500, optimistic: 750 },
      seasonality: [0.7, 0.8, 0.9, 1.0, 1.1, 1.0, 0.9, 0.8, 0.9, 1.0, 1.1, 1.2]
    },
    safariCharter: {
      label: "Safari / Tourism Charter",
      aircraft: ["Cessna C208 Caravan", "Cessna C206", "Pilatus PC-12"],
      rateBands: { low: 900, base: 1200, high: 1600 },
      docBands: { low: 400, base: 550, high: 750 },
      utilBands: { conservative: 400, base: 600, optimistic: 900 },
      seasonality: [0.9, 0.9, 1.0, 1.1, 1.2, 1.1, 1.0, 0.8, 0.7, 0.9, 1.0, 1.1]
    },
    aeromedical: {
      label: "Aeromedical / HEMS Retainer",
      aircraft: ["Airbus H125", "Airbus AS355", "Bell 407"],
      rateBands: { low: 1500, base: 2200, high: 3000 },
      docBands: { low: 700, base: 950, high: 1300 },
      utilBands: { conservative: 200, base: 400, optimistic: 600 },
      seasonality: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
      retainerBands: { low: 25000, base: 45000, high: 80000 }
    },
    acmiWetLease: {
      label: "ACMI / Wet Lease",
      aircraft: ["ATR 72-600", "Embraer E190", "Boeing 737-800"],
      rateBands: { low: 3500, base: 5000, high: 7500 },
      docBands: { low: 2200, base: 3200, high: 4800 },
      utilBands: { conservative: 800, base: 1200, optimistic: 1800 },
      seasonality: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]
    }
  };
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
    "Boeing 737-800": 45000000
  };

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
  }
  function saveState(st) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(st)); } catch {}
  }

  let state = loadState();
  if (!Array.isArray(state.segments)) state.segments = [];
  if (!state.sens) state.sens = { rate: 0, util: 0, doc: 0 };
  if (!state.cst) state.cst = { programmeTotal: 0, annualDebtService: 0, margin: 35 };

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

  function segmentAnnualRevenue(seg, sensAdj) {
    const sa = sensAdj || { rate: 1, util: 1, doc: 1 };
    const cfg = REVENUE_SEGMENTS[seg.type];
    if (!cfg) return { rev: 0, doc: 0 };

    const rate = (parseFloat(seg.rate) || 0) * sa.rate;
    const doc = (parseFloat(seg.doc) || 0) * sa.doc;
    const hours = (parseFloat(seg.hours) || 0) * sa.util;
    const mix = mixShares(seg);

    let annualRev;
    if (cfg.retainerBands && mix.retainer > 0) {
      const retainerMonthly = parseFloat(seg.retainerAmt) || cfg.retainerBands.base;
      annualRev = (retainerMonthly * 12) + (rate * hours);
    } else {
      annualRev = (rate * hours * mix.adHoc) + (rate * hours * mix.blockHours * 0.85) + (rate * hours * mix.retainer * 0.85);
    }
    const annualDoc = doc * hours;
    return { rev: annualRev, doc: annualDoc };
  }

  function year1Revenue(seg, sensAdj) {
    const cfg = REVENUE_SEGMENTS[seg.type];
    if (!cfg) return { rev: 0, doc: 0 };
    const sa = sensAdj || { rate: 1, util: 1, doc: 1 };
    const rate = (parseFloat(seg.rate) || 0) * sa.rate;
    const doc = (parseFloat(seg.doc) || 0) * sa.doc;
    const hours = (parseFloat(seg.hours) || 0) * sa.util;
    const mix = mixShares(seg);

    const avgSeasonality = cfg.seasonality.reduce((a, b) => a + b, 0) / 12;
    let totalRev = 0, totalDoc = 0;
    cfg.seasonality.forEach(sf => {
      const monthHours = (hours / 12) * (sf / avgSeasonality);
      if (cfg.retainerBands && mix.retainer > 0) {
        const retainerMonthly = parseFloat(seg.retainerAmt) || cfg.retainerBands.base;
        totalRev += retainerMonthly + (rate * monthHours);
      } else {
        totalRev += (rate * monthHours * mix.adHoc) + (rate * monthHours * mix.blockHours * 0.85) + (rate * monthHours * mix.retainer * 0.85);
      }
      totalDoc += doc * monthHours;
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

  function renderCapitalServiceTest(tenYrContrib) {
    const host = $("cst-banner");
    if (!host) return;
    const pt = state.cst.programmeTotal || 0;
    const ds = state.cst.annualDebtService || 0;
    if (!pt && !ds) { host.innerHTML = ""; return; }

    const margin = (state.cst.margin || 35) / 100;
    const capRecovery = (pt / margin) + (ds * 10 / margin);
    const ratio = tenYrContrib > 0 ? tenYrContrib / capRecovery : 0;

    let cls, msg;
    if (ratio >= 0.8) {
      cls = "note ok";
      msg = `<b>✓ This fleet can service its capital</b>10-year contribution of ${fmtMoney(tenYrContrib)} covers ${(ratio * 100).toFixed(0)}% of the capital recovery requirement of ${fmtMoney(capRecovery)}.`;
    } else if (ratio >= 0.5) {
      cls = "note warn";
      msg = `<b>⚠ This fleet is marginal</b>10-year contribution of ${fmtMoney(tenYrContrib)} covers ${(ratio * 100).toFixed(0)}% of ${fmtMoney(capRecovery)}. Contracted demand or lease structure recommended.`;
    } else {
      const shortfall = ratio > 0 ? (1 / ratio).toFixed(1) : "∞";
      cls = "note";
      msg = `<b>✗ This fleet cannot service its capital</b>10-year contribution of ${fmtMoney(tenYrContrib || 0)} covers only ${(ratio * 100).toFixed(0)}% of the ${fmtMoney(capRecovery)} capital recovery requirement — a ${shortfall}× shortfall. Reduce fleet, lease rather than own, or secure anchor contracts.`;
    }

    const style = ratio < 0.5 ? ` style="border-left-color:var(--jk-red);background:var(--jk-parchment)"` : "";
    host.innerHTML = `<div class="${cls}"${style}>${msg}</div>
      <div style="margin-top:.8rem;font-size:var(--fs-xs);color:var(--jk-muted)">
        Capital recovery requirement = programme total + (annual debt service × 10).
        <a href="#" id="cst-edit-toggle">Edit programme figures ▾</a>
      </div>
      <div id="cst-inputs" style="display:none;margin-top:.8rem">
        <div class="field-row">
          <div class="field"><label for="cst-pt">Programme total (USD)</label>
            <input type="number" id="cst-pt" min="0" step="1000000" value="${pt}"></div>
          <div class="field"><label for="cst-ds">Annual debt service (USD)</label>
            <input type="number" id="cst-ds" min="0" step="100000" value="${ds}"></div>
        </div>
        <div class="field"><label for="cst-margin-in">Contribution margin (%)</label>
          <input type="number" id="cst-margin-in" min="5" max="80" step="1" value="${state.cst.margin || 35}" style="max-width:140px"></div>
      </div>`;

    const tog = $("cst-edit-toggle");
    if (tog) {
      tog.addEventListener("click", e => {
        e.preventDefault();
        const box = $("cst-inputs");
        box.style.display = box.style.display === "none" ? "block" : "none";
        tog.textContent = box.style.display === "none" ? "Edit programme figures ▾" : "Edit programme figures ▴";
      });
    }
    ["cst-pt", "cst-ds", "cst-margin-in"].forEach(id => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", () => {
        if (id === "cst-pt") state.cst.programmeTotal = parseFloat(el.value) || 0;
        else if (id === "cst-ds") state.cst.annualDebtService = parseFloat(el.value) || 0;
        else if (id === "cst-margin-in") state.cst.margin = parseFloat(el.value) || 35;
        saveState(state);
        recompute();
      });
    });
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
      if (!cfg) return;
      const contrib = (parseFloat(seg.rate) || 0) - (parseFloat(seg.doc) || 0);
      if (contrib <= 0) return;
      const aircraftVal = parseFloat(seg.aircraftValue) || AIRCRAFT_VALUES[seg.aircraft] || 5000000;
      const ownCapCharge = annualDebtService(aircraftVal, 12, 10);
      const leaseMonthlyRate = seg.type === "aeromedical" ? 0.011 : 0.010;
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
    const cfg = REVENUE_SEGMENTS[type];
    const seg = {
      id: newId(),
      type,
      aircraft: cfg.aircraft[0],
      rate: cfg.rateBands.base,
      doc: cfg.docBands.base,
      hours: cfg.utilBands.base,
      adHoc: type === "aeromedical" ? 0 : 100,
      blockHours: 0,
      retainer: type === "aeromedical" ? 100 : 0,
      retainerAmt: cfg.retainerBands ? cfg.retainerBands.base : 0,
      aircraftValue: AIRCRAFT_VALUES[cfg.aircraft[0]] || 0
    };
    state.segments.push(seg);
    renderAll();
  });

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

  $("btn-save-vf").addEventListener("click", () => {
    try {
      const profile = JSON.parse(localStorage.getItem("jk_venture_file_v3") || "{}");
      const proj = computeProjection(state.segments, { rate: 1, util: 1, doc: 1 });
      const yr1 = proj[0] || { rev: 0, contrib: 0 };
      const tenYr = proj.reduce((a, r) => a + r.contrib, 0);
      const pt = state.cst.programmeTotal || 0;
      const ds = state.cst.annualDebtService || 0;
      const capRecovery = pt + ds * 10;
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
      localStorage.setItem("jk_venture_file_v3", JSON.stringify(profile));
      $("save-status").textContent = "Saved to venture file.";
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
})();
