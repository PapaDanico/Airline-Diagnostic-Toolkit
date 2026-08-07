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

    store.save(state);
  }

  $("print").addEventListener("click", () => window.print());

  /* ---------- restore ---------- */
  state.sector = state.sector || "aoc";
  sel.value = state.sector;
  selectArch(state.arch || "holdco", false);
})();
