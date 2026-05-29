/* ============================================================
   DN CONSULTANCY — shared client-side helpers (v2.0)
   No network calls. All state in localStorage on this device.
   ============================================================ */

const STORE_KEY = "dn_airline_scorecard_v2";

/* ---- inline DN monogram logo (arc + spear motif) ----
   Self-contained SVG so the toolkit works fully offline.
   Replace with the official 1.png when supplied. */
const DN_LOGO = `<svg class="logo" viewBox="0 0 64 64" role="img" aria-label="DN Consultancy">
  <circle cx="32" cy="32" r="30" fill="none" stroke="#C9A84C" stroke-width="2.5"/>
  <path d="M14 44 V20 h9 c8 0 13 5 13 12 s-5 12 -13 12 z M21 27 v10 h2 c4 0 6 -2 6 -5 s-2 -5 -6 -5 z"
        fill="#1C1C1C"/>
  <path d="M37 44 V20 h6 l9 16 V20 h6 v24 h-6 l-9 -16 v16 z" fill="#4A7FA5"/>
  <path d="M8 56 L56 8" stroke="#C9A84C" stroke-width="2" stroke-linecap="round"/>
  <path d="M56 8 l-7 1 l1 6 z" fill="#C9A84C"/>
</svg>`;

/* ---- partner / white-label handling (?partner=AFRAA) ---- */
function applyPartner() {
  const p = new URLSearchParams(location.search).get("partner");
  if (!p) return null;
  const cfg = (window.DN && DN.partners[p.toUpperCase()]) || null;
  if (!cfg) return null;
  document.body.classList.add("has-partner", "partner-" + p.toLowerCase());
  document.documentElement.style.setProperty("--accent", cfg.accent);
  document.documentElement.style.setProperty("--accent-deep", cfg.accentDeep);
  document.querySelectorAll("[data-cobrand]").forEach(el => el.textContent = cfg.cobrand);
  document.querySelectorAll("img.partner-logo").forEach(img => { img.src = cfg.logo; img.alt = cfg.label; });
  // preserve partner param across internal navigation
  document.querySelectorAll('a[data-keep-partner]').forEach(a => {
    const u = new URL(a.getAttribute("href"), location.href);
    u.searchParams.set("partner", p);
    a.setAttribute("href", u.pathname.replace(/^\//,'') + u.search);
  });
  return cfg;
}

/* ---- nav (mobile toggle) + brand/footer injection ---- */
function mountChrome() {
  document.querySelectorAll("[data-logo]").forEach(el => el.innerHTML = DN_LOGO);
  const toggle = document.querySelector(".nav-toggle");
  if (toggle) toggle.addEventListener("click", () =>
    document.querySelector(".nav-links")?.classList.toggle("open"));
  document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());
  document.querySelectorAll("[data-version]").forEach(el => el.textContent = DN.brand.version);
  document.querySelectorAll("[data-email]").forEach(el => {
    el.textContent = DN.brand.email;
    if (el.tagName === "A") el.href = "mailto:" + DN.brand.email;
  });
}

/* ---- storage ---- */
function saveAnswers(obj) { localStorage.setItem(STORE_KEY, JSON.stringify(obj)); }
function loadAnswers() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; } }
function clearAnswers() { localStorage.removeItem(STORE_KEY); }

/* ---- scoring engine ----
   answers: { "<domainId>": [s0..s4 per question] }
   returns { domains:[{id,name,weight,pct,answered,total,rag}], index, answeredAll } */
function computeScores(answers) {
  let weighted = 0, wsum = 0, answeredAll = true;
  const domains = DN.domains.map(d => {
    const arr = answers[d.id] || [];
    const answered = arr.filter(v => Number.isInteger(v)).length;
    const total = d.questions.length;
    if (answered < total) answeredAll = false;
    const sum = arr.reduce((a, v) => a + (Number.isInteger(v) ? v : 0), 0);
    const pct = answered ? Math.round((sum / (answered * 4)) * 100) : 0;
    weighted += pct * d.weight; wsum += d.weight;
    return { id: d.id, name: d.name, weight: d.weight, pct, answered, total,
             rag: DN.rag(pct), blurb: d.blurb, rxCategory: d.rxCategory, dnTool: d.dnTool, fuelLink: d.fuelLink };
  });
  return { domains, index: wsum ? Math.round(weighted / wsum) : 0, answeredAll };
}

function indexVerdict(idx) {
  if (idx < 45) return { band: "Turnaround required", color: "var(--dn-red)",
    text: "Multiple foundational gaps. A structured 90-day intervention is warranted before further investment in software." };
  if (idx < 65) return { band: "Material gaps to close", color: "var(--dn-amber)",
    text: "Solid in parts, but priority gaps are eroding performance. Targeted fixes can unlock value quickly." };
  if (idx < 80) return { band: "Competitive, with upside", color: "var(--dn-green)",
    text: "A healthy operation. Focused optimisation in the weaker domains will sharpen the cost and revenue edge." };
  return { band: "Best-in-class trajectory", color: "var(--dn-green)",
    text: "Strong across the board. The opportunity is to defend the lead and institutionalise the discipline." };
}

if (typeof window !== "undefined") {
  Object.assign(window, { STORE_KEY, DN_LOGO, applyPartner, mountChrome,
    saveAnswers, loadAnswers, clearAnswers, computeScores, indexVerdict });
}
