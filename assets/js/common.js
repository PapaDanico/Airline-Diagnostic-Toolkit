/* ============================================================
   JK & ASSOCIATES — shared client-side helpers (v2.0)
   No network calls. All state in localStorage on this device.
   ============================================================ */

const STORE_KEY = "jk_airline_scorecard_v3";

/* ---- asset base ----
   Resolved from common.js's own URL so logo/image paths work whether the
   page lives at the site root (index/diagnostic/results) or in /tools/. */
const ASSET_BASE = (function () {
  const s = document.currentScript && document.currentScript.src;
  return s ? s.replace(/assets\/js\/common\.js(\?.*)?$/, "") : "";
})();

/* ---- official JK & Associates mark (the phoenix in the Adinkra ring) ----
   Two artworks, not one artwork plus a CSS filter: the dark-surface
   variant is a pre-lightened render that preserves the oxblood→amber
   gradient. brightness(0) invert(1) would flatten the phoenix into a
   white silhouette, which is precisely the thing worth keeping. */
const JK_LOGO       = `<img class="logo" src="${ASSET_BASE}assets/img/jk-badge.png" alt="JK &amp; Associates" width="42" height="42" decoding="async">`;
const JK_LOGO_LIGHT = `<img class="logo" src="${ASSET_BASE}assets/img/jk-badge-light.png" alt="JK &amp; Associates" width="42" height="42" decoding="async" loading="lazy">`;

/* ---- partner / white-label handling (?partner=<KEY>) ----
   No-op unless ?partner= matches a key registered in JK.partners
   (empty by default — this is a JK & Associates product). */
function applyPartner() {
  const p = activePartnerKey();
  if (!p) return null;
  const cfg = JK.partners[p.toUpperCase()];
  document.body.classList.add("has-partner", "partner-" + p.toLowerCase());
  document.documentElement.style.setProperty("--accent", cfg.accent);
  document.documentElement.style.setProperty("--accent-deep", cfg.accentDeep);
  document.querySelectorAll("[data-cobrand]").forEach(el => el.textContent = cfg.cobrand);
  document.querySelectorAll("img.partner-logo").forEach(img => { img.src = cfg.logo; img.alt = cfg.label; });
  // Note: propagating the partner param onto internal links is handled once in
  // mountChrome (keepPartnerParam), after the canonical nav has been generated.
  return cfg;
}

/* ---- resolve the active white-label partner from ?partner= ----
   Returns the URL key only if it maps to a registered JK.partners entry,
   else null — so a bogus ?partner= never leaks into navigation. */
function activePartnerKey() {
  const p = new URLSearchParams(location.search).get("partner");
  if (!p) return null;
  return (window.JK && JK.partners[p.toUpperCase()]) ? p : null;
}

/* ---- preserve ?partner= across internal navigation ----
   Appends the param to every data-keep-partner link under `scope`, keeping
   hrefs relative (rebuilding from URL.pathname broke ../ links on /tools/
   pages). Skips external/anchor hrefs and links that already carry it. */
