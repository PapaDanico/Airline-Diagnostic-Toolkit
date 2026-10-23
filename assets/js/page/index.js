/* Extracted verbatim from index.html so the site can carry a real
   script-src. Behaviour is unchanged: the tag sits where the inline
   block sat, with no defer or async, so execution order is identical.
   Edit here, not in the HTML. */

applyPartner(); mountChrome();

/* market context — the honest framing for both audiences */
document.getElementById("market-stats").innerHTML = JKV.market.stats.map(s =>
  `<div style="display:flex;gap:.9rem;align-items:baseline;padding:.5rem 0;border-bottom:1px solid rgba(255,255,255,.12)">
     <b style="font-family:var(--serif);font-size:1.5rem;color:var(--jk-amber);min-width:64px;line-height:1.1">${s.v}</b>
     <span style="font-size:.86rem;color:rgba(255,255,255,.88)">${s.l}<br>
       <span style="color:rgba(255,255,255,.55);font-size:.79rem">${s.sub}</span></span>
   </div>`).join("");
document.getElementById("market-src").textContent = "Source: " + JKV.market.asOf;

/* build-track tool cards: the list is the menu's own Build group, so a tool
   added to the menu appears here and in the count without a second edit. The
   text and reference numbers are kept per file; a tool with none still gets
   a card with its menu label. */
const BUILD_COPY = {
  "tools/venture-dashboard.html":       ["V0",  "All the build tools in one Launch Readiness Index, with the critical path scheduled back from your target date."],
  "tools/certification-navigator.html": ["V1",  "Six sectors mapped to the five-phase KCAA process, gate by gate, every requirement cited."],
  "tools/venture-builder.html":         ["V2",  "CAPEX by sector, capital stack, senior-debt sizing, DSCR sensitivity and break-even."],
  "tools/corporate-structure.html":     ["V3",  "HoldCo / SPV / OpCo layering with look-through economics and lender-conflict checks."],
  "tools/organogram-planner.html":      ["V4",  "Required postholders, deputy cover, single-point-of-failure detection and headcount ramp."],
  "tools/revenue-builder.html":         ["V5",  "Charter rates, block hours and retainers, tested against the capital they must service."],
  "tools/implementation-planner.html":  ["V6",  "Run the programme by gate rather than by date, with capital released only against evidence."],
  "tools/plan-consistency.html":        ["V7",  "Find the same fact stated two ways and the totals that do not add up, before the Board does."],
  "tools/returns-solver.html":          ["V8",  "Start from the capital and the hurdle and ask what must be true: debt capacity, margin, exit value."],
  "tools/fleet-crew.html":              ["V9",  "Pilots by type pool, aircraft-years and control-room staffing from an entry-into-service list."],
  "tools/safety-map.html":              ["V10", "Hazards, barriers and which SMS elements the barriers in place actually evidence."],
  "tools/aoc-acquisition.html":         ["V11", "Buy an existing certificate or earn a new one: premium, deal structure and remediation priced."]
};
const TOOL_TOTAL = TOOL_MENU.reduce((n, g) => n + g.items.length, 0);
document.querySelectorAll("[data-tool-count]").forEach(el => { el.textContent = TOOL_TOTAL; });
document.getElementById("build-tools").innerHTML = TOOL_MENU[0].items.map(t => {
  const c = BUILD_COPY[t.file] || ["", ""];
  return `<a class="card" href="${t.file}" style="color:inherit;display:block" data-keep-partner>
     <span class="ref">${c[0] ? c[0] + " · " : ""}Free</span>
     <h3 style="font-size:1.15rem;margin:.35rem 0 .4rem">${t.label}</h3>
     ${c[1] ? `<p class="muted" style="font-size:.87rem;margin:0">${c[1]}</p>` : ""}
   </a>`;
}).join("");

/* sample radar — an illustrative mid-transformation carrier, with a dashed
   overlay drawn from public AFRAA/IATA aggregates (see the methodology page) */
{
  const sample  = [72, 58, 64, 47, 55, 61, 68, 52];
  const typical = [55, 52, 50, 42, 56, 45, 50, 48];
  drawRadar(document.getElementById("hero-radar"),
    JK.domains.map((d, i) => ({ name: d.name, pct: sample[i] })), typical);
}

/* engagement phases */
const ph = document.getElementById("phases");
JK.phases.forEach(p => ph.insertAdjacentHTML("beforeend",
  `<button type="button" class="phase" aria-expanded="false">
     <span class="days">${p.days}</span><h3>${p.t}</h3><p>${p.d}</p>
     <span class="phase-hint" aria-hidden="true">＋ details</span>
     <span class="phase-detail" hidden>
       <b>What we use</b>
       <ul>${p.tools.map(t => `<li>${t}</li>`).join("")}</ul>
       <b>What you get</b>
       <span class="po">${p.outcome}</span>
     </span>
   </button>`));
ph.addEventListener("click", e => {
  const card = e.target.closest(".phase");
  if (!card) return;
  const open = card.classList.toggle("open");
  card.setAttribute("aria-expanded", open);
  card.querySelector(".phase-detail").hidden = !open;
  card.querySelector(".phase-hint").textContent = open ? "－ close" : "＋ details";
});

/* toolbox spotlight */
const ts = document.getElementById("toolbox-spotlight");
JK.toolboxes.forEach(tb => ts.insertAdjacentHTML("beforeend",
  `<div class="card"><span class="ref">Toolbox ${tb.box}${tb.locked ? "" : " · Free"}</span>
    <h3 style="font-size:1.2rem">${tb.title}</h3>
    <p class="muted" style="font-size:.86rem">${tb.tools.map(t => t.ref + " " + t.n).join(" · ")}</p></div>`));
