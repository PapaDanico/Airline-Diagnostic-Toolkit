/* ============================================================
   DN CONSULTANCY — shared client-side helpers (v2.0)
   No network calls. All state in localStorage on this device.
   ============================================================ */

const STORE_KEY = "dn_airline_scorecard_v2";

/* ---- asset base ----
   Resolved from common.js's own URL so logo/image paths work whether the
   page lives at the site root (index/diagnostic/results) or in /tools/. */
const ASSET_BASE = (function () {
  const s = document.currentScript && document.currentScript.src;
  return s ? s.replace(/assets\/js\/common\.js(\?.*)?$/, "") : "";
})();

/* ---- official DN Consultancy badge (circular D/N emblem) ----
   Transparent-background PNG; on dark surfaces the footer applies
   .logo-invert (brightness(0) invert(1)) to render it white. */
const DN_LOGO = `<img class="logo" src="${ASSET_BASE}assets/img/dn-badge.png" alt="DN Consultancy" width="40" height="40">`;

/* ---- partner / white-label handling (?partner=<KEY>) ----
   No-op unless ?partner= matches a key registered in DN.partners
   (empty by default — this is a DN Consultancy product). */
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
  // preserve partner param across internal navigation, keeping links
  // relative (reconstructing from URL.pathname broke ../ links on /tools/ pages).
  document.querySelectorAll('a[data-keep-partner]').forEach(a => {
    const href = a.getAttribute("href");
    if (!href || /^(https?:|mailto:|tel:|#)/i.test(href)) return;
    const [pathPart, hash] = href.split("#");
    const sep = pathPart.includes("?") ? "&" : "?";
    a.setAttribute("href", pathPart + sep + "partner=" + encodeURIComponent(p) + (hash ? "#" + hash : ""));
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
  // Plain, selectable address (for visitors with no configured mail client).
  document.querySelectorAll("[data-email-plain]").forEach(el => { el.textContent = DN.brand.email; });
  // "Copy email" buttons — robust fallback when mailto: links do nothing.
  document.querySelectorAll("[data-copy-email]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const original = btn.textContent;
      try { await navigator.clipboard.writeText(DN.brand.email); btn.textContent = "Copied ✓"; }
      catch { btn.textContent = DN.brand.email; }
      setTimeout(() => { btn.textContent = original; }, 1600);
    });
  });

  // Global copy email helper
  window.copyEmail = async (btn) => {
    const original = btn.textContent;
    try {
      await navigator.clipboard.writeText(DN.brand.email);
      btn.textContent = "Copied ✓";
      btn.style.color = "var(--dn-green)";
    } catch {
      btn.textContent = DN.brand.email;
    }
    setTimeout(() => {
      btn.textContent = original;
      btn.style.color = "";
    }, 1600);
  };
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
             rag: DN.rag(pct), blurb: d.blurb, rxCategory: d.rxCategory, dnTool: d.dnTool, fuelLink: d.fuelLink,
             benchmark: d.benchmark, benchmarkSrc: d.benchmarkSrc, standard: d.standard,
             caskLink: d.caskLink, canvasLink: d.canvasLink };
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
