/* Implementation & Programme Planner.

   The platform could size a venture, certify it, staff it, structure it
   and buy one — and had nothing to say about how any of it gets run.
   That gap showed in client work: every question after "what does it
   cost" is a delivery question, and the answers were living in
   engagement notes rather than in the toolkit.

   The organising idea is that this sector's milestones are owned by the
   regulator. A plan against dates reports green until a gate fails to
   open; a plan against gate criteria reports the truth continuously,
   because progress is evidence assembled rather than time elapsed.

   The one number here that does not exist anywhere else on the platform
   is capital at risk: money committed at a gate whose evidence is not
   yet in hand. It is the most expensive mistake a first-time applicant
   makes and it is invisible in every cost model, because a cost model
   records what is spent and not what was true when it was spent. */

(function () {
  applyPartner(); mountChrome();

  const store = toolStore("implementation");
  let state = store.load();
  const $ = id => document.getElementById(id);
  state.ev = state.ev || {};        // "<gateId>|<hash of criterion>" -> true
  state.cap = state.cap || {};      // gateId -> capital committed
  state.ws = state.ws || {};        // workstream id -> status

  const WS_STATUS = ["Not started", "Under way", "On track", "At risk"];
  /* Gate phases carry this tool's own short names; the schedule is built
     from JKV.phaseSpine, which uses the Authority's. Mapped by id rather
     than by position: the first version indexed tl.phases numerically,
     which was right only for as long as nobody inserted or reordered a
     phase in the spine. The day someone did, every gate date would have
     moved one phase to the left without raising anything. */
  const SPINE_OF = { pre: "pre", apply: "formal", doc: "docs", demo: "demo", cert: "cert" };

  /* ---------- venture file ---------- */
  $("vf-sector").innerHTML = JKV.sectors.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
  let prof = JKW.profile();
  $("vf-name").value = prof.name; $("vf-sector").value = prof.sector; $("vf-target").value = prof.target;
  ["vf-name", "vf-sector", "vf-target"].forEach(id => $(id).addEventListener("input", () => {
    JKW.saveProfile({ name: $("vf-name").value, sector: $("vf-sector").value, target: $("vf-target").value });
    prof = JKW.profile();
    render();
  }));

  const sector = () => JKV.sector(prof.sector) || JKV.sector("aoc");
  const timeline = () => { try { return JKW.timeline(prof, JKW.modules(prof)); } catch { return null; } };

  /* Each gate sits at the end of the phase it governs, because a gate
     is what closes a phase rather than what opens one. */
  function gateDate(g, tl) {
    if (!tl) return null;
    const p = tl.phases.find(x => x.id === SPINE_OF[g.phase]);
    return p ? p.to : null;
  }

  /* Evidence ticks are keyed by the criterion, not by its position in the
     list. Keying by index meant that inserting or reordering a criterion
     silently moved every tick below it onto a different line, so a saved
     programme would show evidence in hand against something nobody had
     confirmed — the one failure a gate register cannot have. Hashing the
     text also drops a tick when the criterion is reworded, which is the
     behaviour you want: what was confirmed is no longer what is asked. */
  const fnv = str => {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(36);
  };
  const evKey = (g, text) => `${g.id}|${fnv(text)}`;

  /* Ticks saved under the old index keys, moved across once. Without this
     the fix reads to a user as "the tool forgot my progress". */
  (function migrateEvidenceKeys() {
    let moved = false;
    JKI.gates.forEach(g => g.evidence.forEach((text, i) => {
      const old = `${g.id}|${i}`;
      if (Object.prototype.hasOwnProperty.call(state.ev, old)) {
        if (state.ev[old]) state.ev[evKey(g, text)] = true;
        delete state.ev[old];
        moved = true;
      }
    }));
    if (moved) store.save(state);
  })();

  const evidenceDone = g => g.evidence.filter(text => state.ev[evKey(g, text)]).length;
  const gateReady = g => evidenceDone(g) === g.evidence.length;
  const capOf = g => +state.cap[g.id] || 0;
  /* Committed without the evidence that justifies it. The whole point. */
  const atRisk = g => (gateReady(g) ? 0 : capOf(g));

  /* ---------- gates ---------- */
  function renderGates() {
    const tl = timeline();
    $("gates").innerHTML = JKI.gates.map(g => {
      const done = evidenceDone(g), all = g.evidence.length, ready = done === all;
      const d = gateDate(g, tl);
      const risk = atRisk(g);
      return `<div class="card card-flat" style="padding:18px 22px;margin-bottom:14px${risk > 0 ? ";border-left:4px solid var(--jk-red)" : ready ? ";border-left:4px solid var(--jk-green)" : ""}">
        <div class="flex between items-center wrapf gap" style="margin-bottom:.7rem">
          <b style="font-family:var(--sans);font-size:1rem">${g.n}
            ${ready ? '<span class="tag dep" style="vertical-align:middle">evidence complete</span>'
                    : `<span class="tag gap" style="vertical-align:middle">${all - done} outstanding</span>`}</b>
          <span class="muted tnum" style="font-size:.82rem;white-space:nowrap">${d ? fmtDate(d) : "set a target date"}</span>
        </div>
        <div class="muted" style="font-size:.84rem;margin-bottom:.7rem"><b>Releases:</b> ${escapeHtml(g.release)}</div>
        ${g.evidence.map((e, i) => {
          const k = evKey(g, e), on = !!state.ev[k];
          return `<label class="chk${on ? " done" : ""}" data-ev="${k}" style="border:1px solid var(--jk-line);margin-bottom:6px">
              <input type="checkbox" ${on ? "checked" : ""}>
              <span class="chk-t"><b style="font-weight:500">${escapeHtml(e)}</b></span>
            </label>`;
        }).join("")}
        <div class="flex items-center gap wrapf" style="margin-top:.8rem">
          <label class="muted" style="font-size:.82rem" for="cap-${g.id}">Capital committed at this gate (USD)</label>
          <input type="number" id="cap-${g.id}" min="0" step="10000" value="${capOf(g)}"
                 style="width:150px;padding:.42rem .6rem;border:1px solid var(--jk-line-2);border-radius:6px;font-family:var(--sans);font-size:.86rem;text-align:right">
        </div>
        ${risk > 0 ? `<div class="note warn" style="margin-top:.8rem"><b>${fmtMoney(risk)} committed ahead of its evidence</b>${escapeHtml(g.fail)}</div>` : ""}
      </div>`;
    }).join("");

    $("gates").querySelectorAll("[data-ev] input").forEach(inp =>
      inp.addEventListener("change", () => {
        const lab = inp.closest(".chk");
        if (inp.checked) state.ev[lab.dataset.ev] = true; else delete state.ev[lab.dataset.ev];
        render();
      }));
    JKI.gates.forEach(g => {
      const el = $("cap-" + g.id);
      if (el) el.addEventListener("input", () => {
        state.cap[g.id] = clampNum(parseFloat(el.value), 0, 1e12);
        render();
      });
    });
  }

  /* ---------- workstreams ---------- */
  function renderWorkstreams() {
    $("workstreams").innerHTML = JKI.workstreams.map(w => {
      const st = state.ws[w.id] || "Not started";
      return `<div class="card card-flat" style="padding:16px 20px;margin-bottom:10px">
        <div class="flex between items-center wrapf gap">
          <div style="flex:1;min-width:210px">
            <b style="font-family:var(--sans);font-size:.95rem">${escapeHtml(w.n)}
              ${w.lead ? '<span class="tag kcaa" style="vertical-align:middle">critical path</span>' : ""}</b>
            <div class="muted" style="font-size:.83rem;margin-top:.2rem">${escapeHtml(w.d)}</div>
            <div class="muted" style="font-size:.81rem;margin-top:.3rem"><b>Dependency:</b> ${escapeHtml(w.dep)}</div>
          </div>
          <div style="display:grid;gap:6px;min-width:170px">
            <select data-ws="${w.id}" aria-label="${escapeHtml(w.n)} status"
              style="padding:.42rem .6rem;border:1px solid var(--jk-line-2);border-radius:6px;font-family:var(--sans);font-size:.85rem">
              ${WS_STATUS.map(o => `<option${o === st ? " selected" : ""}>${o}</option>`).join("")}
            </select>
            <span class="muted" style="font-size:.78rem">${escapeHtml(w.owner)} · ${escapeHtml(w.cadence)}</span>
          </div>
        </div>
      </div>`;
    }).join("");
    $("workstreams").querySelectorAll("[data-ws]").forEach(sel =>
      sel.addEventListener("change", () => { state.ws[sel.dataset.ws] = sel.value; render(); }));
  }

  function renderStatic() {
    /* Wrapped in .table-scroll: a four-column table cannot shrink to a
       390px viewport, and an unwrapped one pushes the whole page
       sideways instead of scrolling inside its own box. */
    $("indicators").innerHTML =
      `<div class="table-scroll"><table class="dtable"><thead><tr><th>Indicator</th><th>Reported</th><th>Predicts</th><th>Escalate when</th></tr></thead><tbody>` +
      JKI.indicators.map(i => `<tr><td><b>${escapeHtml(i.k)}</b></td><td>${escapeHtml(i.freq)}</td>
        <td class="muted">${escapeHtml(i.predicts)}</td><td>${escapeHtml(i.trigger)}</td></tr>`).join("") +
      `</tbody></table></div>`;
    $("contingencies").innerHTML = JKI.contingencies.map(c =>
      `<div class="note" style="margin-bottom:8px"><b>If ${escapeHtml(c.when)}</b>${escapeHtml(c.then)}</div>`).join("");
  }

  /* ---------- compute ---------- */
  function render() {
    renderGates(); renderWorkstreams();
    const tl = timeline();

    const totalEv = JKI.gates.reduce((a, g) => a + g.evidence.length, 0);
    const doneEv  = JKI.gates.reduce((a, g) => a + evidenceDone(g), 0);
    const pct     = Math.round((doneEv / totalEv) * 100);
    const risk    = JKI.gates.reduce((a, g) => a + atRisk(g), 0);
    const committed = JKI.gates.reduce((a, g) => a + capOf(g), 0);
    const current = JKI.gates.find(g => !gateReady(g)) || null;
    const atRiskGates = JKI.gates.filter(g => atRisk(g) > 0);
    const wsRisk = JKI.workstreams.filter(w => state.ws[w.id] === "At risk");
    const wsIdle = JKI.workstreams.filter(w => (state.ws[w.id] || "Not started") === "Not started");

    $("tl-note").innerHTML = !prof.target
      ? `<div class="note"><b>Set a target certificate date</b>The five gates will be scheduled backwards from it against ${escapeHtml(sector().short)}'s indicative lead band of ${sector().leadMonths[0]}–${sector().leadMonths[1]} months.</div>`
      : tl && tl.late
        ? `<div class="note warn"><b>The target date is already unreachable</b>Working back from ${fmtDate(tl.target)} against a ${sector().leadMonths[0]}–${sector().leadMonths[1]} month lead, this programme needed to start ${tl.slipMonths} month${tl.slipMonths === 1 ? "" : "s"} ago. Either the date moves or the scope narrows — an impossible date costs more credibility than resetting one.</div>`
        : tl && tl.tight
          ? `<div class="note warn"><b>Achievable only on the fast end of the band</b>${tl.monthsToTarget} months to ${fmtDate(tl.target)}. Nothing in the programme can slip without moving the date.</div>`
          : tl
            ? `<div class="note ok"><b>${tl.monthsToTarget} months to ${fmtDate(tl.target)}</b>Inside the ${sector().leadMonths[0]}–${sector().leadMonths[1]} month band for ${escapeHtml(sector().short)}. The gates below are scheduled against it.</div>`
            : "";

    $("prog-kpis").innerHTML = [
      ["Evidence held", `${doneEv}/${totalEv}`, pct === 100 ? "is-green" : pct >= 50 ? "is-amber" : "is-red"],
      ["Capital at risk", risk ? fmtMoney(risk) : "None", risk > 0 ? "is-red" : "is-green"],
      ["Current gate", current ? current.n.split(" — ")[0] : "Cleared", current ? "" : "is-green"],
      ["Months to target", tl ? (tl.monthsToTarget >= 0 ? tl.monthsToTarget : "Past") : "—",
        tl && tl.late ? "is-red" : tl && tl.tight ? "is-amber" : ""]
    ].map(([l, v, c]) => `<div class="kpi ${c}"><div class="kv tnum">${v}</div><div class="kl">${l}</div></div>`).join("");

    /* Ordered by what actually stops the programme. Capital exposed
       against missing evidence outranks a late date, because the date
       can still be moved and the money cannot be un-committed. */
    let v;
    if (risk > 0) v = { h: fmtMoney(risk), b: "Capital committed ahead of its evidence",
      q: `${atRiskGates.map(g => g.n.split(" — ")[0]).join(", ")} ${atRiskGates.length > 1 ? "have" : "has"} money against ${atRiskGates.length > 1 ? "them" : "it"} and incomplete evidence. This is the exposure no cost model shows, because a cost model records what was spent and not what was true when it was spent.`, c: "#ff8a80" };
    else if (tl && tl.late) v = { h: "Date unreachable", b: `${tl.slipMonths} months behind the band`,
      q: `No capital is exposed, which is the right position to be in — but the target cannot be met from here. Reset it before the funding conversation rather than during it.`, c: "#ff8a80" };
    else if (!current) v = { h: "All gates cleared", b: "Evidence complete across the programme",
      q: `${fmtMoney(committed)} committed, every gate evidenced. What remains is the Authority's own timetable and the surveillance clock that starts the day the certificate issues.`, c: "#5cd6a0" };
    else v = { h: current.n.split(" — ")[0], b: current.n.split(" — ")[1] || "In progress",
      q: `${current.evidence.length - evidenceDone(current)} item${current.evidence.length - evidenceDone(current) === 1 ? "" : "s"} outstanding before this gate opens${capOf(current) ? "" : ", and no capital committed against it yet — the right order"}.`, c: "#f0c14b" };
    $("status-head").textContent = v.h; $("status-head").style.color = v.c;
    $("status-band").textContent = v.b; $("status-band").style.color = v.c;
    $("status-qual").textContent = v.q;

    const acts = [];
    if (current) current.evidence.filter(text => !state.ev[evKey(current, text)])
      .forEach(e => acts.push([current.n.split(" — ")[0], e]));
    wsRisk.forEach(w => acts.push(["At risk", `${w.n} — ${w.owner} to report at the next ${w.cadence.toLowerCase()} review`]));
    wsIdle.filter(w => w.lead).forEach(w => acts.push(["Critical path", `${w.n} has not started, and it cannot be compressed later`]));
    $("next-actions").innerHTML = acts.length
      ? acts.slice(0, 7).map(([t, a]) =>
          `<div style="padding:.5rem 0;border-bottom:1px solid rgba(255,255,255,.12);font-size:var(--fs-sm)">
             <b style="color:var(--jk-amber);font-size:var(--fs-xs);text-transform:uppercase;letter-spacing:.08em">${escapeHtml(t)}</b>
             <div>${escapeHtml(a)}</div></div>`).join("")
      : `<p class="qual" style="margin:0">Nothing outstanding. Hold the cadence and keep the Schedule of Events current.</p>`;

    summarise({ pct, doneEv, totalEv, risk, committed, current, atRiskGates, wsRisk, wsIdle, tl });
    store.save(state);
  }

  /* ---- answer-first opening page for the printed pack ----

     Capital at risk leads whenever it exists. A programme review that
     opens with schedule while money sits against unevidenced gates has
     reported the recoverable problem above the unrecoverable one. */
  function summarise(a) {
    const f = [];

    if (a.risk > 0) f.push({ sev: "stop", h: `${fmtMoney(a.risk)} committed ahead of the evidence for it`,
      d: `${a.atRiskGates.map(g => `${g.n.split(" — ")[0]} (${fmtMoney(atRisk(g))})`).join("; ")}. Each of these is money spent against a position the Authority has not yet confirmed. It is the commonest and most expensive error in a first certification, and it does not appear in any cost model.` });

    if (a.tl && a.tl.late) f.push({ sev: "stop", h: `The target certificate date is ${a.tl.slipMonths} months behind the achievable band`,
      d: `Working back from ${fmtDate(a.tl.target)} against ${sector().leadMonths[0]}–${sector().leadMonths[1]} months for ${sector().short}, the programme needed to start earlier. Reset the date before the funding conversation, not during it.` });
    else if (a.tl && a.tl.tight) f.push({ sev: "warn", h: "Achievable only on the fast end of the lead band",
      d: `${a.tl.monthsToTarget} months to ${fmtDate(a.tl.target)}. Nothing can slip without moving the date, so every gate needs its evidence assembled ahead of the phase that closes it rather than during it.` });

    if (a.wsIdle.filter(w => w.lead).length) f.push({ sev: "warn",
      h: `${a.wsIdle.filter(w => w.lead).length} critical-path workstream${a.wsIdle.filter(w => w.lead).length > 1 ? "s have" : " has"} not started`,
      d: `${a.wsIdle.filter(w => w.lead).map(w => w.n).join("; ")}. These are the two that cannot be compressed later: the Authority sets the pace of one, and recruitment lead time sets the pace of the other.` });

    if (a.wsRisk.length) f.push({ sev: "warn", h: `${a.wsRisk.length} workstream${a.wsRisk.length > 1 ? "s" : ""} reported at risk`,
      d: `${a.wsRisk.map(w => `${w.n} (${w.owner})`).join("; ")}. Each needs a recovery position at the next review, not a status update.` });

    if (a.current) f.push({ sev: "note", h: `Current gate: ${a.current.n}`,
      d: `${a.current.evidence.filter(text => !state.ev[evKey(a.current, text)]).slice(0, 3).join("; ")}${a.current.evidence.length - evidenceDone(a.current) > 3 ? "; and more" : ""}. Releases ${a.current.release.toLowerCase()}.` });

    if (!f.some(x => x.sev === "stop" || x.sev === "warn"))
      f.unshift({ sev: "ok", h: a.current ? `On plan at ${a.pct}% of evidence assembled` : "Every gate cleared",
        d: `${a.doneEv} of ${a.totalEv} evidence items held and ${fmtMoney(a.committed)} committed, none of it ahead of its gate. The programme is being run in the right order.` });

    mountPrintSummary({
      title: `${prof.name || "Venture"} — ${sector().name} implementation`,
      verdict: a.risk > 0
        ? `${fmtMoney(a.risk)} of committed capital sits ahead of the evidence that justifies it, at ${a.pct}% of programme evidence assembled.`
        : `${a.pct}% of programme evidence assembled, ${fmtMoney(a.committed)} committed and none of it ahead of its gate` +
          (a.tl ? `, ${a.tl.monthsToTarget >= 0 ? `${a.tl.monthsToTarget} months to target` : "target date passed"}.` : "."),
      findings: f,
      basis: `Five stage gates across the ${sector().short} five-phase certification process, each carrying the evidence required before it opens and the capital it releases. Gate dates are scheduled backwards from the target against an indicative lead of ${sector().leadMonths[0]}–${sector().leadMonths[1]} months — JK planning figures, not an Authority commitment. Capital at risk is money recorded as committed at a gate whose evidence is incomplete.`
    });
  }

  /* ---------- actions ---------- */
  $("print").addEventListener("click", () => window.print());
  $("reset").addEventListener("click", () => {
    if (!confirm("Clear the gate evidence, capital and workstream status? The venture name and date are kept.")) return;
    state = { ev: {}, cap: {}, ws: {} };
    render();
  });
  wireToolEnquiryForm("impl-enquiry", "Implementation & Programme Planner");
  mountPrintHead("Implementation & Programme Planner", "Stage gates, capital at risk and the critical path");

  renderStatic();
  render();
})();