function keepPartnerParam(scope, p) {
  if (!p) return;
  scope.querySelectorAll("a[data-keep-partner]").forEach(a => {
    const href = a.getAttribute("href");
    if (!href || /^(https?:|mailto:|tel:|#)/i.test(href)) return;
    const [pathPart, hash] = href.split("#");
    if (/[?&]partner=/i.test(pathPart)) return;
    const sep = pathPart.includes("?") ? "&" : "?";
    a.setAttribute("href", pathPart + sep + "partner=" + encodeURIComponent(p) + (hash ? "#" + hash : ""));
  });
}

/* ---- global primary navigation ----
   One canonical menu rendered on every page, so navigation is identical
   site-wide instead of each page hand-rolling its own (which had drifted:
   different links/order per page, self-referential entries, and stray
   one-off links). Path-aware for root vs /tools/ pages; the current page
   is marked and rendered non-navigating. */
/* The platform serves two audiences with different journeys, so the
   tools menu is grouped rather than flat: BUILD (greenfield venture) and
   OPERATE (existing carrier). The grouping is the information
   architecture made visible — a visitor should never have to guess which
   half of the practice a tool belongs to. */
const TOOL_MENU = [
  { group: "Build a venture", items: [
    { file: "tools/certification-navigator.html", label: "KCAA Certification Navigator" },
    { file: "tools/venture-builder.html",         label: "Greenfield Venture Builder" },
    { file: "tools/corporate-structure.html",     label: "Corporate Structure Designer" },
    { file: "tools/organogram-planner.html",      label: "Organogram & Postholder Planner" }
  ]},
  { group: "Operate an airline", items: [
    { file: "diagnostic.html",                    label: "Airline Health Scorecard" },
    { file: "tools/cask-calculator.html",         label: "CASK Benchmarking Calculator" },
    { file: "tools/operating-model-canvas.html",  label: "Operating Model Canvas" },
    { file: "tools/fuel-optimizer.html",          label: "Fuel Contract Optimizer" },
    { file: "tools/training-tna.html",            label: "Training Needs Analysis" },
    { file: "tools/mro-readiness.html",           label: "MRO Readiness Assessment" },
    { file: "tools/data-request.html",            label: "48-Hour Data Request" }
  ]}
];

function buildNav() {
  const inTools = location.pathname.includes("/tools/");
  const root = inTools ? "../" : "";
  const here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  // path of the current page relative to the site root, so menu entries can
  // be matched against their canonical `file` values from either directory.
  const herePath = (inTools ? "tools/" : "") + here;

  const items = [
    { file: "index.html",        href: root + "index.html",        label: "Home" },
    { file: "how-it-works.html", href: root + "how-it-works.html", label: "How It Works" },
    { file: "methodology.html",  href: root + "methodology.html",  label: "Methodology" }
  ];
  const link = it => {
    if (herePath === it.file) return `<span class="nav-current" aria-current="page">${it.label}</span>`;
    return `<a href="${it.href}" data-keep-partner>${it.label}</a>`;
  };

  const out = [link(items[0]), link(items[1])];

  // grouped tools dropdown
  const onExplorer = herePath === "tools/index.html";
  const explorerHref = root + "tools/index.html";
  const groups = TOOL_MENU.map(g => {
    const rows = g.items.map(t => {
      const href = root + t.file;
      if (herePath === t.file) return `<span class="nav-current" aria-current="page" style="display:block;padding:.55rem .7rem">${t.label}</span>`;
      return `<a href="${href}" data-keep-partner>${t.label}</a>`;
    }).join("");
    return `<div class="dd-head">${g.group}</div>${rows}`;
  }).join("");
  const topLabel = onExplorer
    ? `<span class="nav-current" aria-current="page">Free Tools ▾</span>`
    : `<a href="${explorerHref}"${inTools ? ' class="nav-section" aria-current="location"' : ""} data-keep-partner>Free Tools ▾</a>`;
  out.push(`<div class="dropdown">${topLabel}<div class="dropdown-menu">${groups}
    <div class="dd-head">All</div><a href="${explorerHref}" data-keep-partner>Browse every tool →</a></div></div>`);

  out.push(link(items[2]));

  // primary CTA — the venture path is the wider front door, but do not
  // link to a page the visitor is already standing on.
  if (herePath !== "tools/certification-navigator.html") {
    out.push(`<a class="btn btn-primary" href="${root}tools/certification-navigator.html" data-keep-partner>Start free</a>`);
  }
  return out.join("\n");
}

/* ---- nav (mobile toggle) + brand/footer injection ---- */
function mountChrome() {
  // [data-logo] takes the standard mark; [data-logo="light"] takes the
  // dark-surface render (footer, ink hero).
  document.querySelectorAll("[data-logo]").forEach(el => {
    el.innerHTML = el.getAttribute("data-logo") === "light" ? JK_LOGO_LIGHT : JK_LOGO;
  });
  const toggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");
  if (navLinks) {
    // render the canonical menu, replacing whatever static links the page shipped
    navLinks.innerHTML = buildNav();
  }
  // Propagate ?partner= across every internal link in one pass — the generated
  // nav plus any data-keep-partner links in the page body/footer. Done here
  // (not in applyPartner) so the freshly-built nav is included, and gated on a
  // validated partner key rather than applyPartner's side effects.
  keepPartnerParam(document, activePartnerKey());
  if (toggle && navLinks) {
    toggle.setAttribute("aria-expanded", "false");
    const setOpen = open => { navLinks.classList.toggle("open", open); toggle.setAttribute("aria-expanded", String(open)); };
    toggle.addEventListener("click", e => { e.stopPropagation(); setOpen(!navLinks.classList.contains("open")); });
    // mobile UX: close the menu after choosing a destination, on outside
    // click, or on Escape — previously it stayed stuck open
    navLinks.addEventListener("click", e => { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("click", e => {
      if (navLinks.classList.contains("open") && !navLinks.contains(e.target) && e.target !== toggle) setOpen(false);
    });
    document.addEventListener("keydown", e => { if (e.key === "Escape") setOpen(false); });
  }
  document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());
  document.querySelectorAll("[data-version]").forEach(el => el.textContent = JK.brand.version);
  document.querySelectorAll("[data-email]").forEach(el => {
    el.textContent = JK.brand.email;
    if (el.tagName === "A") el.href = "mailto:" + JK.brand.email;
  });
  // Plain, selectable address (for visitors with no configured mail client).
  document.querySelectorAll("[data-email-plain]").forEach(el => { el.textContent = JK.brand.email; });
  // "Copy email" buttons — robust fallback when mailto: links do nothing.
  document.querySelectorAll("[data-copy-email]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const original = btn.textContent;
      try { await navigator.clipboard.writeText(JK.brand.email); btn.textContent = "Copied ✓"; }
      catch { btn.textContent = JK.brand.email; }
      setTimeout(() => { btn.textContent = original; }, 1600);
    });
  });

  // Global copy email helper
  window.copyEmail = async (btn) => {
    const original = btn.textContent;
    try {
      await navigator.clipboard.writeText(JK.brand.email);
      btn.textContent = "Copied ✓";
      btn.style.color = "var(--jk-green)";
    } catch {
      btn.textContent = JK.brand.email;
    }
    setTimeout(() => {
      btn.textContent = original;
      btn.style.color = "";
    }, 1600);
  };
}

