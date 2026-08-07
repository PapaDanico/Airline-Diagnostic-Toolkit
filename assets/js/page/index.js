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

/* build-track tool cards */
const BUILD = [
  { href: "tools/venture-dashboard.html",       ref: "V0", n: "Venture Control Room",    d: "All four tools in one Launch Readiness Index, with the critical path scheduled back from your target date." },
  { href: "tools/certification-navigator.html", ref: "V1", n: "Certification Navigator", d: "Six sectors mapped to the five-phase KCAA process, gate by gate, every requirement cited." },
  { href: "tools/venture-builder.html",         ref: "V2", n: "Venture Builder",         d: "CAPEX by sector, capital stack, senior-debt sizing, DSCR sensitivity and break-even." },
  { href: "tools/corporate-structure.html",     ref: "V3", n: "Corporate Structure",     d: "HoldCo / SPV / OpCo layering with look-through economics and lender-conflict checks." },
  { href: "tools/organogram-planner.html",      ref: "V4", n: "Organogram Planner",      d: "Required postholders, deputy cover, single-point-of-failure detection and headcount ramp." }
];
document.getElementById("build-tools").innerHTML = BUILD.map(t =>
  `<a class="card" href="${t.href}" style="color:inherit;display:block" data-keep-partner>
     <span class="ref">${t.ref} · Free</span>
     <h3 style="font-size:1.15rem;margin:.35rem 0 .4rem">${t.n}</h3>
     <p class="muted" style="font-size:.87rem;margin:0">${t.d}</p>
   </a>`).join("");

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
