/* Extracted verbatim from tools/venture-dashboard.html so the site can carry a real
   script-src. Behaviour is unchanged: the tag sits where the inline
   block sat, with no defer or async, so execution order is identical.
   Edit here, not in the HTML. */

(function () {
  applyPartner(); mountChrome();
  mountPrintHead("Venture Control Room");

  const $ = id => document.getElementById(id);
  const RAG = { green: "var(--jk-green)", amber: "var(--jk-amber-sig)", red: "var(--jk-red)", idle: "var(--jk-muted)" };

  /* ---------- identity fields ---------- */
  JKV.sectors.forEach(s => {
    const o = document.createElement("option");
    o.value = s.id; o.textContent = `${s.icon} ${s.name}`;
    $("vf-sector").appendChild(o);
  });

  let prof = JKW.profile();
  $("vf-name").value = prof.name;
  $("vf-sector").value = prof.sector;
  $("vf-target").value = prof.target;

  $("vf-name").addEventListener("input", () => { prof = JKW.saveProfile({ name: $("vf-name").value }); render(); });
  $("vf-sector").addEventListener("change", () => { prof = JKW.saveProfile({ sector: $("vf-sector").value }); render(); });
  $("vf-target").addEventListener("change", () => { prof = JKW.saveProfile({ target: $("vf-target").value }); render(); });

  /* ---------- module cards ---------- */
  function renderModules(mods) {
    $("mods").innerHTML = mods.map(m => `
      <article class="mod ${m.rag === "idle" ? "" : "is-" + m.rag}">
        <div class="m-top">
          <h3><span aria-hidden="true">${m.icon}</span> ${escapeHtml(m.name)}</h3>
          <span class="m-pct" style="color:${m.started ? RAG[m.rag] : "var(--jk-muted)"}">${m.started ? m.pct + "%" : "—"}</span>
        </div>
        <div class="progress-bar" role="img" aria-label="${escapeHtml(m.name)}: ${m.started ? m.pct + " per cent complete" : "not started"}">
          <i style="width:${m.started ? m.pct : 0}%"></i></div>
        <p class="m-head">${escapeHtml(m.headline)}</p>
        ${m.facts.length ? `<div class="m-facts">${m.facts.map(f =>
          `<div><span>${escapeHtml(f.k)}</span><b>${escapeHtml(f.v)}</b></div>`).join("")}</div>` : ""}
        <p class="m-next"><b>Next</b>${escapeHtml(m.next)}</p>
        <a class="btn ${m.started ? "btn-ghost" : "btn-primary"}" href="${m.href}?sector=${encodeURIComponent(prof.sector)}"
           data-keep-partner style="justify-content:center">${m.started ? "Continue" : "Open"} →</a>
      </article>`).join("");
    keepPartnerParam($("mods"), activePartnerKey());
  }

  /* A tool left pointing at a different sector from the venture file is a
     silent source of nonsense — the readiness index would be summing four
     answers to different questions. Say so rather than quietly reconciling. */
  function renderMismatch(mods) {
    const off = mods.filter(m => m.started && m.sector && m.sector !== prof.sector);
    $("vf-mismatch").innerHTML = off.length
      ? `<div class="note warn"><b>${off.length} tool${off.length > 1 ? "s are" : " is"} set to a different sector</b>
           ${off.map(m => `${escapeHtml(m.name)} (${escapeHtml((JKV.sector(m.sector) || {}).short || m.sector)})`).join(", ")}.
           The readiness index still counts ${off.length > 1 ? "them" : "it"}, but the numbers describe a different venture.
           Open each tool and switch it to ${escapeHtml((JKV.sector(prof.sector) || {}).short || prof.sector)}, or change the sector above.</div>`
      : "";
  }

  /* ---------- critical path ---------- */
  function renderPath(tl) {
    if (!tl) {
      $("cp-host").innerHTML = `<div class="note"><b>Set a target certificate date</b>Enter the date you need the certificate in hand and the five phases will be scheduled backwards from it against your sector's indicative lead band.</div>`;
      return;
    }
    const sec = JKV.sector(prof.sector);
    let offset = 0;
    const rows = tl.phases.map(p => {
      const left = offset; offset += p.share;
      return `
      <div class="cp-row${p.active ? " is-now" : ""}">
        <span class="cp-n" aria-hidden="true">${p.n}</span>
        <div class="cp-name">${escapeHtml(p.t)}${p.active ? "<small>you are here</small>" : ""}</div>
        <div class="cp-track" role="img" aria-label="Phase ${p.n}, ${escapeHtml(p.t)}: ${fmtDate(p.from)} to ${fmtDate(p.to)}">
          <i style="left:${left.toFixed(1)}%;width:${p.share.toFixed(1)}%"></i></div>
        <div class="cp-dates">${fmtDate(p.from)} → ${fmtDate(p.to)}</div>
      </div>`;
    }).join("");

    const verdict = tl.late
      ? `<div class="note warn"><b>The target has already slipped</b>On the realistic ${tl.hi}-month band you needed to be at the
           pre-application meeting by <b>${fmtDate(tl.startHi)}</b> — ${tl.slipMonths} month${tl.slipMonths === 1 ? "" : "s"} ago.
           Either move the target, or plan against the optimistic ${tl.lo}-month band and accept that it assumes every submission
           lands first time. Nothing about ${escapeHtml(sec ? sec.short : "this sector")} certification recovers a slip by working harder.</div>`
      : tl.tight
        ? `<div class="note warn"><b>Only the optimistic band still fits</b>The realistic ${tl.hi}-month path needed a
             ${fmtDate(tl.startHi)} start. You can still make ${fmtDate(tl.target)} on the ${tl.lo}-month band, which assumes
             no rejected application, no re-submitted manual and no repeated inspection. Treat it as the floor, not the plan.</div>`
        : `<div class="note ok"><b>The date is still reachable</b>Start pre-application by <b>${fmtDate(tl.startHi)}</b> for the
             realistic ${tl.hi}-month path, or by ${fmtDate(tl.startLo)} if everything lands first time.</div>`;

    $("cp-host").innerHTML =
      `<div class="cp">${rows}</div>
       <p class="muted" style="font-size:.8rem;margin:1.1rem 0 0;max-width:760px">
         Phase durations are apportioned from the sector's ${tl.lo}–${tl.hi} month band
         (${Object.entries(JKW.PHASE_SHARE).map(([k, v]) => `${JKV.phaseSpine.find(p => p.id === k).t} ${Math.round(v * 100)}%`).join(" · ")}).
         Document evaluation and on-site demonstration dominate because that is where applications actually sit.
         This is a planning aid, not a commitment from the Authority.</p>
       ${verdict}`;
  }

  /* ---------- operating-track cross-link ---------- */
  function renderScorecard() {
    const sc = JKW.scorecard();
    /* An index is only shown for a finished scorecard.

       results.html will not render a report until all forty questions
       are answered, because each domain is scored against the questions
       answered rather than the questions asked — so a partial scorecard
       where the easy domains happen to be filled in reads far better
       than the same carrier honestly assessed. This panel used to print
       that number anyway, with a verdict band beside it, which meant
       the two pages disagreed about whether the same data was fit to
       show. scorecard() has always returned answeredAll; nothing read
       it. */
    $("scorecard-x").innerHTML = !sc
      ? ""
      : sc.answeredAll
        ? `<div class="note"><b>You also have an Airline Health Scorecard on this device — index ${sc.index}/100, "${escapeHtml(sc.verdict.band)}"</b>
             That diagnostic measures an operating carrier, so it sits outside the Launch Readiness Index rather than inside it.
             <a href="../results.html">Open the scorecard results →</a></div>`
        : `<div class="note"><b>You have an Airline Health Scorecard in progress on this device — ${sc.answered} of ${sc.total} questions answered.</b>
             No index is shown until it is finished: each domain is scored against the questions you have answered, so a
             part-completed scorecard flatters whichever domains you filled in first.
             <a href="../diagnostic.html">Finish the scorecard →</a></div>`;
  }

  /* ---------- render ---------- */
  function render() {
    const mods = JKW.modules(prof);
    const r = JKW.readiness(mods);

    const ringColor = r.index >= 75 ? "var(--jk-green)" : r.index >= 45 ? "var(--jk-amber)" : "var(--jk-red)";
    $("ring").style.setProperty("--p", r.index);
    $("ring").style.setProperty("--ring-color", ringColor);
    $("ring").setAttribute("aria-label", `Launch Readiness Index ${r.index} of 100 — ${r.band.t}`);
    $("ring-val").textContent = r.index;
    $("ring-band").textContent = r.band.t;
    $("ring-text").textContent = r.band.d;

    const cert = mods.find(m => m.id === "certnav");
    const ven  = mods.find(m => m.id === "venture");
    const org  = mods.find(m => m.id === "organogram");
    const gate = cert.facts.find(f => f.k === "Gate items closed");
    $("k-gate").textContent  = gate ? gate.v : "—";
    $("k-gap").textContent   = ven.capital ? (ven.capital.gap > 0 ? fmtMoney(ven.capital.gap) : "None") : "—";
    $("k-posts").textContent = org.postsTotal ? `${org.named}/${org.postsTotal}` : "—";

    const tl = JKW.timeline(prof, mods);
    $("k-months").textContent = tl ? (tl.monthsToTarget >= 0 ? tl.monthsToTarget : "Past") : "—";

    renderModules(mods);
    renderMismatch(mods);
    renderPath(tl);
    renderScorecard();
    renderScenarios();

    const body =
      `Venture: ${prof.name || "(unnamed)"}\n` +
      `Sector: ${(JKV.sector(prof.sector) || {}).name || prof.sector}\n` +
      `Target certificate date: ${prof.target || "not set"}\n` +
      `Launch Readiness Index: ${r.index}/100 — ${r.band.t}\n\n` +
      mods.map(m => `  ${m.name}: ${m.started ? m.pct + "%" : "not started"} — ${m.headline}\n    Next: ${m.next}`).join("\n") +
      `\n\nI would like this venture reviewed.`;
    const href = toolMailto("Control Room", prof.name || "Greenfield venture", body);
    $("talk").href = href; $("cta-mail").href = href;
    wireToolEnquiryForm("dash-enquiry", "Venture Dashboard");

    mountPrintHead("Venture Control Room", prof.name || undefined);
    const rev = mods.find(m => m.id === "revenue");
    summarise({ r, mods, tl, org, ven, gate, rev });
  }

  /* ---- answer-first opening page for the printed pack ----

     This is the only surface that sees every tool at once, so it is the
     only one that can report the findings no single tool can: that the
     capital model and the certification plan describe different
     ventures, or that the target date was already unreachable when it
     was set.

     Ordered by what a board can still act on. An unfunded gap and an
     unreachable date are decisions that have to be taken now. A sector
     mismatch outranks the readiness score rather than footnoting it,
     because every number on this page is a roll-up: if the tools
     disagree about which venture they describe, the index above is an
     average of two different companies. */
  function summarise({ r, mods, tl, org, ven, gate }) {
    const started = mods.filter(m => m.started);
    if (!started.length) return mountPrintSummary(null);

    const f = [];
    const secName = (JKV.sector(prof.sector) || {}).short || prof.sector;
    const rev = mods.find(m => m.id === "revenue");

    if (ven.capital && ven.capital.gap > 0) f.push({ sev: "stop",
      h: `Unfunded capital gap of ${fmtMoney(ven.capital.gap)}`,
      d: `The funding stack does not cover the capital requirement. Certification burns cash against a fixed regulatory clock, so this closes before a Schedule of Events is committed rather than being discovered during one.` });

    if (rev && rev.started && rev.rag === "red") f.push({ sev: "stop",
      h: "The fleet cannot service its capital at projected utilisation",
      d: rev.next });

    if (rev && rev.started && rev.rag === "amber") f.push({ sev: "warn",
      h: "Revenue readiness is marginal",
      d: rev.next });

    if (tl && tl.late) f.push({ sev: "stop",
      h: "The target certificate date is already unreachable",
      d: `${tl.monthsToTarget >= 0 ? `${tl.monthsToTarget} month${tl.monthsToTarget === 1 ? "" : "s"} remain` : "The date has passed"}, against an indicative lead band for ${secName} that would have required starting earlier. Either the date moves or the scope narrows — carrying an impossible date into a board pack costs more than resetting it.` });

    const off = mods.filter(m => m.started && m.sector && m.sector !== prof.sector);
    if (off.length) f.push({ sev: "warn",
      h: `${off.length} tool${off.length > 1 ? "s describe" : " describes"} a different sector`,
      d: `${off.map(m => `${m.name} (${(JKV.sector(m.sector) || {}).short || m.sector})`).join(", ")}, against a venture file set to ${secName}. The readiness index still counts ${off.length > 1 ? "them" : "it"}, so the figure above is averaging more than one venture.` });

    if (org.postsTotal && org.named < org.postsTotal) f.push({ sev: "warn",
      h: `${org.postsTotal - org.named} of ${org.postsTotal} accepted posts unnamed`,
      d: `Certification does not proceed on a vacant accepted post, and the Authority accepts the individual rather than the job title. Recruitment lead time for a Head of Training or an Accountable Manager routinely exceeds the phase it blocks.` });

    const idle = mods.filter(m => !m.started);
    if (idle.length) f.push({ sev: "note",
      h: `${idle.length} of ${mods.length} modules not started`,
      d: `${idle.map(m => m.name).join("; ")}. The index scores every module, so an unstarted one reads the same as a failing one — the figure above is a floor rather than an assessment.` });

    if (!f.some(x => x.sev === "stop" || x.sev === "warn"))
      f.unshift({ sev: "ok", h: `${r.band.t} at ${r.index} of 100`,
        d: `${r.band.d} Gate items ${gate ? gate.v : "not yet tracked"}${org.postsTotal ? `, ${org.named} of ${org.postsTotal} accepted posts named` : ""}.` });

    mountPrintSummary({
      title: `${prof.name || "Greenfield venture"} — ${(JKV.sector(prof.sector) || {}).name || prof.sector}`,
      verdict: `Launch Readiness Index ${r.index} of 100 — ${r.band.t}.` +
        (tl ? ` ${tl.monthsToTarget >= 0 ? `${tl.monthsToTarget} month${tl.monthsToTarget === 1 ? "" : "s"} to the target certificate date` : "The target certificate date has passed"}.` : " No target certificate date set."),
      findings: f,
      basis: `A roll-up of ${started.length} of ${mods.length} modules held on this device, not a separate assessment. Each module contributes its own figures; where they disagree, the disagreement is reported above rather than averaged away. Indicative lead bands are JK's planning figures for ${secName} and not an Authority commitment.`
    });
  }

  /* ============================================================
     SCENARIOS
     ============================================================ */
  const MAX_COMPARE = 3;
  let compareSel = [];   // scenario ids ticked for comparison

  const scnMsg = (text, kind) => {
    const el = $("scn-msg");
    el.textContent = text;
    el.style.color = kind === "ok" ? "var(--jk-green)" : kind === "err" ? "var(--jk-red)" : "";
  };

  const ragDot = rag => rag
    ? `<span class="rag-dot" style="background:${RAG[rag] || "transparent"}" aria-hidden="true"></span>` : "";

  function renderScenarios() {
    const list = JKW.scenarios();
    const live = JKW.summarise(prof, JKW.liveSource());

    const liveRow = `
      <div class="scn-row is-live">
        <span aria-hidden="true">●</span>
        <div class="scn-name">Current workspace<small>Unsaved — what the tools hold right now</small></div>
        <div class="scn-idx">${live.readiness.index}<small>index</small></div>
        <div class="scn-cap">${escapeHtml(live.rows.capital.v)}</div>
        <div class="scn-acts"><span class="muted" style="font-size:.8rem">always compared</span></div>
      </div>`;

    const rows = list.map(s => {
      const sum = JKW.summarise(s.profile || prof, JKW.objSource(s.stores));
      const on = compareSel.includes(s.id);
      const when = new Date(s.savedAt);
      const whenTxt = isNaN(when.getTime()) ? "" :
        when.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) +
        " · " + when.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      return `
        <div class="scn-row">
          <input type="checkbox" data-cmp="${s.id}" ${on ? "checked" : ""}
                 aria-label="Compare ${escapeHtml(s.name)}">
          <div class="scn-name">${escapeHtml(s.name)}<small>${escapeHtml(whenTxt)} · ${escapeHtml(sum.rows.sector.v)}</small></div>
          <div class="scn-idx">${sum.readiness.index}<small>index</small></div>
          <div class="scn-cap">${escapeHtml(sum.rows.capital.v)}</div>
          <div class="scn-acts">
            <button class="btn btn-ghost" data-restore="${s.id}">Restore</button>
            <button class="btn btn-ghost" data-del="${s.id}">Delete</button>
          </div>
        </div>`;
    }).join("");

    $("scn-list").innerHTML = list.length
      ? liveRow + rows +
        `<p class="muted" style="font-size:.8rem;margin:.7rem 0 0">Tick up to ${MAX_COMPARE} scenarios to compare against the current workspace. ${list.length}/${JKW.MAX_SCENARIOS} saved.</p>`
      : liveRow + `<p class="muted" style="font-size:.85rem;margin:.7rem 0 0">No scenarios saved yet. Save the current workspace above to start comparing.</p>`;

    /* Ticking a box updates only the comparison table. Re-rendering the
       whole list here would replace the checkbox the visitor just
       activated, throwing keyboard focus back to the top of the
       document mid-interaction. */
    $("scn-list").querySelectorAll("[data-cmp]").forEach(cb => cb.addEventListener("change", () => {
      const id = cb.dataset.cmp;
      if (cb.checked) {
        if (compareSel.length >= MAX_COMPARE) {
          cb.checked = false;
          scnMsg(`Compare up to ${MAX_COMPARE} scenarios at once — untick one first.`, "err");
          return;
        }
        compareSel.push(id);
      } else {
        compareSel = compareSel.filter(x => x !== id);
      }
      scnMsg("", "");
      renderCompare(JKW.summarise(prof, JKW.liveSource()), list);
    }));

    $("scn-list").querySelectorAll("[data-restore]").forEach(b => b.addEventListener("click", () => {
      const s = list.find(x => x.id === b.dataset.restore);
      if (!s) return;
      // Restoring overwrites live work that may not be saved anywhere.
      if (!confirm(`Restore "${s.name}"?\n\nThis replaces what the tools currently hold. If the current workspace is not saved as a scenario, it will be lost.`)) return;
      const res = JKW.restoreScenario(s.id);
      if (!res.ok) { scnMsg(res.error, "err"); return; }
      prof = JKW.profile();
      $("vf-name").value = prof.name;
      $("vf-sector").value = prof.sector;
      $("vf-target").value = prof.target;
      render();
      scnMsg(`Restored "${s.name}". Every tool now opens on that scenario.`, "ok");
    }));

    $("scn-list").querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => {
      const s = list.find(x => x.id === b.dataset.del);
      if (!s || !confirm(`Delete the scenario "${s.name}"? This cannot be undone.`)) return;
      JKW.deleteScenario(s.id);
      compareSel = compareSel.filter(x => x !== s.id);
      renderScenarios();
      scnMsg(`Deleted "${s.name}".`, "ok");
    }));

    renderCompare(live, list);
  }

  /* The comparison only earns its space if it points at what differs —
     otherwise it is fifteen rows the reader has to diff by eye. */
  function renderCompare(live, list) {
    const chosen = compareSel.map(id => list.find(s => s.id === id)).filter(Boolean);
    if (!chosen.length) {
      $("scn-compare").innerHTML = list.length
        ? `<div class="note"><b>Tick a scenario to compare it</b>The current workspace is always the first column, so you can see what a saved scenario would change before you restore it.</div>`
        : "";
      return;
    }
    const cols = [{ name: "Current workspace", live: true, sum: live }].concat(
      chosen.map(s => ({ name: s.name, live: false, sum: JKW.summarise(s.profile || prof, JKW.objSource(s.stores)) })));

    const keys = Object.keys(live.rows);
    const body = keys.map(k => {
      const vals = cols.map(c => c.sum.rows[k]);
      const differs = vals.some(v => v.v !== vals[0].v);
      return `<tr>
        <th scope="row">${escapeHtml(vals[0].label)}</th>
        ${vals.map(v => `<td class="${differs ? "differs" : ""}">${ragDot(v.rag)}${escapeHtml(v.v)}</td>`).join("")}
      </tr>`;
    }).join("");

    $("scn-compare").innerHTML = `
      <h3 style="margin:0 0 .5rem">Side by side</h3>
      <p class="muted" style="font-size:.85rem;margin:0 0 1rem">Rows that differ across the columns are highlighted. Everything else is common ground.</p>
      <div class="table-scroll">
        <table class="cmp">
          <caption class="visually-hidden">Comparison of the current workspace against saved scenarios</caption>
          <thead><tr><th scope="col">Measure</th>
            ${cols.map(c => `<th scope="col" class="${c.live ? "is-live" : ""}">${escapeHtml(c.name)}</th>`).join("")}
          </tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>`;
  }

  $("scn-save").addEventListener("click", () => {
    const res = JKW.saveScenario($("scn-name").value);
    if (!res.ok) { scnMsg(res.error, "err"); return; }
    $("scn-name").value = "";
    renderScenarios();
    scnMsg(`Saved "${res.scenario.name}".`, "ok");
  });

  /* ---------- workspace export / import ---------- */
  const msg = (text, kind) => {
    const el = $("ws-msg");
    el.textContent = text;
    el.style.color = kind === "ok" ? "var(--jk-green)" : kind === "err" ? "var(--jk-red)" : "";
  };

  $("ws-export").addEventListener("click", () => {
    JKW.download();
    msg("Workspace written to your downloads folder.", "ok");
  });

  $("ws-import-btn").addEventListener("click", () => $("ws-import").click());
  $("ws-import").addEventListener("change", () => {
    const file = $("ws-import").files && $("ws-import").files[0];
    if (!file) return;
    // A workspace of typed text and integers is kilobytes. Anything past a
    // megabyte is not one of ours, and parsing it would only hang the tab.
    if (file.size > 1024 * 1024) { msg("That file is too large to be a JK workspace.", "err"); return; }
    const reader = new FileReader();
    reader.onerror = () => msg("Could not read that file.", "err");
    reader.onload = () => {
      let parsed;
      try { parsed = JSON.parse(reader.result); }
      catch { msg("That file is not valid JSON.", "err"); return; }
      const res = JKW.importObject(parsed);
      if (!res.ok) { msg(res.error, "err"); return; }
      prof = JKW.profile();
      $("vf-name").value = prof.name;
      $("vf-sector").value = prof.sector;
      $("vf-target").value = prof.target;
      render();
      msg(`Restored ${res.written} record${res.written === 1 ? "" : "s"}${res.skipped ? `, skipped ${res.skipped}` : ""}. Every tool now opens on this venture.`, "ok");
    };
    reader.readAsText(file);
    $("ws-import").value = "";   // let the same file be chosen again
  });

  $("ws-clear").addEventListener("click", () => {
    if (!confirm("Clear the venture name, sector and target date? The individual tools keep their own saved work.")) return;
    reportingWrite(() => localStorage.removeItem(JKW.PROFILE_KEY));
    prof = JKW.profile();
    $("vf-name").value = ""; $("vf-sector").value = prof.sector; $("vf-target").value = "";
    render();
    msg("Venture file cleared.", "ok");
  });

  $("print").addEventListener("click", () => window.print());

  /* A tool changed in another tab should not leave this page reporting a
     stale picture — the whole premise is that it reflects the workspace. */
  window.addEventListener("storage", e => {
    if (e.key && JKW.KEY_RE.test(e.key)) { prof = JKW.profile(); render(); }
  });

  render();
})();