/* ---- storage ---- */
function saveAnswers(obj) { try { localStorage.setItem(STORE_KEY, JSON.stringify(obj)); } catch {} }
function loadAnswers() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; } }
function clearAnswers() { try { localStorage.removeItem(STORE_KEY); } catch {} }

/* ---- storage access that can never throw ----
   Safari private browsing (and storage-blocked configurations) throw a
   SecurityError on any localStorage/sessionStorage call, not just writes.
   A single unguarded call anywhere in a top-level script aborts every
   feature wired after it — these wrappers make that class of bug
   structurally impossible instead of relying on a try/catch at every
   call site. */
function sessionGet(key) { try { return sessionStorage.getItem(key); } catch { return null; } }
function sessionSet(key, value) { try { sessionStorage.setItem(key, value); } catch {} }

/* ---- scoring engine ----
   answers: { "<domainId>": [s0..s4 per question] }
   returns { domains:[{id,name,weight,pct,answered,total,rag}], index, answeredAll } */
function computeScores(answers) {
  let weighted = 0, wsum = 0, answeredAll = true;
  const calib = answers._calibration || {};
  const weights = (window.JK && JK.getAdjustedWeights)
    ? JK.getAdjustedWeights(calib.fleetType, calib.opModel)
    : {};

  const domains = JK.domains.map(d => {
    const weight = weights[d.id] !== undefined ? weights[d.id] : d.weight;
    const arr = answers[d.id] || [];
    const answered = arr.filter(v => Number.isInteger(v)).length;
    const total = d.questions.length;
    if (answered < total) answeredAll = false;
    const sum = arr.reduce((a, v) => a + (Number.isInteger(v) ? v : 0), 0);
    const pct = answered ? Math.round((sum / (answered * 4)) * 100) : 0;
    weighted += pct * weight; wsum += weight;
    return { id: d.id, name: d.name, weight, pct, answered, total,
             rag: JK.rag(pct), blurb: d.blurb, rxCategory: d.rxCategory, jkTool: d.jkTool, fuelLink: d.fuelLink,
             benchmark: d.benchmark, benchmarkSrc: d.benchmarkSrc, standard: d.standard,
             caskLink: d.caskLink, canvasLink: d.canvasLink };
  });
  return { domains, index: wsum ? Math.round(weighted / wsum) : 0, answeredAll, calibration: calib };
}

function indexVerdict(idx) {
  if (idx < 45) return { band: "Turnaround required", color: "var(--jk-red)",
    text: "Multiple foundational gaps. A structured 90-day intervention is warranted before further investment in software." };
  if (idx < 65) return { band: "Material gaps to close", color: "var(--jk-amber)",
    text: "Solid in parts, but priority gaps are eroding performance. Targeted fixes can unlock value quickly." };
  if (idx < 80) return { band: "Competitive, with upside", color: "var(--jk-green)",
    text: "A healthy operation. Focused optimisation in the weaker domains will sharpen the cost and revenue edge." };
  return { band: "Best-in-class trajectory", color: "var(--jk-green)",
    text: "Strong across the board. The opportunity is to defend the lead and institutionalise the discipline." };
}

