/* ============================================================
   DN CONSULTANCY — Results page logic
   Strategic gap report: health index, domain gap table, radar,
   "Next Steps: From Diagnosis to Solution" prescriber, and the
   DN-Engagement-Key-gated Toolboxes B/C/D.
   ============================================================ */

(function () {
  /* ---- share-link ingestion: ?s=<base64-encoded answers> ---- */
  const _params = new URLSearchParams(location.search);
  const _sp = _params.get("s");
  const _decoded = _sp ? decodeSharedAnswers(_sp) : null;
  const isShared = Boolean(_decoded);
  const answers = _decoded || loadAnswers();

  if (_params.get("fleet") || _params.get("model")) {
    answers._calibration = {
      fleetType: _params.get("fleet") || (answers._calibration && answers._calibration.fleetType) || "",
      opModel: _params.get("model") || (answers._calibration && answers._calibration.opModel) || ""
    };
  }

  const s = computeScores(answers);
  const empty = document.getElementById("empty");
  const report = document.getElementById("report");

  if (!s.answeredAll) { empty.style.display = "block"; report.style.display = "none"; return; }
  empty.style.display = "none"; report.style.display = "block";

  const partnerQS = (() => { const p = new URLSearchParams(location.search).get("partner");
    return p ? "?partner=" + encodeURIComponent(p) : ""; })();

  /* ---- shareable URL (preserves existing params, adds ?s= & calibration) ---- */
  const shareURL = (() => {
    const p = new URLSearchParams(location.search);
    p.set("s", encodeAnswers(answers));
    if (s.calibration && s.calibration.fleetType) p.set("fleet", s.calibration.fleetType);
    if (s.calibration && s.calibration.opModel) p.set("model", s.calibration.opModel);
    return location.origin + location.pathname + "?" + p.toString();
  })();

  /* ---- shared-report banner (shown when opened via a share link) ---- */
  if (isShared) {
    const sb = document.getElementById("shared-banner");
    if (sb) {
      sb.style.display = "flex";
      sb.querySelector("a").href = "diagnostic.html" + partnerQS;
    }
    const ec = document.getElementById("email-capture-section");
    if (ec) ec.style.display = "none";
  }

  /* ---- health index ring ---- */
  const v = indexVerdict(s.index);
  const ring = document.getElementById("index-ring");
  ring.style.setProperty("--p", s.index);
  ring.style.setProperty("--ring-color",
    s.index < 45 ? "var(--dn-red)" : s.index < 65 ? "var(--dn-amber)" : "var(--dn-gold)");
  document.getElementById("index-val").textContent = s.index;
  document.getElementById("index-band").textContent = v.band;
  document.getElementById("index-band").style.color = v.color;
  document.getElementById("index-text").textContent = v.text;

  if (s.calibration && (s.calibration.fleetType || s.calibration.opModel)) {
    const calibEl = document.createElement("div");
    calibEl.style.cssText = "display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);border-radius:999px;padding:4px 14px;font-size:.85rem;color:#fff;margin-top:.6rem";
    calibEl.innerHTML = `🎯 <b>Context Calibrated:</b> ${s.calibration.fleetType || 'Standard Fleet'} · ${s.calibration.opModel || 'Scheduled Model'}`;
    document.getElementById("index-text")?.parentNode?.appendChild(calibEl);
  }

  /* ---- gap table (sorted weakest-first to read like a findings page) ---- */
  const sorted = [...s.domains].sort((a, b) => a.pct - b.pct);
  const tbody = document.getElementById("gap-body");
  sorted.forEach(d => {
    const tr = document.createElement("tr");
    const bench = d.benchmark
      ? `<div class="bench"><b>Industry:</b> ${d.benchmark} <span class="src">— ${d.benchmarkSrc}</span></div>` : "";
    tr.innerHTML = `
      <td><strong>${d.name}</strong><br><span class="muted" style="font-size:.82rem">${d.blurb}</span>${bench}</td>
      <td>${d.weight}%</td>
      <td class="barcell"><div class="bar"><i class="fill-${d.rag}" style="width:${d.pct}%"></i></div></td>
      <td><strong>${d.pct}%</strong></td>
      <td><span class="rag rag-${d.rag}"><span class="dot"></span>${DN.ragLabel(d.pct)}</span></td>`;
    tbody.appendChild(tr);
  });

  /* ---- radar chart (lightweight inline SVG, no library) ---- */
  drawRadar(document.getElementById("radar"), s.domains);

  /* ---- prescriber: lowest-scoring domains first ---- */
  const rxHost = document.getElementById("rx");
  const weak = sorted.filter(d => d.pct < 65);
  const list = (weak.length ? weak : sorted.slice(0, 3));
  list.forEach(d => {
    const div = document.createElement("div");
    div.className = "rx";
    const fuel = d.fuelLink ? `<div class="dn-tool"><a href="tools/fuel-optimizer.html${partnerQS}">→ Get a quick estimate with our free Fuel Contract Optimizer Lite</a></div>` : "";
    const cask = d.caskLink ? `<div class="dn-tool"><a href="tools/cask-calculator.html${partnerQS}">→ Check your unit cost with our free CASK Benchmarking Calculator</a></div>` : "";
    const canvas = d.canvasLink ? `<div class="dn-tool"><a href="tools/operating-model-canvas.html${partnerQS}">→ Map the whole business with our free Operating Model Canvas</a></div>` : "";
    const std = d.standard ? `<div class="std">Aligns to recognised standard: <strong>${d.standard}</strong></div>` : "";
    div.innerHTML = `
      <h4>${d.name} — ${d.pct}% <span class="rag rag-${d.rag}" style="font-size:.8rem"><span class="dot"></span>${DN.ragLabel(d.pct)}</span></h4>
      <div class="cat">${d.rxCategory}</div>
      ${std}
      <div class="dn-tool">DN diagnostic that goes deeper: ${d.dnTool}</div>
      ${cask}
      ${canvas}
      ${fuel}`;
    rxHost.appendChild(div);
  });

  /* ---- smart tool recommendations based on top 3 gaps ---- */
  const topGaps = sorted.slice(0, 3);
  const relevantTools = new Set();
  topGaps.forEach(d => {
    /* matchAll over the whole string: secondary refs after ";" don't carry
       the "DN " prefix, so the old /^DN\s+([A-Z]\d)/ anchor missed them */
    if (d.dnTool) {
      for (const m of d.dnTool.matchAll(/\b([A-Z]\d)\b/g)) relevantTools.add(m[1]);
    }
  });
  if (relevantTools.size > 0) {
    const recHost = document.createElement("div");
    recHost.className = "dn-rec-panel";
    recHost.style.cssText = "margin-bottom:2rem;padding:1.4rem;background:var(--dn-steel-lt);border-radius:var(--radius);border-left:4px solid var(--accent)";
    recHost.innerHTML = `<p class="eyebrow" style="margin-top:0">Quick wins for your top gaps</p>
      <p style="margin:0.5rem 0;font-weight:600">Based on your ${topGaps.map(d => d.name).join(", ")} scores, these tools will give you quick insights:</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-top:1rem" id="rec-tools"></div>`;
    /* insert before the toolboxes <section>, not inside its .wrap */
    const lockedGrid = document.querySelector(".locked-grid");
    const toolboxSection = lockedGrid && lockedGrid.closest("section");
    if (toolboxSection) toolboxSection.parentElement.insertBefore(recHost, toolboxSection);
    const recToolsHost = document.getElementById("rec-tools");
    DN.toolboxes.forEach(tb => {
      tb.tools.forEach(t => {
        if (relevantTools.has(t.ref)) {
          const c = document.createElement("div");
          c.style.cssText = "padding:0.8rem;background:var(--dn-white);border-radius:var(--radius-sm);font-size:0.85rem";
          c.innerHTML = `<div style="font-weight:700;color:var(--accent);margin-bottom:0.3rem">${t.ref}</div><div style="color:var(--dn-dark);line-height:1.4">${t.n}</div>`;
          recToolsHost.appendChild(c);
        }
      });
    });
  }

  /* ---- locked Toolboxes B/C/D (DN Engagement Key gate) ---- */
  renderToolboxes();
  const unlocked = sessionGet("dn_unlocked") === "1";
  if (unlocked) setUnlocked(true);

  document.getElementById("key-apply").addEventListener("click", () => {
    const val = document.getElementById("key-input").value.trim();
    const msg = document.getElementById("key-msg");
    if (val.toUpperCase() === DN.engagementKey) {
      sessionSet("dn_unlocked", "1"); setUnlocked(true);
      msg.textContent = "Unlocked — full toolbox previews enabled."; msg.className = "keymsg rag-green";
    } else {
      msg.innerHTML = `Invalid key. <a href="mailto:${DN.brand.email}?subject=DN%20Engagement%20Key%20request">Request your DN Engagement Key →</a>`;
      msg.className = "keymsg rag-amber";
    }
  });

  function setUnlocked(on) {
    document.querySelectorAll(".toolcard").forEach(c => {
      if (c.dataset.box === "A") return;
      c.classList.toggle("unlocked", on);
      c.querySelector(".lockicon").innerHTML = on ? "&#10003;" : "&#128274;";
    });
  }

  function openToolPreviewModal(ref, name, box) {
    let existing = document.getElementById("tool-preview-modal");
    if (existing) existing.remove();

    const previews = {
      "B1": {
        title: "B1 — Route Profitability Diagnostic",
        subtitle: "Sample Route P&L & Break-Even Analysis Output",
        content: `
          <div style="background:var(--dn-fog,#F4F4F2);padding:14px;border-radius:8px;margin-bottom:1rem">
            <p style="margin:0 0 8px;font-weight:600;font-size:0.9rem">Sample Output: Route Performance Breakdown</p>
            <table style="width:100%;font-size:0.84rem;border-collapse:collapse;background:#fff">
              <thead><tr style="background:var(--dn-steel-lt);text-align:left"><th style="padding:6px">Route</th><th>ASK (k)</th><th>LF (%)</th><th>Contribution</th><th>Break-Even LF</th><th>Status</th></tr></thead>
              <tbody>
                <tr style="border-bottom:1px solid #eee"><td style="padding:6px">NBO – MBA</td><td>1,240</td><td>78.4%</td><td style="color:var(--dn-green)">+$14,200/mo</td><td>62.0%</td><td><span style="color:var(--dn-green)">● Profitable</span></td></tr>
                <tr style="border-bottom:1px solid #eee"><td style="padding:6px">NBO – EBB</td><td>2,100</td><td>61.2%</td><td style="color:var(--dn-red)">-$8,400/mo</td><td>68.5%</td><td><span style="color:var(--dn-red)">● Deficit</span></td></tr>
                <tr><td style="padding:6px">NBO – JNB</td><td>5,800</td><td>71.0%</td><td style="color:var(--dn-green)">+$42,100/mo</td><td>65.0%</td><td><span style="color:var(--dn-green)">● Profitable</span></td></tr>
              </tbody>
            </table>
          </div>
          <p style="font-size:0.88rem;color:#555">Quantifies route contribution margin, direct operating costs, and revenue break-even point for every sector in your network during Phase 2 of a DN engagement.</p>`
      },
      "B2": {
        title: "B2 — Staff Cost Efficiency Analyser",
        subtitle: "Sample Crew Efficiency & Headcount Benchmarking Output",
        content: `
          <div style="background:var(--dn-fog,#F4F4F2);padding:14px;border-radius:8px;margin-bottom:1rem">
            <p style="margin:0 0 8px;font-weight:600;font-size:0.9rem">Sample Output: Labour Ratio & Crew Utilization Audit</p>
            <div style="font-size:0.85rem;line-height:1.6">
              <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #ddd"><span>Flight Deck Crew Ratio</span><b>5.4 crews / aircraft (Peer Benchmark: 4.8)</b></div>
              <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #ddd"><span>Cabin Crew Monthly Utilization</span><b style="color:var(--dn-amber)">62 block hrs/mo (DN Target: 75 hrs)</b></div>
              <div style="display:flex;justify-content:space-between;padding:4px 0"><span>Identified Annual Labour Efficiency Gain</span><b style="color:var(--dn-green)">$240,000 / year</b></div>
            </div>
          </div>
          <p style="font-size:0.88rem;color:#555">Audits crew pairing efficiency, roster productivity, and staff-to-aircraft ratios across all operational departments.</p>`
      },
      "B3": {
        title: "B3 — Fleet Utilisation & Turn-Time Audit",
        subtitle: "Sample Maintenance Breakdown & Fleet Availability Output",
        content: `
          <div style="background:var(--dn-fog,#F4F4F2);padding:14px;border-radius:8px;margin-bottom:1rem">
            <p style="margin:0 0 8px;font-weight:600;font-size:0.9rem">Sample Output: Fleet Utilization & Maintenance Cost Audit</p>
            <div style="font-size:0.85rem;line-height:1.6">
              <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #ddd"><span>Average Daily Block Hours</span><b>6.2 hrs/day (Target: 8.5 hrs)</b></div>
              <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #ddd"><span>Ground Turnaround Time (Turn-Time)</span><b style="color:var(--dn-amber)">68 mins (Benchmark: 45 mins)</b></div>
              <div style="display:flex;justify-content:space-between;padding:4px 0"><span>Direct Maintenance Cost / Block Hr</span><b>$1,280 (Peer Average: $1,050)</b></div>
            </div>
          </div>
          <p style="font-size:0.88rem;color:#555">Pinpoints ground turn-time bottlenecks, unscheduled maintenance downtime, and direct flight-hour maintenance expense.</p>`
      },
      "B4": {
        title: "B4 — Safety Culture Maturity Assessment",
        subtitle: "Sample ICAO SMS 5-Level Maturity Audit & Compliance Report",
        content: `
          <div style="background:var(--dn-fog,#F4F4F2);padding:14px;border-radius:8px;margin-bottom:1rem">
            <p style="margin:0 0 8px;font-weight:600;font-size:0.9rem">Sample Output: SMS Maturity Matrix (ICAO Annex 19)</p>
            <div style="font-size:0.85rem;line-height:1.6">
              <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #ddd"><span>Level 1 & 2 (Reactive Safety Management)</span><b style="color:var(--dn-green)">100% Compliant</b></div>
              <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #ddd"><span>Level 3 (Proactive Hazard Identification)</span><b style="color:var(--dn-amber)">65% Compliant</b></div>
              <div style="display:flex;justify-content:space-between;padding:4px 0"><span>Level 4 & 5 (Predictive & Continuous Improvement)</span><b style="color:var(--dn-red)">25% Compliant (Priority Gap)</b></div>
            </div>
          </div>
          <p style="font-size:0.88rem;color:#555">Evaluates safety reporting culture, KCAA/ICAO finding closure rates, and predictive hazard analytics readiness.</p>`
      },
      "B5": {
        title: "B5 — Revenue Mix Diagnostic",
        subtitle: "Sample Ancillary & Yield Diversification Gap Output",
        content: `
          <div style="background:var(--dn-fog,#F4F4F2);padding:14px;border-radius:8px;margin-bottom:1rem">
            <p style="margin:0 0 8px;font-weight:600;font-size:0.9rem">Sample Output: Ancillary & Distribution Yield Breakdown</p>
            <div style="font-size:0.85rem;line-height:1.6">
              <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #ddd"><span>Ancillary Revenue per Pax</span><b>$5.80 (IATA Regional Benchmark: $18.50)</b></div>
              <div style="display:flex;justify-content:space-between;padding:4px 0"><span>Direct Web/App Distribution Share</span><b style="color:var(--dn-amber)">28% (Target: ≥ 55%)</b></div>
            </div>
          </div>
          <p style="font-size:0.88rem;color:#555">Uncovers unbundled merchandising, belly-cargo monetization, and direct distribution margin opportunities.</p>`
      },
      "C1": {
        title: "C1 — 90-Day Sprint Template",
        subtitle: "Sample Transformation Roadmap & Execution Charter",
        content: `
          <div style="background:var(--dn-fog,#F4F4F2);padding:14px;border-radius:8px;margin-bottom:1rem">
            <p style="margin:0 0 8px;font-weight:600;font-size:0.9rem">Sample Output: 90-Day Sprint Milestones & Targets</p>
            <ul style="font-size:0.85rem;margin:0;padding-left:18px;line-height:1.6">
              <li><b>Days 1–30:</b> Quick wins (Fuel tankering policy, turn-time standardization, AOG escalation).</li>
              <li><b>Days 31–60:</b> Structural fixes (Route P&L adjustments, crew roster optimization, supplier renegotiation).</li>
              <li><b>Days 61–90:</b> KPI institutionalization & final board-verified ROI audit.</li>
            </ul>
          </div>
          <p style="font-size:0.88rem;color:#555">A fully staffed and budgeted transformation roadmap delivered at the end of Phase 3.</p>`
      },
      "C3": {
        title: "C3 — Board Presentation Template",
        subtitle: "Sample Executive Findings & Board Presentation Deck",
        content: `
          <div style="background:var(--dn-fog,#F4F4F2);padding:14px;border-radius:8px;margin-bottom:1rem">
            <p style="margin:0 0 8px;font-weight:600;font-size:0.9rem">Sample Output: 8-Slide Board Structure</p>
            <div style="font-size:0.84rem;color:#333;line-height:1.5">
              1. Executive Health Baseline · 2. Sized Financial & Operational Gaps · 3. Route Contribution Heatmap · 4. CASK Disadvantage Sizing · 5. 90-Day Sprint Plan & Budgets · 6. KPI Governance Matrix.
            </div>
          </div>
          <p style="font-size:0.88rem;color:#555">Ready-to-present board deck synthesizing all Phase 2 diagnostic findings into clear decision rights.</p>`
      },
      "D1": {
        title: "D1 — AOC Startup Readiness Checklist",
        subtitle: "Sample 30-Item Regulatory Compliance Tracker",
        content: `
          <div style="background:var(--dn-fog,#F4F4F2);padding:14px;border-radius:8px;margin-bottom:1rem">
            <p style="margin:0 0 8px;font-weight:600;font-size:0.9rem">Sample Output: 5-Phase AOC Certification Tracker</p>
            <div style="font-size:0.85rem;line-height:1.6">
              <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #ddd"><span>Phase 1 & 2 (Pre-Application & Formal Application)</span><b style="color:var(--dn-green)">Complete</b></div>
              <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #ddd"><span>Phase 3 (Document Evaluation & Manuals)</span><b style="color:var(--dn-amber)">In Progress (82%)</b></div>
              <div style="display:flex;justify-content:space-between;padding:4px 0"><span>Phase 4 & 5 (Demonstration Flights & Certification)</span><b>Scheduled</b></div>
            </div>
          </div>
          <p style="font-size:0.88rem;color:#555">Structured regulatory checklist for new airline startups or AOC variations under Civil Aviation Authorities.</p>`
      }
    };

    const data = previews[ref] || {
      title: `${ref} — ${name}`,
      subtitle: `Sample Output & Deliverable Framework (Toolbox ${box})`,
      content: `
        <div style="background:var(--dn-fog,#F4F4F2);padding:14px;border-radius:8px;margin-bottom:1rem">
          <p style="margin:0 0 8px;font-weight:600;font-size:0.9rem">Toolbox ${box} Deliverable Preview</p>
          <p style="font-size:0.85rem;margin:0">Full standardized analytical model and report output deployed during a DN Consultancy engagement.</p>
        </div>`
    };

    const modal = document.createElement("div");
    modal.id = "tool-preview-modal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px";
    modal.innerHTML = `
      <div style="background:#fff;border-radius:12px;max-width:680px;width:100%;max-height:90vh;overflow-y:auto;padding:28px;box-shadow:0 20px 50px rgba(0,0,0,0.3);position:relative">
        <button id="modal-close" style="position:absolute;top:16px;right:20px;background:none;border:none;font-size:1.5rem;cursor:pointer;color:#666">&times;</button>
        <span class="eyebrow" style="margin-top:0">Phase 2–5 Deliverable Preview · Toolbox ${box}</span>
        <h2 style="margin:0.2rem 0 0.4rem;font-size:1.35rem;font-family:var(--sans);font-weight:700">${data.title}</h2>
        <p style="color:var(--dn-steel);font-weight:600;margin:0 0 1rem;font-size:0.92rem">${data.subtitle}</p>
        ${data.content}
        <div style="margin-top:1.4rem;padding-top:1rem;border-top:1px solid #eee;display:flex;gap:12px;flex-wrap:wrap;align-items:center;justify-content:space-between">
          <span style="font-size:0.82rem;color:#666">Deployed during Phase 2–5 of a DN engagement</span>
          <button id="modal-req-btn" class="btn btn-gold" style="font-size:0.88rem;padding:0.6rem 1.1rem">Request Engagement Brief →</button>
        </div>
      </div>`;

    document.body.appendChild(modal);

    modal.querySelector("#modal-close").addEventListener("click", () => modal.remove());
    modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
    modal.querySelector("#modal-req-btn").addEventListener("click", () => {
      modal.remove();
      document.getElementById("email-capture-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById("capture-name")?.focus();
    });
  }

  function renderToolboxes() {
    const host = document.getElementById("toolboxes");
    const toolLinks = {
      "A1": "diagnostic.html",
      "A2": "tools/cask-calculator.html",
      "A3": "tools/data-request.html",
      "A4": "tools/operating-model-canvas.html",
      "C5": "tools/training-tna.html"
    };
    DN.toolboxes.forEach(tb => {
      tb.tools.forEach(t => {
        const c = document.createElement(toolLinks[t.ref] ? "a" : "div");
        c.className = "toolcard" + (tb.locked ? " locked" : " unlocked");
        c.dataset.box = tb.box;
        if (toolLinks[t.ref]) {
          c.href = toolLinks[t.ref] + partnerQS;
          c.style.textDecoration = "none";
          c.style.color = "inherit";
        }
        c.innerHTML = `<span class="lockicon">${tb.locked ? "&#128274;" : "&#10003;"}</span>
          <span class="ref">Toolbox ${tb.box} · ${t.ref}</span>
          <h4>${t.n}</h4><p>${t.d}</p>
          <button class="btn-preview-trigger" style="margin-top:0.6rem;background:rgba(74,127,165,.1);border:1px solid var(--accent);color:var(--accent);border-radius:4px;padding:0.3rem 0.65rem;font-size:0.78rem;font-weight:600;cursor:pointer">🔍 Preview Sample Output</button>`;
        
        c.querySelector(".btn-preview-trigger").addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          openToolPreviewModal(t.ref, t.n, tb.box);
        });

        host.appendChild(c);
      });
    });
  }

  /* ---- print-only report date ---- */
  const pd = document.getElementById("print-date");
  if (pd) pd.textContent = new Date().toLocaleDateString("en-GB",
    { day: "numeric", month: "long", year: "numeric" });

  /* ---- actions ---- */
  document.getElementById("retake").addEventListener("click", () => {
    if (confirm("Clear your answers and start over?")) {
      clearAnswers();
      location.href = "diagnostic.html" + partnerQS;
    }
  });
  document.getElementById("print").addEventListener("click", () => {
    window.print();
  });

  /* export data */
  const exportBtn = document.createElement("button");
  exportBtn.className = "btn btn-ghost";
  exportBtn.textContent = "↓ Export data";
  exportBtn.addEventListener("click", () => {
    const now = new Date();
    const exp = { scorecard: answers, index: s.index, domains: s.domains.map(d => ({name: d.name, score: d.pct, rag: d.rag})), timestamp: now.toISOString() };
    const blob = new Blob([JSON.stringify(exp, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dn-scorecard-${now.toISOString().split("T")[0]}.json`;
    /* append to DOM so Firefox/mobile WebViews honour the click;
       defer revoke so the browser has time to read the blob */
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  });
  const actionParent = document.getElementById("print") && document.getElementById("print").parentElement;
  if (actionParent) {
    actionParent.appendChild(exportBtn);
  }

  /* ---- share bar: WhatsApp · LinkedIn · copy link ---- */
  const shareBar = document.getElementById("share-bar");
  if (shareBar) {
    const shareMsg = `I just ran the Airline Health Scorecard — health index ${s.index}/100. Top gaps: ${sorted.slice(0, 2).map(d => `${d.name} (${d.pct}%)`).join(", ")}. Full report:`;

    const waA = document.createElement("a");
    waA.className = "share-btn share-btn-wa";
    waA.textContent = "Share via WhatsApp";
    waA.href = "https://wa.me/?text=" + encodeURIComponent(shareMsg + " " + shareURL);
    waA.target = "_blank"; waA.rel = "noopener";

    const liA = document.createElement("a");
    liA.className = "share-btn share-btn-li";
    liA.textContent = "Share on LinkedIn";
    liA.href = "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(shareURL);
    liA.target = "_blank"; liA.rel = "noopener";

    const copyBtn = document.createElement("button");
    copyBtn.className = "share-btn share-btn-copy";
    copyBtn.textContent = "Copy link";
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(shareURL);
        copyBtn.textContent = "✓ Copied";
      } catch {
        copyBtn.textContent = shareURL.slice(0, 40) + "…";
      }
      setTimeout(() => { copyBtn.textContent = "Copy link"; }, 2200);
    });

    shareBar.appendChild(waA);
    shareBar.appendChild(liA);
    shareBar.appendChild(copyBtn);
  }

  /* ---- email capture (Netlify Forms via fetch) ---- */
  if (sessionGet("dn_report_sent") === "1") {
    const ec = document.getElementById("email-capture-section");
    if (ec) ec.style.display = "none";
  }
  const captureForm = document.getElementById("capture-form");
  if (captureForm) {
    captureForm.addEventListener("submit", async e => {
      e.preventDefault();
      const nameEl = document.getElementById("capture-name");
      const emailEl = document.getElementById("capture-email");
      const airlineEl = document.getElementById("capture-airline");
      const fleetEl = document.getElementById("capture-fleet");
      const msg = document.getElementById("capture-msg");
      const submitBtn = captureForm.querySelector("button[type='submit']");
      const email = emailEl ? emailEl.value.trim() : "";
      if (!email) { if (emailEl) emailEl.focus(); return; }
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";
      try {
        const body = new URLSearchParams({
          "form-name": "scorecard-report",
          "bot-field": "",
          name: nameEl ? nameEl.value.trim() : "",
          email,
          airline: airlineEl ? airlineEl.value.trim() : "",
          fleet_size: fleetEl ? fleetEl.value : "",
          health_index: String(s.index),
          top_gaps: sorted.slice(0, 3).map(d => `${d.name} (${d.pct}%)`).join(", "),
          share_url: shareURL
        });
        const resp = await fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString()
        });
        if (!resp.ok) throw new Error(resp.status);
        msg.textContent = "✓ Sent — your Executive Brief & 90-Day Roadmap will arrive in your inbox.";
        msg.style.color = "var(--dn-green)";
        submitBtn.textContent = "✓ Executive Brief Requested";
        sessionSet("dn_report_sent", "1");
      } catch {
        msg.innerHTML = `Could not send — email us at <a href="mailto:${DN.brand.email}">${DN.brand.email}</a>`;
        msg.style.color = "var(--dn-red)";
        submitBtn.disabled = false;
        submitBtn.textContent = "Send Executive Brief & Roadmap (PDF) →";
      }
    });
  }

  /* ---- book-a-call: mailto pre-filled + copy-link ---- */
  const bookEmailBtn = document.getElementById("book-email-btn");
  if (bookEmailBtn) {
    const gapSummary = sorted.slice(0, 3).map(d => `${d.name} (${d.pct}%)`).join(", ");
    bookEmailBtn.href = `mailto:${DN.brand.email}` +
      `?subject=${encodeURIComponent("DN Engagement — following my health scorecard")}` +
      `&body=${encodeURIComponent(
        `Hello,\n\nI have just completed the Airline Health Scorecard.\n\n` +
        `Health Index: ${s.index}/100\nTop gaps: ${gapSummary}\n\n` +
        `I would like to discuss how a DN engagement could help us close these gaps.\n\n` +
        `Full report: ${shareURL}`
      )}`;
  }
  const bookCopyBtn = document.getElementById("book-copy-btn");
  if (bookCopyBtn) {
    bookCopyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(shareURL);
        bookCopyBtn.textContent = "✓ Link copied";
      } catch {
        bookCopyBtn.textContent = "Copy failed";
      }
      setTimeout(() => { bookCopyBtn.textContent = "Copy report link"; }, 2200);
    });
  }

  /* ---- capture nudge: slide-in bar once the reader is 60% through the
     report — engaged readers convert far better than a footer form.
     Skipped for shared views, after a send, or once dismissed. ---- */
  if (!isShared && sessionGet("dn_report_sent") !== "1"
      && sessionGet("dn_capture_nudged") !== "1") {
    const nudge = document.createElement("div");
    nudge.id = "capture-nudge";
    nudge.style.cssText = "position:fixed;left:0;right:0;bottom:-90px;z-index:60;background:var(--dn-dark,#1F3044);color:#fff;padding:12px 18px;display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;box-shadow:0 -6px 24px rgba(0,0,0,.25);transition:bottom .35s ease";
    nudge.innerHTML = `<span style="font-size:.95rem">📧 Want this report in your inbox, with benchmark notes?</span>
      <button id="nudge-go" class="btn btn-gold" style="padding:.5rem 1rem">Email me my report</button>
      <button id="nudge-x" aria-label="Dismiss" style="background:none;border:0;color:#fff;font-size:1.2rem;cursor:pointer;opacity:.7">✕</button>`;
    document.body.appendChild(nudge);
    let shown = false;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      if (!shown && max > 0 && scrollY / max >= 0.6) {
        shown = true;
        nudge.style.bottom = "0px";
        removeEventListener("scroll", onScroll);
      }
    };
    addEventListener("scroll", onScroll, { passive: true });
    const dismiss = () => {
      nudge.remove();
      removeEventListener("scroll", onScroll);
      sessionSet("dn_capture_nudged", "1");
    };
    nudge.querySelector("#nudge-x").addEventListener("click", dismiss);
    nudge.querySelector("#nudge-go").addEventListener("click", () => {
      document.getElementById("email-capture-section")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById("capture-email")?.focus({ preventScroll: true });
      dismiss();
    });
  }

  /* ---- executive summary: rule-based prose from the scores ---- */
  const execEl = document.getElementById("exec-summary");
  if (execEl) {
    const weakest = sorted[0], second = sorted[1], strongest = sorted[sorted.length - 1];
    execEl.innerHTML =
      `<p>This assessment places the airline at a Health Index of <b>${s.index}/100</b> — ` +
      `<b>${v.band.toLowerCase()}</b>. The widest gaps are in <b>${weakest.name}</b> (${weakest.pct}%) ` +
      `and <b>${second.name}</b> (${second.pct}%); together these carry ${weakest.weight + second.weight}% ` +
      `of the weighted index, so improvement here moves the overall position fastest. ` +
      `The strongest domain is <b>${strongest.name}</b> (${strongest.pct}%), which provides a stable ` +
      `platform to fund and manage change. The recommended entry point is a focused diagnostic sprint ` +
      `on ${weakest.name.toLowerCase()}, using the toolset prescribed in the next-steps section below.</p>`;
  }

  /* ---- debrief request (Netlify Forms via fetch, mirrors capture form) ---- */
  const dbForm = document.getElementById("debrief-form");
  if (dbForm) dbForm.addEventListener("submit", async e => {
    e.preventDefault();
    const msg = document.getElementById("db-msg");
    const btn = dbForm.querySelector("button[type='submit']");
    btn.disabled = true; btn.textContent = "Sending…";
    try {
      const body = new URLSearchParams({
        "form-name": "debrief-request", "bot-field": "",
        name: document.getElementById("db-name").value.trim(),
        email: document.getElementById("db-email").value.trim(),
        airline: document.getElementById("db-airline").value.trim(),
        role: document.getElementById("db-role").value.trim(),
        preferred_week: document.getElementById("db-week").value.trim(),
        health_index: String(s.index),
        top_gaps: sorted.slice(0, 3).map(d => `${d.name} (${d.pct}%)`).join(", "),
        share_url: shareURL
      });
      const resp = await fetch("/", { method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() });
      if (!resp.ok) throw new Error(resp.status);
      dbForm.style.display = "none";
      msg.textContent = "✓ Request received — a DN consultant will confirm your slot within 24 hours.";
      msg.style.color = "var(--dn-green)";
    } catch {
      msg.innerHTML = `Could not send — email us at <a href="mailto:${DN.brand.email}">${DN.brand.email}</a>`;
      msg.style.color = "var(--dn-red)";
      btn.disabled = false; btn.textContent = "Request my debrief →";
    }
  });

  /* ---- data-as-of stamp ---- */
  const asofEl = document.getElementById("bench-asof");
  if (asofEl && DN.benchmarkMeta) asofEl.textContent = DN.benchmarkMeta.asOf;

  /* ---- optional CSV calibration (all client-side) ----
     4 figures in, 3 derived metrics out, compared against the regional
     benchmarks already cited in the report. Nothing leaves the browser. */
  const tpl = document.getElementById("csv-template");
  if (tpl) tpl.href = "data:text/csv;charset=utf-8," + encodeURIComponent(
    "total_ask,total_rpk,total_opex_usd,fuel_cost_usd\n" +
    "1200000000,890000000,110000000,42000000\n");
  const csvIn = document.getElementById("csv-file");
  if (csvIn) csvIn.addEventListener("change", () => {
    const out = document.getElementById("calib-out");
    const fail = m => { out.innerHTML = `<p style="color:var(--dn-red)">${m}</p>`; };
    const f = csvIn.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const rows = rd.result.trim().split(/\r?\n/).map(r => r.split(",").map(c => c.trim()));
      if (rows.length < 2) return fail("The file needs a header row and one data row — use the template above.");
      const hdr = rows[0].map(h => h.toLowerCase());
      const need = ["total_ask", "total_rpk", "total_opex_usd", "fuel_cost_usd"];
      const idx = need.map(n => hdr.indexOf(n));
      if (idx.some(i => i < 0)) return fail("Missing column(s): " + need.filter((n, i) => idx[i] < 0).join(", ") + ". Use the template headers exactly.");
      const v = idx.map(i => parseFloat(rows[1][i]));
      if (v.some(x => !isFinite(x) || x <= 0)) return fail("All four values must be positive numbers.");
      const [ask, rpk, opex, fuel] = v;
      if (rpk > ask) return fail("RPK cannot exceed ASK — please check the figures.");
      if (fuel > opex) return fail("Fuel cost cannot exceed total operating cost.");
      const lf = rpk / ask * 100, cask = opex / ask * 100, fs = fuel / opex * 100;
      const cmp = (val, bench, higherIsGood, note) => {
        const diff = val - bench;
        const good = higherIsGood ? diff > 0 : diff < 0;
        const col = Math.abs(diff) < 3 ? "var(--dn-amber)" : good ? "var(--dn-green)" : "var(--dn-red)";
        return `<span style="color:${col};font-weight:600">${diff > 0 ? "+" : ""}${diff.toFixed(1)} pts vs ${note}</span>`;
      };
      out.innerHTML = `
        <div class="guarantee" style="align-items:flex-start">
          <div style="width:100%">
            <p class="eyebrow" style="margin-top:0">Data-calibrated view <span style="background:var(--dn-green);color:#fff;border-radius:999px;padding:1px 10px;font-size:.72rem;margin-left:6px">✓ computed from your figures</span></p>
            <table style="width:100%;border-collapse:collapse;font-size:.94rem">
              <tr><td style="padding:6px 0"><b>Passenger load factor</b></td><td>${lf.toFixed(1)}%</td>
                  <td>${cmp(lf, 74.5, true, "the 74.5% African average (AFRAA 2024)")}</td></tr>
              <tr><td style="padding:6px 0"><b>Unit cost (CASK)</b></td><td>${cask.toFixed(2)} US¢</td>
                  <td><a href="tools/cask-calculator.html${partnerQS}">benchmark in detail with the CASK calculator →</a></td></tr>
              <tr><td style="padding:6px 0"><b>Fuel share of opex</b></td><td>${fs.toFixed(1)}%</td>
                  <td>${cmp(fs, 40, false, "the ~40% African average (IATA 2025)")}</td></tr>
            </table>
            <p style="font-size:.92rem;margin:.8rem 0 0"><b>Positioning:</b> a ${lf.toFixed(1)}% load factor places you in roughly the
              <b>${lf >= 78 ? "top third" : lf >= 70 ? "middle third" : "bottom third"}</b> of African carriers, and a ${fs.toFixed(1)}% fuel share in the
              <b>${fs <= 33 ? "top third" : fs <= 43 ? "middle third" : "bottom third"}</b> on fuel-cost discipline
              <span class="muted" style="font-size:.8rem">(indicative terciles derived from AFRAA/IATA regional aggregates)</span>.</p>
            <p class="muted" style="font-size:.82rem;margin:.7rem 0 0">These figures calibrate your <b>Cost &amp; Fuel Efficiency</b> and <b>Revenue &amp; Yield Management</b> scores — self-reported ratings in those domains can now be read against measured data. Processed locally; your file was not uploaded.</p>
          </div>
        </div>`;
    };
    rd.onerror = () => fail("Could not read the file.");
    rd.readAsText(f);
  });
})();


/* ---- share-link encode / decode ----
   Serialises the 40 answers (0-4 per question, 'x' if unanswered) into a
   compact base64 string so results can be shared via URL (?s=...). */
function encodeAnswers(answers) {
  return btoa(DN.domains.map(d =>
    d.questions.map((_, qi) => {
      const v = (answers[d.id] || [])[qi];
      return Number.isInteger(v) ? String(v) : "x";
    }).join("")
  ).join(""));
}

function decodeSharedAnswers(encoded) {
  try {
    const str = atob(encoded);
    const expected = DN.domains.reduce((n, d) => n + d.questions.length, 0);
    if (str.length !== expected || !/^[0-4x]+$/.test(str)) return null;
    let pos = 0;
    const out = {};
    for (const d of DN.domains) {
      out[d.id] = d.questions.map(() => {
        const c = str[pos++];
        return c === "x" ? undefined : parseInt(c, 10);
      });
    }
    return out;
  } catch { return null; }
}
