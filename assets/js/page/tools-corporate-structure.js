/* Extracted verbatim from tools/corporate-structure.html so the site can carry a real
   script-src. Behaviour is unchanged: the tag sits where the inline
   block sat, with no defer or async, so execution order is identical.
   Edit here, not in the HTML. */

(function () {
  applyPartner(); mountChrome();
  mountPrintHead("Corporate Structure Designer");

  const store = toolStore("structure");
  let state = store.load();
  state.holders = state.holders || {};
  state.checks  = state.checks  || {};
  const $ = id => document.getElementById(id);

  const SUBSTANCE_PER_ENTITY = 32500;  // indicative USD/yr mid-point

  /* Default shareholding per tier, per archetype. Parties are labelled by
     role rather than by name so the model reads as a template. */
  const DEFAULTS = {
    simple:    { op:    [{n:"Local founders", p:100, local:true}] },
    holdco:    { hold:  [{n:"Founders", p:60, local:true}, {n:"Investors", p:40, local:false}],
                 op:    [{n:"HoldCo", p:100, chain:"hold"}] },
    threetier: { trust: [{n:"Founder", p:100, local:true}],
                 hold:  [{n:"Founder trust", p:60, chain:"trust"}, {n:"Investor vehicle", p:40, local:false}],
                 spv:   [{n:"HoldCo", p:92.5, chain:"hold"}, {n:"Lender", p:7.5, local:false}],
                 op:    [{n:"SPV", p:75, chain:"spv"}, {n:"Founder trust (direct)", p:20, chain:"trust", direct:true}, {n:"Management", p:5, local:true}] }
  };

  /* ---------- archetype picker ---------- */
  const ag = $("arch-grid");
  JKV.structures.forEach(st => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "sector"; b.dataset.arch = st.id;
    b.setAttribute("aria-pressed", "false");
    b.innerHTML = `<h3>${escapeHtml(st.name)}</h3><p>${escapeHtml(st.when)}</p>
      <div class="s-reg">${st.tiers.length} entit${st.tiers.length === 1 ? "y" : "ies"}</div>`;
    b.addEventListener("click", () => selectArch(st.id, true));
    ag.appendChild(b);
  });

  /* ---------- sector select ---------- */
  const sel = $("sector");
  JKV.sectors.forEach(s => {
    const o = document.createElement("option");
    o.value = s.id; o.textContent = s.name; sel.appendChild(o);
  });
  sel.addEventListener("change", () => { state.sector = sel.value; recompute(); });

  function selectArch(id, reset) {
    const st = JKV.structures.find(s => s.id === id);
    if (!st) return;
    state.arch = id;
    if (reset || state.archFor !== id) {
      state.archFor = id;
      state.holders = JSON.parse(JSON.stringify(DEFAULTS[id] || {}));
    }
    ag.querySelectorAll(".sector").forEach(el => el.setAttribute("aria-pressed", String(el.dataset.arch === id)));
    renderTree(st);
    renderChecks();
    recompute();
  }

  /* ---------- tree ---------- */
  function renderTree(st) {
    const host = $("tree");
    host.innerHTML = st.tiers.map(t => {
      const hs = state.holders[t.k] || [];
      const rows = hs.map((h, i) => `
        <div class="holder-row">
          <input type="text" value="${escapeHtml(h.n)}" data-tier="${t.k}" data-i="${i}" data-f="n"
                 aria-label="Holder ${i + 1} name at ${escapeHtml(t.name)}" style="padding:.5rem .7rem;border:1px solid var(--jk-line-2);border-radius:6px;font-family:var(--sans);font-size:.87rem">
          <input type="number" value="${h.p}" min="0" max="100" step="0.5" data-tier="${t.k}" data-i="${i}" data-f="p"
                 aria-label="Percentage held by holder ${i + 1} at ${escapeHtml(t.name)}" style="padding:.5rem .6rem;border:1px solid var(--jk-line-2);border-radius:6px;font-family:var(--sans);font-size:.87rem;text-align:right">
          <span class="muted" style="font-size:.85rem">%</span>
        </div>`).join("");
      const sum = hs.reduce((a, h) => a + (+h.p || 0), 0);
      const warn = Math.abs(sum - 100) > 0.5
        ? `<p class="muted" style="font-size:.78rem;color:var(--jk-red-dk);margin:.3rem 0 0">Holdings total ${sum.toFixed(1)}% — should be 100%.</p>` : "";
      return `<div class="tier">
          <div class="entity is-${t.k}">
            <div class="e-jur">${t.jur}</div>
            <h3>${escapeHtml(t.name)}</h3>
            <p class="e-note">${t.note}</p>
            <div style="margin-top:.8rem">${rows}${warn}</div>
          </div>
        </div>`;
    }).join("");

    host.querySelectorAll("input").forEach(inp => {
      inp.addEventListener("input", () => {
        const { tier, i, f } = inp.dataset;
        const h = state.holders[tier][+i];
        h[f] = f === "p" ? (parseFloat(inp.value) || 0) : inp.value;
        recompute();
      });
    });
  }

  /* ---------- governance checks ---------- */
  function renderChecks() {
    const sec = state.sector || "aoc";
    const list = JKV.structureChecks.filter(c => c.sectors.includes("*") || c.sectors.includes(sec));
    $("checks").innerHTML = list.map(c => {
      const on = !!state.checks[c.id];
      return `<label class="chk${on ? " done" : ""}" data-c="${c.id}" style="border:1px solid var(--jk-line);margin-bottom:8px">
          <input type="checkbox" ${on ? "checked" : ""}>
          <span class="chk-t"><b>${c.t}</b><small>${c.d}</small></span>
        </label>`;
    }).join("");
    $("checks").querySelectorAll("input").forEach(inp => {
      inp.addEventListener("change", () => {
        const lab = inp.closest(".chk");
        const id = lab.dataset.c;
        if (inp.checked) state.checks[id] = true; else delete state.checks[id];
        lab.classList.toggle("done", inp.checked);
        recompute();
      });
    });
  }

  /* The look-through walker lives in common.js — the Venture Control Room
     reads the same saved chain to report local effective interest, and a
     second implementation of this cascade would drift from the first. */

  /* ---------- recompute ---------- */
  function recompute() {
    const st = JKV.structures.find(s => s.id === state.arch);
    if (!st) return;
    state.sector = state.sector || sel.value;
    sel.value = state.sector;

    const parties = lookThrough(state.holders);
    const entries = Object.entries(parties)
      .map(([n, v]) => ({ n, ...v, total: v.direct + v.indirect }))
      .sort((a, b) => b.total - a.total);

    const tb = $("lookthrough").querySelector("tbody");
    tb.innerHTML = entries.length ? entries.map(e => {
      const pos = e.total > 50 ? "Control" : e.total >= 25 ? "Significant minority" : e.total >= 10 ? "Minority" : "Small holding";
      // e.n is visitor-typed — escape before it reaches innerHTML.
      return `<tr>
        <td><b>${escapeHtml(e.n)}</b>${e.local ? ' <span class="tag dep">local</span>' : ""}</td>
        <td class="num">${e.direct ? e.direct.toFixed(2) + "%" : "—"}</td>
        <td class="num">${e.indirect ? e.indirect.toFixed(2) + "%" : "—"}</td>
        <td class="num"><b>${e.total.toFixed(2)}%</b></td>
        <td>${pos}</td></tr>`;
    }).join("") : `<tr><td colspan="5" class="muted">Set shareholdings above.</td></tr>`;

    const grand = entries.reduce((a, e) => a + e.total, 0);
    $("lookthrough").querySelector("tfoot").innerHTML =
      `<tr><td>Total</td><td class="num"></td><td class="num"></td><td class="num">${grand.toFixed(2)}%</td><td></td></tr>`;

    const localPct = entries.filter(e => e.local).reduce((a, e) => a + e.total, 0);

    // ownership-and-control test note
    const sec = JKV.sector(state.sector);
    const needsControl = state.sector === "aoc";
    let cn = "";
    if (Math.abs(grand - 100) > 1) {
      cn = `<div class="note warn"><b>Chain does not resolve to 100%</b>Effective interests total ${grand.toFixed(2)}%. Check that each tier's holdings sum to 100 before reading anything else from this table.</div>`;
    } else if (needsControl && localPct < 50) {
      cn = `<div class="note warn"><b>Ownership-and-control exposure</b>Local effective interest is ${localPct.toFixed(1)}%. Air-service licensing commonly requires substantial ownership and effective control by nationals. A structure can satisfy company law and still fail the aviation test — confirm the current threshold and how the Authority measures it before you incorporate.</div>`;
    } else if (needsControl) {
      cn = `<div class="note ok"><b>Local effective interest ${localPct.toFixed(1)}%</b>Above a simple majority. Confirm how the Authority measures "effective control" — voting rights, board composition and veto rights matter alongside the economics.</div>`;
    } else {
      cn = `<div class="note"><b>Local effective interest ${localPct.toFixed(1)}%</b>${sec ? sec.short : "This sector"} does not carry the air-service ownership-and-control test, but a meaningful local stake still helps with beneficial-ownership disclosure and any preferential tax status.</div>`;
    }
    $("control-note").innerHTML = cn;

    // pros/cons of the archetype
    const offshore = st.tiers.filter(t => /offshore/i.test(t.jur)).length;
    const checksList = JKV.structureChecks.filter(c => c.sectors.includes("*") || c.sectors.includes(state.sector));
    const done = checksList.filter(c => state.checks[c.id]).length;

    $("r-local").textContent  = localPct.toFixed(1) + "%";
    $("r-tiers").textContent  = st.tiers.length;
    $("r-checks").textContent = `${done}/${checksList.length}`;
    $("r-sub").textContent    = offshore ? fmtMoney(offshore * SUBSTANCE_PER_ENTITY) + "/yr" : "None";

    const ck = $("r-checks").parentElement;
    ck.className = "kpi " + (done === checksList.length ? "is-green" : done >= checksList.length / 2 ? "is-amber" : "is-red");

    let v;
    if (Math.abs(grand - 100) > 1) v = { c: "note warn", t: "Chain incomplete", d: "Fix the tier holdings before drawing conclusions." };
    else if (done < checksList.length / 2) v = { c: "note warn", t: "Governance gaps open", d: `${checksList.length - done} of ${checksList.length} checks unaddressed. These are the questions diligence asks first.` };
    else if (needsControl && localPct < 50) v = { c: "note warn", t: "Control test at risk", d: "Resolve the ownership-and-control position before incorporating." };
    else v = { c: "note ok", t: "Coherent structure", d: `${st.name}. ${offshore ? "Budget substance from incorporation, not as a retrofit." : "No offshore substance burden."}` };
    $("verdict").innerHTML = `<div class="${v.c}" style="margin:0"><b>${v.t}</b>${v.d}</div>`;

    const body =
      `Archetype: ${st.name}\n` +
      `Operating sector: ${sec ? sec.name : state.sector}\n` +
      `Local effective interest: ${localPct.toFixed(1)}%\n` +
      `Entities in chain: ${st.tiers.length} (${offshore} offshore)\n` +
      `Governance checks addressed: ${done}/${checksList.length}\n\n` +
      entries.map(e => `  ${e.n}: ${e.total.toFixed(2)}% (direct ${e.direct.toFixed(2)}%, indirect ${e.indirect.toFixed(2)}%)`).join("\n") +
      `\n\nI would like this structure reviewed.`;
    const href = toolMailto("Structure", st.name, body);
    $("talk").href = href; $("cta-mail").href = href;
    wireToolEnquiryForm("struct-enquiry", "Corporate Structure Designer");

    summarise({ st, sec, grand, localPct, entries, needsControl, offshore, done, checksList });
    store.save(state);
  }

  /* ---- answer-first opening page for the printed pack ----

     An unresolved chain leads, and everything else is suppressed behind
     it: if the tiers do not sum to 100 then the local interest figure,
     the control test and the concentration reading are all computed off
     a broken cascade, and printing them under a confident heading is
     how a pack gets taken into a board meeting and believed.

     Once the chain resolves, the ownership-and-control test leads,
     because it is the one finding here that company law will not catch.
     A structure can be perfectly valid at the registry and still fail
     the air-service licence, and that failure surfaces after
     incorporation — when it is expensive to unwind. */
  function summarise({ st, sec, grand, localPct, entries, needsControl, offshore, done, checksList }) {
    const f = [];
    const broken = Math.abs(grand - 100) > 1;

    if (broken) {
      f.push({ sev: "stop", h: `Ownership chain resolves to ${grand.toFixed(2)}%, not 100%`,
        d: `Effective interests across the cascade do not close. Every figure below it — local interest, the control test, concentration — is computed from this chain, so none of them can be relied on until each tier's holdings sum to 100.` });
    } else {
      if (needsControl) f.push({ sev: localPct < 50 ? "stop" : "ok",
        h: localPct < 50
          ? `Local effective interest ${localPct.toFixed(1)}% — below the ownership-and-control threshold`
          : `Local effective interest ${localPct.toFixed(1)}%`,
        d: localPct < 50
          ? `Air-service licensing commonly requires substantial ownership and effective control by nationals. This structure can satisfy company law and still fail the aviation test, and it fails it after incorporation — confirm the current threshold and how the Authority measures it before the entities exist.`
          : `Above a simple majority on the economics. Effective control is measured on more than shareholding: voting rights, board composition, veto rights and who appoints the Accountable Manager all count, and a structure can clear the percentage and fail on those.` });
      else f.push({ sev: "note", h: `${sec ? sec.short : "This sector"} carries no air-service control test`,
        d: `Local effective interest is ${localPct.toFixed(1)}%. The ownership-and-control requirement attaches to the air-service licence rather than to this certificate, though a meaningful local stake still helps with beneficial-ownership disclosure and any preferential tax status.` });

      /* A single holder above 50% is a governance fact worth stating
         even when the licensing test passes: it decides who can be
         outvoted, which is what diligence is actually asking. */
      const top = entries[0];
      if (top && top.total > 50) f.push({ sev: "note",
        /* Name in the description, not the heading: holder names are
           visitor-typed and may be singular or plural, and "Founders
           holds 60%" is the kind of sentence that makes a board pack
           look machine-generated. */
        h: `A single party controls ${top.total.toFixed(2)}% on a look-through basis`,
        d: `${top.n}${top.indirect ? `, with ${top.indirect.toFixed(2)} points of that held indirectly through the chain rather than on the operating company's register` : ""}. Diligence will ask who can be outvoted before it asks anything about the percentages.` });
    }

    const openChecks = checksList.length - done;
    if (openChecks > 0) f.push({ sev: done < checksList.length / 2 ? "warn" : "note",
      h: `${openChecks} of ${checksList.length} governance checks unaddressed`,
      d: `${checksList.filter(c => !state.checks[c.id]).slice(0, 3).map(c => c.t).join("; ")}${openChecks > 3 ? `; and ${openChecks - 3} more` : ""}. These are the questions diligence asks first, and they are cheap to answer before incorporation and expensive afterwards.` });

    if (offshore) f.push({ sev: "warn",
      h: `${offshore} offshore entit${offshore > 1 ? "ies carry" : "y carries"} an annual substance cost of ${fmtMoney(offshore * SUBSTANCE_PER_ENTITY)}`,
      d: `Economic-substance regimes require real presence — directors, premises, decision-making in the jurisdiction — not a registered office. Budget it from incorporation: retrofitting substance after a regulator or a bank asks is materially more expensive than building it in.` });

    if (!f.some(x => x.sev === "stop" || x.sev === "warn"))
      f.unshift({ sev: "ok", h: `${st.name} is coherent as drawn`,
        d: `Chain resolves to 100%, ${done} of ${checksList.length} governance checks addressed${offshore ? "" : " and no offshore substance burden"}. The remaining work is documentary rather than structural.` });

    mountPrintSummary({
      title: `${st.name} — ${sec ? sec.name : state.sector}`,
      verdict: broken
        ? `Ownership chain does not resolve — nothing below can be relied on until the tiers sum to 100%`
        : needsControl && localPct < 50
          ? `${localPct.toFixed(1)}% local effective interest against an ownership-and-control test this structure does not currently pass`
          : `${st.tiers.length}-tier structure, ${localPct.toFixed(1)}% local effective interest, ${done} of ${checksList.length} governance checks addressed`,
      findings: f,
      basis: `Effective interests are computed by look-through across every tier of the chain as drawn, not from the operating company's register alone. Substance cost is an indicative ${fmtMoney(SUBSTANCE_PER_ENTITY)} per offshore entity per year. Structural orientation only — not legal, tax or licensing advice, and thresholds change: confirm the current position with counsel in each jurisdiction before incorporating.`
    });
  }

  $("print").addEventListener("click", () => window.print());

  /* ---------- restore ---------- */
  state.sector = state.sector || "aoc";
  sel.value = state.sector;
  selectArch(state.arch || "holdco", false);
})();