/* ---- radar drawing ----
   Canvas is wider than tall so the long domain labels on the left/right
   axes get a gutter and never clip against the viewBox edge. Geometry is
   derived from the radius so the plot stays balanced, and labels longer
   than a threshold wrap onto two lines via <tspan>. */
function drawRadar(svg, domains, overlay) {
  if (!svg || !domains || !domains.length) return;
  svg.innerHTML = "";
  const ns = "http://www.w3.org/2000/svg";
  const n = domains.length;
  const r = 120;                 // radar radius
  const labelGap = 16;           // distance from outer ring to label anchor
  const gutterX = 96, gutterY = 40; // room for wrapped side / top-bottom labels
  const W = r * 2 + gutterX * 2;
  const H = r * 2 + gutterY * 2;
  const cx = W / 2, cy = H / 2;
  const pt = (i, rad) => {
    const a = (Math.PI * 2 * i / n) - Math.PI / 2;
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  };
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  // rings
  [0.25, 0.5, 0.75, 1].forEach(f => {
    const poly = document.createElementNS(ns, "polygon");
    poly.setAttribute("points", domains.map((_, i) => pt(i, r * f).join(",")).join(" "));
    poly.setAttribute("fill", "none"); poly.setAttribute("stroke", "#EADCC9"); poly.setAttribute("stroke-width", "1");
    svg.appendChild(poly);
  });
  // axes + labels
  domains.forEach((d, i) => {
    const [x, y] = pt(i, r);
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", cx); line.setAttribute("y1", cy); line.setAttribute("x2", x); line.setAttribute("y2", y);
    line.setAttribute("stroke", "#EADCC9"); svg.appendChild(line);

    const [lx, ly] = pt(i, r + labelGap);
    const anchor = lx < cx - 5 ? "end" : lx > cx + 5 ? "start" : "middle";
    const lines = wrapLabel(d.name, 16);
    const tx = document.createElementNS(ns, "text");
    tx.setAttribute("x", lx);
    tx.setAttribute("y", ly - (lines.length - 1) * 5.5); // vertically centre the block
    tx.setAttribute("text-anchor", anchor);
    tx.setAttribute("dominant-baseline", "middle");
    tx.setAttribute("font-size", "10"); tx.setAttribute("font-family", "DM Sans, sans-serif"); tx.setAttribute("fill", "#6E625C");
    lines.forEach((ln, j) => {
      const ts = document.createElementNS(ns, "tspan");
      ts.setAttribute("x", lx); if (j) ts.setAttribute("dy", "11");
      ts.textContent = ln;
      tx.appendChild(ts);
    });
    svg.appendChild(tx);
  });
  // optional comparison overlay (array of pct values), drawn under the data
  if (overlay) {
    const op = document.createElementNS(ns, "polygon");
    op.setAttribute("points", overlay.map((pct, i) => pt(i, r * pct / 100).join(",")).join(" "));
    op.setAttribute("fill", "none"); op.setAttribute("stroke", "#E08A34");
    op.setAttribute("stroke-width", "2"); op.setAttribute("stroke-dasharray", "5 4");
    op.setAttribute("class", "radar-overlay");
    svg.appendChild(op);
  }
  // data polygon
  const poly = document.createElementNS(ns, "polygon");
  poly.setAttribute("points", domains.map((d, i) => pt(i, r * d.pct / 100).join(",")).join(" "));
  poly.setAttribute("fill", "rgba(196,85,31,.26)"); poly.setAttribute("stroke", "#9E3116"); poly.setAttribute("stroke-width", "2");
  svg.appendChild(poly);
  domains.forEach((d, i) => {
    const [x, y] = pt(i, r * d.pct / 100);
    const dot = document.createElementNS(ns, "circle");
    dot.setAttribute("cx", x); dot.setAttribute("cy", y); dot.setAttribute("r", "3.2");
    dot.setAttribute("fill", d.pct < 45 ? "#C62828" : d.pct < 65 ? "#B87503" : "#1E7A4A");
    svg.appendChild(dot);
  });
}

/* Split a label into <=2 balanced lines if it exceeds maxChars, breaking
   on the space nearest the middle so neither line runs long. */
