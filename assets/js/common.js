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

/* ---- radar drawing ----
   Canvas is wider than tall so the long domain labels on the left/right
   axes get a gutter and never clip against the viewBox edge. Geometry is
   derived from the radius so the plot stays balanced, and labels longer
   than a threshold wrap onto two lines via <tspan>. */
function drawRadar(svg, domains, overlay) {
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
    poly.setAttribute("fill", "none"); poly.setAttribute("stroke", "#D6E4F0"); poly.setAttribute("stroke-width", "1");
    svg.appendChild(poly);
  });
  // axes + labels
  domains.forEach((d, i) => {
    const [x, y] = pt(i, r);
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", cx); line.setAttribute("y1", cy); line.setAttribute("x2", x); line.setAttribute("y2", y);
    line.setAttribute("stroke", "#D6E4F0"); svg.appendChild(line);

    const [lx, ly] = pt(i, r + labelGap);
    const anchor = lx < cx - 5 ? "end" : lx > cx + 5 ? "start" : "middle";
    const lines = wrapLabel(d.name, 16);
    const tx = document.createElementNS(ns, "text");
    tx.setAttribute("x", lx);
    tx.setAttribute("y", ly - (lines.length - 1) * 5.5); // vertically centre the block
    tx.setAttribute("text-anchor", anchor);
    tx.setAttribute("dominant-baseline", "middle");
    tx.setAttribute("font-size", "10"); tx.setAttribute("font-family", "DM Sans, sans-serif"); tx.setAttribute("fill", "#6B7280");
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
    op.setAttribute("fill", "none"); op.setAttribute("stroke", "#C9A227");
    op.setAttribute("stroke-width", "2"); op.setAttribute("stroke-dasharray", "5 4");
    op.setAttribute("class", "radar-overlay");
    svg.appendChild(op);
  }
  // data polygon
  const poly = document.createElementNS(ns, "polygon");
  poly.setAttribute("points", domains.map((d, i) => pt(i, r * d.pct / 100).join(",")).join(" "));
  poly.setAttribute("fill", "rgba(74,127,165,.28)"); poly.setAttribute("stroke", "#4A7FA5"); poly.setAttribute("stroke-width", "2");
  svg.appendChild(poly);
  domains.forEach((d, i) => {
    const [x, y] = pt(i, r * d.pct / 100);
    const dot = document.createElementNS(ns, "circle");
    dot.setAttribute("cx", x); dot.setAttribute("cy", y); dot.setAttribute("r", "3.2");
    dot.setAttribute("fill", d.pct < 45 ? "#C0392B" : d.pct < 65 ? "#D4AC0D" : "#1E8449");
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
          ? `✓ Received — a DN consultant will follow up within 24 hours. <a href="${opts.downloadUrl}" download>Download your copy of the ${opts.downloadName || "spec"} now →</a>`
          : "✓ Received — a DN consultant will follow up within 24 hours.";
        msg.style.color = "var(--dn-green)";
      }
    } catch {
      if (msg) {
        msg.innerHTML = `Could not send — email us at <a href="mailto:${DN.brand.email}">${DN.brand.email}</a>`;
        msg.style.color = "var(--dn-red)";
      }
      btn.disabled = false; btn.textContent = "Try again →";
    }
  });
}

if (typeof window !== "undefined") {
  Object.assign(window, { STORE_KEY, DN_LOGO, applyPartner, mountChrome,
    saveAnswers, loadAnswers, clearAnswers, computeScores, indexVerdict, drawRadar, wrapLabel,
    wireToolEnquiryForm });
}
