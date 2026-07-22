/* ============================================================
   DN CONSULTANCY — Scorecard page logic (A1)
   Renders 8 domains × 5 questions, persists to localStorage,
   tracks progress, routes to results.
   ============================================================ */

(function () {
  const answers = loadAnswers();
  const host = document.getElementById("domains");
  const total = DN.domains.reduce((a, d) => a + d.questions.length, 0);

  /* first-time onboarding overlay — wrapped in try/catch so a Safari
     private-browsing SecurityError doesn't abort the IIFE */
  try {
    if (!localStorage.getItem("dn_onboarded")) {
      const overlay = document.createElement("div");
      overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:100;display:flex;align-items:center;justify-content:center";
      overlay.innerHTML = `<div style="background:#fff;border-radius:12px;padding:32px;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,.3)">
        <h2 style="margin:0 0 1rem;font-size:1.4rem">Welcome to the Airline Health Scorecard</h2>
        <p style="color:#666;margin:0 0 1.2rem;line-height:1.6"><strong>40 questions</strong> across 8 domains. Takes ~15 minutes. Your answers stay in your browser — no tracking.</p>
        <button id="onboard-dismiss" style="width:100%;padding:0.85rem;background:#4A7FA5;color:#fff;border:0;border-radius:8px;font-weight:600;cursor:pointer">Got it, let's go →</button>
      </div>`;
      document.body.appendChild(overlay);
      /* scope the lookup to overlay — global getElementById returns the first
         ID match, which a browser extension could steal */
      overlay.querySelector("#onboard-dismiss").addEventListener("click", () => {
        overlay.remove();                                  // remove first …
        try { localStorage.setItem("dn_onboarded", "1"); } catch (_) {}  // … so QuotaExceededError can't leave overlay blocking the page
      });
    }
  } catch (_) {}

  /* resume banner — shown when a previous visit left the diagnostic
     part-answered; jumps to the first unanswered question */
  const preAnswered = DN.domains.reduce((a, d) =>
    a + (answers[d.id] || []).filter(v => Number.isInteger(v)).length, 0);
  if (preAnswered > 0 && preAnswered < total) {
    const bar = document.createElement("div");
    bar.className = "resume-banner";
    bar.style.cssText = "background:#FFF8E7;border:1px solid #E8C468;border-radius:10px;padding:14px 18px;margin:0 0 1.2rem;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap";
    bar.innerHTML = `<span>👋 Welcome back — you've answered <b>${preAnswered} of ${total}</b> questions.</span>
      <button id="resume-jump" class="btn btn-gold" style="white-space:nowrap">Resume where I left off →</button>`;
    host.parentNode.insertBefore(bar, host);
    bar.querySelector("#resume-jump").addEventListener("click", () => {
      const firstUnanswered = [...document.querySelectorAll(".q")]
        .find(q => !q.querySelector("input:checked"));
      if (firstUnanswered) {
        firstUnanswered.scrollIntoView({ behavior: "smooth", block: "center" });
        firstUnanswered.style.outline = "2px solid #E8C468";
        setTimeout(() => { firstUnanswered.style.outline = ""; }, 2500);
      }
      bar.remove();
    });
  }

  /* ---- pre-diagnostic context calibration card ---- */
  if (!answers._calibration) answers._calibration = { fleetType: "", opModel: "" };
  
  const calibCard = document.createElement("div");
  calibCard.className = "calibration-card";
  calibCard.style.cssText = "background:#fff;border-radius:12px;padding:22px 26px;margin-bottom:1.8rem;border:1px solid var(--dn-steel-lt,#D6E4F0);box-shadow:var(--shadow,0 4px 12px rgba(0,0,0,.05))";
  calibCard.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:0.6rem">
      <span style="font-size:1.2rem">🎯</span>
      <h3 style="margin:0;font-size:1.15rem;font-family:var(--sans);font-weight:700">Pre-Diagnostic Context Calibration</h3>
    </div>
    <p class="muted" style="margin:0 0 1.2rem;font-size:0.9rem;line-height:1.5">
      Calibrate the domain weighting matrix and benchmark overlays for your carrier's fleet structure and operating model before answering Question 1.
    </p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px">
      <div>
        <label for="calib-fleet" style="display:block;font-weight:600;font-size:0.86rem;margin-bottom:0.35rem">1. Primary Fleet Type</label>
        <select id="calib-fleet" style="width:100%;padding:0.65rem 0.8rem;border:1px solid rgba(28,28,28,.25);border-radius:var(--radius-sm,6px);font-family:inherit;font-size:0.9rem;background:#fff">
          <option value="">Default (Standard Fleet Baseline)</option>
          <option value="Turboprop" ${answers._calibration.fleetType === "Turboprop" ? "selected" : ""}>Turboprop Fleet</option>
          <option value="Regional Jet" ${answers._calibration.fleetType === "Regional Jet" ? "selected" : ""}>Regional Jet Fleet</option>
          <option value="Narrowbody" ${answers._calibration.fleetType === "Narrowbody" ? "selected" : ""}>Narrowbody Fleet</option>
          <option value="Mixed Fleet" ${answers._calibration.fleetType === "Mixed Fleet" ? "selected" : ""}>Mixed / Multi-Fleet</option>
        </select>
      </div>
      <div>
        <label for="calib-model" style="display:block;font-weight:600;font-size:0.86rem;margin-bottom:0.35rem">2. Operating Model</label>
        <select id="calib-model" style="width:100%;padding:0.65rem 0.8rem;border:1px solid rgba(28,28,28,.25);border-radius:var(--radius-sm,6px);font-family:inherit;font-size:0.9rem;background:#fff">
          <option value="">Default (Scheduled Baseline)</option>
          <option value="Scheduled Regional" ${answers._calibration.opModel === "Scheduled Regional" ? "selected" : ""}>Scheduled Regional Carrier</option>
          <option value="ACMI & Charter" ${answers._calibration.opModel === "ACMI & Charter" ? "selected" : ""}>ACMI, Charter & Contract Ops</option>
          <option value="Flag Carrier" ${answers._calibration.opModel === "Flag Carrier" ? "selected" : ""}>Flag Carrier / Full Service</option>
          <option value="Cargo" ${answers._calibration.opModel === "Cargo" ? "selected" : ""}>Cargo & Dedicated Freight</option>
        </select>
      </div>
    </div>
    <div id="calib-status-badge" style="margin-top:0.8rem;font-size:0.85rem;color:var(--accent,#4A7FA5);font-weight:600"></div>`;
  host.parentNode.insertBefore(calibCard, host);

  function updateCalibrationUI() {
    const f = calibCard.querySelector("#calib-fleet").value;
    const m = calibCard.querySelector("#calib-model").value;
    answers._calibration = { fleetType: f, opModel: m };
    saveAnswers(answers);

    const badge = calibCard.querySelector("#calib-status-badge");
    if (f || m) {
      badge.textContent = `✓ Weighting calibrated for: ${f || "Standard Fleet"} · ${m || "Scheduled Model"}`;
    } else {
      badge.textContent = "";
    }

    const currentWeights = DN.getAdjustedWeights(f, m);
    DN.domains.forEach(d => {
      const wEl = document.querySelector(`[data-domain-weight="${d.id}"]`);
      if (wEl) {
        wEl.textContent = `weight ${currentWeights[d.id] !== undefined ? currentWeights[d.id] : d.weight}%`;
      }
    });
  }

  calibCard.querySelectorAll("select").forEach(s => s.addEventListener("change", updateCalibrationUI));

  DN.domains.forEach((d, di) => {
    if (!answers[d.id]) answers[d.id] = [];
    const block = document.createElement("section");
    block.className = "domain";
    block.innerHTML = `
      <header>
        <span class="dn-name">${di + 1}. ${d.name}</span>
        <span class="dn-w" data-domain-weight="${d.id}">weight ${d.weight}%</span>
      </header>
      <div class="qbody"></div>`;
    const body = block.querySelector(".qbody");

    d.questions.forEach((q, qi) => {
      const wrap = document.createElement("div");
      wrap.className = "q";
      const opts = q.o.map((label, oi) => {
        const checked = answers[d.id][qi] === oi;
        return `<label class="opt ${checked ? "sel" : ""}">
          <input type="radio" name="${d.id}_${qi}" value="${oi}" ${checked ? "checked" : ""}>
          <span>${label}</span></label>`;
      }).join("");
      wrap.innerHTML = `<div class="qtext"><b>Q${qi + 1}</b>${q.t}</div><div class="opts">${opts}</div>`;
      body.appendChild(wrap);

      wrap.querySelectorAll("input").forEach(inp => {
        inp.addEventListener("change", () => {
          answers[d.id][qi] = parseInt(inp.value, 10);
          wrap.querySelectorAll(".opt").forEach(o => o.classList.remove("sel"));
          inp.closest(".opt").classList.add("sel");
          saveAnswers(answers);
          updateProgress();
        });
      });
    });
    host.appendChild(block);
  });

  function answeredCount() {
    return DN.domains.reduce((a, d) =>
      a + (answers[d.id] || []).filter(v => Number.isInteger(v)).length, 0);
  }

  function updateProgress() {
    const n = answeredCount();
    const pct = Math.round((n / total) * 100);
    document.querySelector(".progress-bar > i").style.width = pct + "%";
    const remaining = total - n;
    document.getElementById("progress-label").innerHTML =
      `<span style="font-weight:600">${pct}%</span> complete — ${n} of ${total} answered` + (remaining > 0 ? ` (${remaining} left)` : "");
    const btn = document.getElementById("see-results");
    btn.disabled = n < total;
    btn.classList.toggle("btn-ghost", n < total);
    btn.classList.toggle("btn-gold", n >= total);
    btn.classList.toggle("btn-lg", n >= total);
    if (n < total) {
      btn.textContent = remaining === 1 ? "Answer 1 more question" : `Answer all ${remaining} questions`;
    } else {
      btn.textContent = "🎯 See my strategic report";
    }
  }

  document.getElementById("see-results").addEventListener("click", () => {
    if (answeredCount() < total) return;
    const p = new URLSearchParams(location.search).get("partner");
    location.href = "results.html" + (p ? "?partner=" + encodeURIComponent(p) : "");
  });

  /* keyboard shortcut: Ctrl+Enter to submit if all answered */
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      if (answeredCount() >= total) {
        document.getElementById("see-results").click();
      }
    }
  });

  document.getElementById("reset").addEventListener("click", () => {
    if (!confirm("Clear all your answers on this device?")) return;
    clearAnswers();
    location.reload();
  });

  updateCalibrationUI();
  updateProgress();
})();