function wrapLabel(name, maxChars) {
  if (name.length <= maxChars) return [name];
  const words = name.split(" ");
  if (words.length < 2) return [name];
  const mid = name.length / 2;
  let best = 0, bestDist = Infinity, len = 0;
  for (let i = 0; i < words.length - 1; i++) {
    len += words[i].length + 1;
    const dist = Math.abs(len - mid);
    if (dist < bestDist) { bestDist = dist; best = i; }
  }
  return [words.slice(0, best + 1).join(" "), words.slice(best + 1).join(" ")];
}

/* ---- shared tool-enquiry form wiring (fuel/CASK/canvas pages) ----
   Submits to the "tool-enquiry" Netlify form via fetch (no page nav),
   with a mailto fallback on failure. opts.downloadUrl reveals a gated
   download link in the success message (used by the fuel tender spec). */
function wireToolEnquiryForm(formId, toolName, opts) {
  opts = opts || {};
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener("submit", async e => {
    e.preventDefault();
    // .enq-msg must live inside the <form> — form.querySelector only
    // searches descendants, so a message element placed after </form>
    // silently returns null here and every branch below would throw.
    const msg = form.querySelector(".enq-msg");
    if (msg) {
      msg.setAttribute("role", "status");
      msg.setAttribute("aria-live", "polite");
    }
    const btn = form.querySelector("button[type='submit']");
    const data = new URLSearchParams({ "form-name": "tool-enquiry", "bot-field": "", tool: toolName });
    form.querySelectorAll("input, select").forEach(el => { if (el.name) data.set(el.name, el.value.trim()); });
    btn.disabled = true; btn.textContent = "Sending…";
    try {
      const resp = await fetch("/", { method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: data.toString() });
      if (!resp.ok) throw new Error(resp.status);
      form.style.display = "none";
      if (msg) {
        msg.innerHTML = opts.downloadUrl
          ? `✓ Received — a JK consultant will follow up within 24 hours. <a href="${opts.downloadUrl}" download>Download your copy of the ${opts.downloadName || "spec"} now →</a>`
          : "✓ Received — a JK consultant will follow up within 24 hours.";
        msg.style.color = "var(--jk-green)";
      }
    } catch {
      if (msg) {
        msg.innerHTML = `Could not send — email us at <a href="mailto:${JK.brand.email}">${JK.brand.email}</a>`;
        msg.style.color = "var(--jk-red)";
      }
      btn.disabled = false; btn.textContent = "Try again →";
    }
  });
}

/* ============================================================
   VENTURE-TRACK SHARED HELPERS
   Used by the certification, venture, structure and organogram tools.
   Everything below is pure client-side; nothing leaves the device.
   ============================================================ */

/* ---- namespaced per-tool storage that can never throw ---- */
function toolStore(key) {
  const k = "jk_" + key + "_v3";
  return {
    load() { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch { return {}; } },
    save(obj) { try { localStorage.setItem(k, JSON.stringify(obj)); } catch {} },
    clear() { try { localStorage.removeItem(k); } catch {} }
  };
}

/* ---- HTML escaping ----
   Anything a visitor types — a shareholder name, a postholder name —
   must pass through this before it reaches innerHTML. These tools run
   with no backend and no session to steal, but the state persists in
   localStorage and the output is designed to be printed and handed to a
   lender or counsel, so injected markup would survive into the artefact.
   Escape at the sink, every time, without exception. */
function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---- money formatting ----
   Compact for headline figures (USD 8.4M), grouped for tables.
   Always explicit about the unit — an unlabelled number in a capital
   model is how people mistake thousands for millions. Scales through
   B and T so a fat-fingered extra zero reads as "USD 1.00T", not as
   the nonsense "USD 1000000.0M". */
function fmtMoney(v, unit) {
  unit = unit || "USD";
  if (!isFinite(v)) return "—";
  const abs = Math.abs(v);
  const TIERS = [
    { div: 1e12, suf: "T" }, { div: 1e9, suf: "B" },
    { div: 1e6,  suf: "M" }, { div: 1e3, suf: "K" }, { div: 1, suf: "" }
  ];
  const dpFor = t => (t.suf === "K" || t.suf === "") ? 0
                   : (t.suf === "M" && abs >= 1e7) ? 1 : 2;
  let i = TIERS.findIndex(t => abs >= t.div);
  if (i < 0) i = TIERS.length - 1;
  // Rounding can push the mantissa up to 1000 — 999,949 formats as "1000K"
  // if you stop here. Promote a tier whenever that happens, so the figure
  // always reads with one to three leading digits. Tuning the thresholds
  // instead would need a different constant per decimal precision.
  while (i > 0 && Math.abs(+(v / TIERS[i].div).toFixed(dpFor(TIERS[i]))) >= 1000) i--;
  const t = TIERS[i];
  return `${unit} ${(v / t.div).toFixed(dpFor(t))}${t.suf}`;
}

