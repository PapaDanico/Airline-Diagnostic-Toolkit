/* Extracted verbatim from tools/certification-navigator.html so the site can carry a real
   script-src. Behaviour is unchanged: the tag sits where the inline
   block sat, with no defer or async, so execution order is identical.
   Edit here, not in the HTML. */

(function () {
  applyPartner(); mountChrome();

  const store = toolStore("certnav");
  let state = store.load();               // { sector, checked: { "<sec>|<phase>|<i>": true } }
  state.checked = state.checked || {};

  const $ = id => document.getElementById(id);
  const grid = $("sector-grid");

  /* ---------- sector picker ---------- */
  JKV.sectors.forEach(s => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sector";
    b.setAttribute("aria-pressed", "false");
    b.dataset.sector = s.id;
    b.innerHTML =
      `<span class="s-ico" aria-hidden="true">${s.icon}</span>
       <h3>${s.short}</h3>
       <p>${s.blurb}</p>
       <div class="s-reg">${s.regLine}</div>`;
    b.addEventListener("click", () => select(s.id, true));
    grid.appendChild(b);
  });

  const key = (sec, phase, i) => `${sec}|${phase}|${i}`;

  function select(id, scroll) {
    const s = JKV.sector(id);
    if (!s) return;
    state.sector = id;
    store.save(state);
    grid.querySelectorAll(".sector").forEach(el =>
      el.setAttribute("aria-pressed", String(el.dataset.sector === id)));
    renderSummary(s);
    renderPhases(s);
    renderPostholders(s);
    renderManuals(s);
    renderProvenance(s);
    $("path").hidden = false;
    $("prov").hidden = false;
    recompute();
    mountPrintHead("KCAA Certification Navigator", s.name);
    if (scroll) $("path").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- sector summary ---------- */
  function renderSummary(s) {
    const warn = s.warn
      ? `<div class="note warn"><b>Verify before you rely on this</b>${s.warn}</div>` : "";
    $("sector-summary").innerHTML =
      `<div class="card card-flat" style="margin-top:2rem">
         <div class="flex between items-center wrapf gap">
           <div style="min-width:240px;flex:1">
             <p class="eyebrow" style="margin-bottom:.3rem">Selected pathway</p>
             <h3 style="margin:0">${s.icon} ${s.name}</h3>
             <p class="muted" style="margin:.4rem 0 0;font-size:.9rem">${s.blurb}</p>
           </div>
           <div style="text-align:right;min-width:180px">
             <div style="font-family:var(--serif);font-size:2rem;font-weight:700;line-height:1">${s.leadMonths[0]}–${s.leadMonths[1]}</div>
             <div class="muted" style="font-size:.76rem;letter-spacing:.06em;text-transform:uppercase">months, typical</div>
           </div>
         </div>
         <div style="margin-top:.9rem">${citeChips(s.cites)}</div>
         ${warn}
       </div>`;
    $("lead-note").textContent = s.leadNote;
  }

  /* ---------- phases ---------- */
  function renderPhases(s) {
    const rail = $("phase-rail");
    rail.innerHTML = "";
    JKV.phaseSpine.forEach(p => {
      const items = s.items[p.id] || [];
      const wrap = document.createElement("div");
      wrap.className = "pgate";
      wrap.dataset.phase = p.id;

      const rows = items.map((it, i) => {
        const k = key(s.id, p.id, i);
        const on = !!state.checked[k];
        return `<label class="chk${on ? " done" : ""}" data-k="${k}">
            <input type="checkbox" ${on ? "checked" : ""}>
            <span class="chk-t"><b>${it.t}${it.crit ? ' <span class="tag kcaa" style="vertical-align:middle">gate</span>' : ""}</b>
              <small>${it.d}</small>
              ${it.c && it.c.length ? `<span style="display:block;margin-top:.15rem">${citeChips(it.c)}</span>` : ""}
            </span>
          </label>`;
      }).join("");

      wrap.innerHTML =
        `<h3 class="pg-h"><button type="button" class="pg-head" aria-expanded="false">
           <span class="pg-num">${p.n}</span>
           <span class="pg-title"><b>${p.t}</b><span>${p.d}</span></span>
           <span class="pg-meter" data-meter>0/${items.length}</span>
         </button></h3>
         <div class="pg-body" hidden>
           <div class="note"><b>What the Authority does</b>${p.auth}</div>
           <h4>Gate to clear</h4>
           <p style="font-size:.88rem;margin:0 0 .6rem">${p.gate}</p>
           <h4>Your checklist</h4>
           ${rows}
         </div>`;

      const head = wrap.querySelector(".pg-head");
      const body = wrap.querySelector(".pg-body");
      wireDisclosure(head, body, open => wrap.classList.toggle("is-open", open));

      body.addEventListener("change", e => {
        const input = e.target;
        if (input.type !== "checkbox") return;
        const label = input.closest(".chk");
        const k = label.dataset.k;
        if (input.checked) state.checked[k] = true; else delete state.checked[k];
        label.classList.toggle("done", input.checked);
        store.save(state);
        recompute();
      });

      rail.appendChild(wrap);
    });
  }

  /* ---------- postholders ---------- */
  function renderPostholders(s) {
    const rows = s.postholders.map(p =>
      `<div class="role${p.kcaa ? " is-postholder" : ""}">
         <b>${p.r}</b>
         <div class="r-tags">
           ${p.kcaa ? '<span class="tag kcaa">Regulator-accepted post</span>' : '<span class="tag">Supporting role</span>'}
         </div>
         ${p.note ? `<div class="r-rep" style="margin-top:.45rem">${p.note}</div>` : ""}
       </div>`).join("");
    $("postholders").innerHTML =
      `<p class="eyebrow">Step 3</p>
       <h2 style="margin-bottom:.4rem">Who the Authority must accept</h2>
       <p class="muted" style="max-width:640px">Named postholders are assessed as individuals, not as job titles. A vacancy or an unaccepted nominee stops certification regardless of how complete the paperwork is.</p>
       <div class="org-row" style="margin-top:1.2rem">${rows}</div>
       <p class="muted" style="font-size:.84rem;margin-top:1rem">
         Design the full organisation — reporting lines, deputies and headcount ramp — in the
         <a href="organogram-planner.html" data-keep-partner>Organogram &amp; Postholder Planner</a>.</p>`;
  }

  /* ---------- manuals ---------- */
  function renderManuals(s) {
    const rows = s.manuals.map(m => `<li>${m}</li>`).join("");
    $("manuals").innerHTML =
      `<p class="eyebrow">Step 4</p>
       <h2 style="margin-bottom:.4rem">The document set</h2>
       <p class="muted" style="max-width:640px">Every one of these is evaluated in Phase 3 and tested against reality in Phase 4. Manuals that describe an operation you cannot demonstrate are the most expensive kind of finding.</p>
       <div class="card card-flat" style="margin-top:1.1rem">
         <ul style="columns:2;column-gap:32px;margin:0;padding-left:1.1rem;font-size:.9rem">${rows}</ul>
       </div>`;
  }

  /* ---------- provenance ---------- */
  function renderProvenance(s) {
    const keys = new Set(s.cites);
    JKV.phaseSpine.forEach(p => (s.items[p.id] || []).forEach(i => (i.c || []).forEach(k => keys.add(k))));
    const rows = [...keys].map(k => {
      const c = JKV.cite(k);
      if (!c) return "";
      return `<div style="padding:.55rem 0;border-bottom:1px solid var(--jk-line);font-size:.86rem">
          ${citeChip(k)}
          <span style="margin-left:.3rem">${c.long}</span>
        </div>`;
    }).join("");
    $("prov-list").innerHTML = rows;
    $("prov-note").textContent =
      `${JKV.CITE_META.note} Citations last checked against the public gazette record on ${JKV.CITE_META.verifiedOn}.`;
  }

  /* ---------- readiness ---------- */
  function recompute() {
    const s = JKV.sector(state.sector);
    if (!s) return;
    let all = 0, allDone = 0, crit = 0, critDone = 0, currentPhase = null;
    /* Per-phase detail, retained for the executive summary: which gate
       items are still open, and how much work has been ticked in phases
       beyond the one the applicant is actually in. */
    const phaseStats = [];

    JKV.phaseSpine.forEach(p => {
      const items = s.items[p.id] || [];
      let pDone = 0, pCrit = 0, pCritDone = 0;
      const openCrit = [];
      items.forEach((it, i) => {
        const on = !!state.checked[key(s.id, p.id, i)];
        all++; if (on) { allDone++; pDone++; }
        if (it.crit) { crit++; pCrit++; if (on) { critDone++; pCritDone++; } else openCrit.push(it.t); }
      });
      phaseStats.push({ p, total: items.length, done: pDone, crit: pCrit, openCrit });
      const gate = document.querySelector(`.pgate[data-phase="${p.id}"]`);
      if (gate) {
        const done = pCrit > 0 && pCritDone === pCrit;
        gate.classList.toggle("done", done);
        gate.querySelector("[data-meter]").textContent = `${pDone}/${items.length}`;
        gate.classList.remove("active");
        if (!done && !currentPhase) currentPhase = p;
      }
    });

    if (currentPhase) {
      const g = document.querySelector(`.pgate[data-phase="${currentPhase.id}"]`);
      if (g) g.classList.add("active");
    }

    // Overall readiness weights the gate items at 2× — closing a gate item
    // moves you materially closer to a certificate; closing a nice-to-have
    // does not. A flat percentage would flatter a badly-sequenced applicant.
    const denom = (all - crit) + crit * 2;
    const numer = (allDone - critDone) + critDone * 2;
    const pct = denom ? Math.round((numer / denom) * 100) : 0;

    $("meter-fill").style.width = pct + "%";
    $("meter-val").textContent = pct + "%";
    $("k-crit").textContent = `${critDone}/${crit}`;
    $("k-all").textContent = `${allDone}/${all}`;
    $("phase-now").textContent = currentPhase
      ? `Current phase: ${currentPhase.n}. ${currentPhase.t}`
      : "All gates closed — certificate stage.";

    const body =
      `Sector: ${s.name}\n` +
      `Readiness: ${pct}% (gate items ${critDone}/${crit}, all items ${allDone}/${all})\n` +
      `Current phase: ${currentPhase ? currentPhase.n + ". " + currentPhase.t : "certification"}\n\n` +
      `I would like to discuss the certification pathway for this venture.`;
    const href = toolMailto("Certification", s.short + " pathway", body);
    $("talk").href = href;
    $("cta-mail").href = href;

    summarise({ s, pct, crit, critDone, all, allDone, currentPhase, phaseStats });
  }

  /* ---- answer-first opening page for the printed pack ----

     The open gate leads, named item by named item, because a
     certification programme does not progress on percentage complete —
     it progresses one gate at a time, and the Authority will not look
     at Phase 4 while Phase 2 is open.

     The second finding is the one applicants pay for and rarely see in
     time. Work ticked in phases beyond the current gate feels like
     progress and is the commonest way a first-time applicant loses
     months: manuals written before the scope in the PASI is accepted
     get rewritten, and proving procedures before the manual is approved
     proves the wrong procedures. A percentage-complete meter actively
     rewards this, because out-of-sequence ticks move it up. */
  function summarise({ s, pct, crit, critDone, all, allDone, currentPhase, phaseStats }) {
    const f = [];
    const cur = currentPhase && phaseStats.find(x => x.p.id === currentPhase.id);

    if (cur && cur.openCrit.length) f.push({ sev: "stop",
      h: `${cur.openCrit.length} gate item${cur.openCrit.length > 1 ? "s" : ""} open in Phase ${cur.p.n} — ${cur.p.t}`,
      d: `${cur.openCrit.slice(0, 3).join("; ")}${cur.openCrit.length > 3 ? `; and ${cur.openCrit.length - 3} more` : ""}. ${cur.p.gate} Nothing in a later phase is assessed until this gate closes.` });

    /* Work banked beyond the gate the applicant has not yet cleared. */
    if (currentPhase) {
      const idx = phaseStats.findIndex(x => x.p.id === currentPhase.id);
      const ahead = phaseStats.slice(idx + 1).filter(x => x.done > 0);
      const aheadItems = ahead.reduce((a, x) => a + x.done, 0);
      if (aheadItems > 0) f.push({ sev: "warn",
        h: `${aheadItems} item${aheadItems > 1 ? "s" : ""} completed in phases beyond the open gate`,
        d: `${ahead.map(x => `Phase ${x.p.n} (${x.done}/${x.total})`).join(", ")}. This reads as progress and frequently is not: work done before the preceding gate closes is done against a scope the Authority has not yet accepted, and the part of it that has to be redone is not visible until it is.` });
    }

    if (!currentPhase) f.push({ sev: "ok", h: "Every gate closed",
      d: `All ${crit} gate items complete across ${phaseStats.length} phases, ${allDone} of ${all} checklist items in total. The pathway is at certificate stage — what remains is the Authority's own timetable rather than the applicant's.` });
    else if (crit - critDone > (cur ? cur.openCrit.length : 0)) f.push({ sev: "note",
      h: `${crit - critDone} of ${crit} gate items remain across the whole pathway`,
      d: `Beyond the current phase, the gates still to clear are ${phaseStats.filter(x => x.openCrit.length && x.p.id !== currentPhase.id).map(x => `Phase ${x.p.n} (${x.openCrit.length})`).join(", ")}. Gate items are weighted at twice a supporting item in the readiness figure, because closing one is what actually moves a certificate.` });

    mountPrintSummary({
      title: `${s.name} — certification pathway`,
      verdict: currentPhase
        ? `${pct}% ready — currently in Phase ${currentPhase.n}, ${currentPhase.t}, with ${crit - critDone} of ${crit} gate items still open`
        : `${pct}% ready — every gate closed, ${allDone} of ${all} checklist items complete`,
      findings: f,
      basis: `Readiness weights gate items at twice a supporting item, because a flat percentage flatters a badly sequenced applicant. Checklist and phase structure follow the Kenyan requirement set; ${JKV.CITE_META.note} Citations last checked against the public gazette record on ${JKV.CITE_META.verifiedOn}.`
    });
  }

  /* ---------- actions ---------- */
  $("print").addEventListener("click", () => {
    // A printed pack must be complete, so expand every gate first.
    document.querySelectorAll(".pgate").forEach(g => {
      g.querySelector(".pg-body").hidden = false;
      g.querySelector(".pg-head").setAttribute("aria-expanded", "true");
      g.classList.add("is-open");
    });
    window.print();
  });

  $("reset").addEventListener("click", () => {
    const s = JKV.sector(state.sector);
    if (!s) return;
    if (!confirm(`Clear all progress for ${s.short}? This cannot be undone.`)) return;
    Object.keys(state.checked).forEach(k => { if (k.startsWith(s.id + "|")) delete state.checked[k]; });
    store.save(state);
    select(s.id, false);
  });

  /* ---------- restore ---------- */
  wireToolEnquiryForm("cert-enquiry", "Certification Navigator");

  const fromUrl = new URLSearchParams(location.search).get("sector");
  const initial = (fromUrl && JKV.sector(fromUrl)) ? fromUrl : state.sector;
  if (initial && JKV.sector(initial)) select(initial, false);
})();