/* ---- ratio formatting ----
   A coverage ratio in the thousands is arithmetically true and
   practically meaningless; showing "1107249.62x" implies a precision
   the model does not have. Anything past 100x is reported as ">100x". */
function fmtRatio(v) {
  if (v === null || v === undefined || !isFinite(v)) return "—";
  if (v > 100) return "&gt;100×";
  if (v < -100) return "&lt;−100×";
  return v.toFixed(2) + "×";
}

/* ---- clamp a numeric field to a sane range ----
   min/max attributes constrain the spinner, not typing or paste. A
   negative interest rate or negative revenue silently produces a
   confident, wrong answer, which is worse than a rejected input. */
function clampNum(v, lo, hi) {
  if (!isFinite(v)) return lo;
  return Math.min(hi, Math.max(lo, v));
}
function fmtNum(v, dp) {
  if (!isFinite(v)) return "—";
  return v.toLocaleString("en-GB", { minimumFractionDigits: dp || 0, maximumFractionDigits: dp || 0 });
}

/* ---- regulatory citation chip ----
   Renders a citation with its verification state made visible. An
   "unconfirmed" citation gets a distinct chip and its caveat as the
   tooltip — a compliance tool that silently asserts a wrong Legal
   Notice number is more dangerous than one that shows its working. */
function citeChip(key) {
  const c = (window.JKV && JKV.cite(key)) || null;
  if (!c) return "";
  const cls = c.s === "verified" ? "cite" : "cite unverified";
  const inner = c.url
    ? `<a href="${escapeHtml(c.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(c.ref)}</a>`
    : escapeHtml(c.ref);
  return `<span class="${cls}" title="${escapeHtml(c.long)}">${inner}</span>`;
}
function citeChips(keys) {
  return (keys || []).map(citeChip).join("");
}

/* ---- branded print header ----
   Injected once per tool page so a printed pack carries the mark, the
   tool name and the date it was produced. Board packs get circulated
   detached from their source; the header is what makes them traceable. */
function mountPrintHead(toolName, subtitle) {
  const html =
    `<img src="${ASSET_BASE}assets/img/jk-logo-full.png" width="522" height="400" loading="lazy" decoding="async" alt="JK &amp; Associates">
     <div class="ph-meta"><strong>${escapeHtml(toolName)}</strong><br>
       ${subtitle ? escapeHtml(subtitle) + "<br>" : ""}
       Prepared ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
       · JK &amp; Associates · ${escapeHtml(JK.brand.email)}</div>`;
  // Rewrite in place rather than bailing out when a header already exists —
  // these tools call this again on every sector change, and an early return
  // would leave a printed AOC pack captioned with whichever sector happened
  // to be selected first.
  let el = document.querySelector(".print-head");
  if (!el) {
    el = document.createElement("div");
    el.className = "print-head";
    const main = document.querySelector("main") || document.body;
    main.insertBefore(el, main.firstChild);
  }
  el.innerHTML = html;
}

/* ---- tagged mailto for a tool enquiry ----
   The site collects no analytics by design, so the subject tag is the
   only lead-attribution signal there is. Keep the tags stable. */
function toolMailto(tag, subject, body) {
  return `mailto:${JK.brand.email}` +
    `?subject=${encodeURIComponent(`[JK · ${tag}] ${subject}`)}` +
    `&body=${encodeURIComponent(body || "")}`;
}

/* ---- accessible collapse/expand for a disclosure button ---- */
function wireDisclosure(btn, panel, onToggle) {
  if (!btn || !panel) return;
  btn.setAttribute("aria-expanded", String(!panel.hidden));
  btn.addEventListener("click", () => {
    const open = panel.hidden;
    panel.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    if (onToggle) onToggle(open);
  });
}

if (typeof window !== "undefined") {
  Object.assign(window, { STORE_KEY, JK_LOGO, JK_LOGO_LIGHT, applyPartner, mountChrome,
    saveAnswers, loadAnswers, clearAnswers, computeScores, indexVerdict, drawRadar, wrapLabel,
    wireToolEnquiryForm, sessionGet, sessionSet,
    toolStore, fmtMoney, fmtNum, fmtRatio, clampNum, escapeHtml,
    citeChip, citeChips, mountPrintHead, toolMailto, wireDisclosure });
}
