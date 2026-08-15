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
/* alt="" — deliberately empty, not missing.

   The badge always sits inside <a class="brand">, which already carries
   the words "JK & Associates" in a sibling <span>. With alt text the
   link's accessible name became "JK & Associates JK & Associates
   Aviation Advisory · Africa": a screen reader said the name twice, and
   the second one told the listener nothing the first had not.

   An image that repeats adjacent text is decorative by definition, and
   the correct way to say so is an empty alt. Removing the attribute
   entirely is the one thing that would be wrong — assistive tech then
   falls back to announcing the filename. */
const JK_LOGO       = `<img class="logo" src="${ASSET_BASE}assets/img/jk-badge.png" alt="" width="42" height="42" decoding="async">`;
const JK_LOGO_LIGHT = `<img class="logo" src="${ASSET_BASE}assets/img/jk-badge-light.png" alt="" width="42" height="42" decoding="async" loading="lazy">`;

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
  /* Guarded: a partner registered without a logo used to get
     img.src = undefined, which the browser resolves against the page URL
     and fetches — a 404 on every page load, and a broken-image glyph
     where a partner's mark should be. A partner who has not sent artwork
     yet should render as JK, not as a broken partner. */
  if (cfg.logo) {
    document.querySelectorAll("img.partner-logo").forEach(img => { img.src = cfg.logo; img.alt = cfg.label; });
  }
  if (cfg.preview) markPreview(cfg);
  // Note: propagating the partner param onto internal links is handled once in
  // mountChrome (keepPartnerParam), after the canonical nav has been generated.
  return cfg;
}

/* ---- embedded mode (?embed=1) ----

   A partner iframing the Regulatory Index wants the index, not JK's
   navigation and footer inside their page. This strips the chrome and
   leaves the content, the edition strip and one attribution line — the
   corpus travels, and it travels with its name on it.

   Deliberately NOT a second copy of the page. A separate embed build of
   the register would be a second corpus to keep in step with the first,
   and the two would diverge the first time someone edited one of them.

   Framing is still governed by Content-Security-Policy: frame-ancestors
   'self' in _headers. This flag changes what an embedded page looks
   like; it does not grant anyone permission to embed it. A real partner
   needs their origin added there, one origin at a time, never a
   wildcard. */
function isEmbedded() {
  return new URLSearchParams(location.search).get("embed") === "1";
}

function applyEmbedMode() {
  if (!isEmbedded()) return false;
  document.body.classList.add("is-embed");
  return true;
}

/* ---- the preview partner must announce itself ----

   A demonstration of the white-label mode renders the whole site under
   an invented brand. Left unmarked, a visitor who lands on the preview
   URL — or a screenshot of it — sees JK asserting a partnership that
   does not exist. That is the one thing a credibility-first product
   cannot do, so the banner is not optional decoration: it is the reason
   the preview is allowed to exist at all.

   Injected at the top of the body rather than into the page content, so
   it appears on every page the preview reaches, including tool pages
   this function has never heard of. */
function markPreview(cfg) {
  if (document.querySelector("[data-partner-preview]")) return;
  const bar = document.createElement("div");
  bar.setAttribute("data-partner-preview", "");
  bar.className = "partner-preview-bar";
  bar.setAttribute("role", "note");
  bar.innerHTML =
    '<b>Preview.</b> This is how the toolkit looks under a partner\u2019s brand. ' +
    '\u201C' + cfg.label + '\u201D is an illustration, not a real partnership \u2014 ' +
    'every JK figure, source and citation below is unchanged. ' +
    '<a href="' + ASSET_BASE + 'partners.html">How partnership works</a> \u00b7 ' +
    '<a href="?">Leave preview</a>';
  document.body.prepend(bar);
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
    { file: "tools/venture-dashboard.html",       label: "Venture Control Room" },
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
    { file: "regulations.html",  href: root + "regulations.html",  label: "Regulations" },
    { file: "methodology.html",  href: root + "methodology.html",  label: "Methodology" },
    { file: "about.html",        href: root + "about.html",        label: "About" }
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
    ? `<span class="nav-current" aria-current="page">Free Tools <svg class="dd-caret" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></span>`
    : `<a href="${explorerHref}"${inTools ? ' class="nav-section" aria-current="location"' : ""} data-keep-partner>Free Tools <svg class="dd-caret" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></a>`;
  out.push(`<div class="dropdown">${topLabel}<div class="dropdown-menu">${groups}
    <div class="dd-head">All</div><a href="${explorerHref}" data-keep-partner>Browse every tool →</a></div></div>`);

  out.push(link(items[2]), link(items[3]), link(items[4]));

  // primary CTA — the venture path is the wider front door, but do not
  // link to a page the visitor is already standing on.
  if (herePath !== "tools/certification-navigator.html") {
    out.push(`<a class="btn btn-primary" href="${root}tools/certification-navigator.html" data-keep-partner>Start free</a>`);
  }
  return out.join("\n");
}

/* ---- the "Learn" strip in every footer ----
   The reference material — tutorial, FAQ, glossary, regulatory index —
   is only useful if it is reachable from wherever someone gets stuck,
   which is rarely the home page. Injecting it centrally rather than
   hand-editing twenty-three footers means the set cannot drift page to
   page, which is exactly what happened to the primary nav before it was
   centralised. Rendered above the copyright line on every page that has
   a footer at all, whatever shape that footer takes. */
const LEARN_LINKS = [
  { file: "tutorial.html",    label: "Tutorial",     hint: "From idea to board pack, in order" },
  { file: "faq.html",         label: "FAQ",          hint: "Straight answers, including the awkward ones" },
  { file: "glossary.html",    label: "Glossary",     hint: "The vocabulary, and what goes wrong around it" },
  { file: "regulations.html", label: "Regulations",  hint: "Every instrument, with its verification status" }
];

/* ---- the "About" block in every footer ----
   Two sentences and a link, injected centrally like the Learn strip.

   The first draft put three paragraphs here and it was mostly other
   pages' work restated: "not affiliated with the Kenya Civil Aviation
   Authority" already appears in the terms, the glossary and the
   regulatory index, "free, no signup, no sales call" on the home page,
   the diagnostic and the FAQ, and "orientation, not advice" in five
   places. A sixth copy adds nothing and guarantees that one day the
   copies disagree — with the footer being the one nobody updates.

   So this says the thing no other page says, and about.html carries the
   rest. */
function mountFooterAbout() {
  const footer = document.querySelector(".footer .wrap");
  if (!footer || footer.querySelector(".footer-about")) return;
  const root = location.pathname.includes("/tools/") ? "../" : "";
  const here = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  const link = (!root && here === "about.html")
    ? `<span class="fa-more" aria-current="page">Who we are, and how to work with us</span>`
    : `<a class="fa-more" href="${root}about.html" data-keep-partner>Who we are, and how to work with us &rarr;</a>`;

  const el = document.createElement("div");
  el.className = "footer-about";
  el.innerHTML =
    `<h2>About JK &amp; Associates</h2>
     <p>An aviation management consultancy based in Nairobi, Kenya, working with operators,
        investors and greenfield ventures across the continent. Two tracks: taking a venture
        through KCAA certification to an air operator certificate, and making an existing
        carrier legible to itself.</p>
     ${link}`;

  const learn = footer.querySelector(".footer-learn");
  const ver = footer.querySelector(".ver");
  if (learn) footer.insertBefore(el, learn);
  else if (ver) footer.insertBefore(el, ver);
  else footer.appendChild(el);
}

/* ---- one destination, one link ----

   The footer columns are static markup, written per page, and they are
   not the same from page to page: the glossary lists a Reference column
   with the regulatory index and Methodology in it, the home page lists
   two tool columns and neither. So "which links are already here" is a
   question that can only be answered on the page, at mount time — a
   hand-kept exclusion list would be wrong on some page the day it was
   written, and wrong on more of them a month later.

   Hence a rule instead of an edit. Anything the footer already links
   above is not offered again below. Destinations are normalised so that
   ../regulations.html from a tool page and regulations.html from the
   root count as the same page. */
const sameDest = (href) => (href || "").replace(/^(\.\.\/)+/, "").replace(/^\//, "").toLowerCase();

function footerDestinations(scope) {
  const out = new Set();
  for (const a of scope.querySelectorAll("a[href]")) {
    const h = a.getAttribute("href") || "";
    if (/^(mailto:|tel:|#|https?:)/.test(h)) continue;
    out.add(sameDest(h));
  }
  return out;
}

/* The copyright line repeated Privacy and Terms — both of which the
   Legal column carries in full a few hundred pixels above — and on
   pages with a Reference column, Methodology as well. Strip whatever is
   already linked, along with the separator that came with it, and leave
   the ones that are this footer's only route to that page. */
function dedupeVersionLine() {
  const footer = document.querySelector(".footer .wrap");
  const ver = footer && footer.querySelector(".ver");
  if (!ver) return;
  const above = new Set();
  for (const el of footer.children) {
    if (el === ver) break;
    for (const d of footerDestinations(el)) above.add(d);
  }
  for (const a of [...ver.querySelectorAll("a[href]")]) {
    if (!above.has(sameDest(a.getAttribute("href")))) continue;
    // take the separator with it, or the preceding one if it was last
    const after = a.nextSibling;
    if (after && after.nodeType === 3 && /^\s*·\s*$/.test(after.textContent)) after.remove();
    else {
      const before = a.previousSibling;
      if (before && before.nodeType === 3 && /^\s*·\s*$/.test(before.textContent)) before.remove();
    }
    a.remove();
  }
}

function mountFooterLearn() {
  const footer = document.querySelector(".footer .wrap");
  if (!footer || footer.querySelector(".footer-learn")) return;
  const root = location.pathname.includes("/tools/") ? "../" : "";
  const here = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  /* Same rule: a reference the columns already carry is not offered a
     second time as a card. On the glossary page that removes
     Regulations, which the Reference column lists as "Kenya regulatory
     index" — one page, two names, twice in one footer. */
  const alreadyLinked = footerDestinations(footer);

  const links = LEARN_LINKS.filter(l => !alreadyLinked.has(sameDest(l.file))).map(l => {
    // never link a page to itself — a self-referential link in a footer
    // reads as a broken one
    if (!root && here === l.file) {
      return `<span class="fl-item is-here" aria-current="page"><b>${l.label}</b><small>${l.hint}</small></span>`;
    }
    return `<a class="fl-item" href="${root}${l.file}" data-keep-partner><b>${l.label}</b><small>${l.hint}</small></a>`;
  }).join("");

  // If the columns already carried every reference, there is no strip
  // to add — a heading over an empty grid is worse than no heading.
  if (!links) return;

  const el = document.createElement("div");
  el.className = "footer-learn";
  el.innerHTML = `<h2>Learn the ground</h2><div class="fl-grid">${links}</div>`;

  // sits above the copyright line where one exists, else at the end
  const ver = footer.querySelector(".ver");
  if (ver) footer.insertBefore(el, ver); else footer.appendChild(el);
}

/* ---- nav (mobile toggle) + brand/footer injection ---- */
function mountChrome() {
  // Embedded pages get the class before anything else renders, so the
  // chrome is hidden by CSS rather than built and then removed — which
  // would flash JK's nav inside a partner's page on every load.
  applyEmbedMode();
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
  // Injected footer blocks are built BEFORE the partner sweep below, not
  // after. They were mounted after it, so every data-keep-partner link
  // inside them — the whole Learn strip — was created too late to be
  // rewritten and quietly dropped the ?partner= a co-branded visitor
  // arrived with. The sweep's own comment says it covers "the page
  // body/footer", so the footer has to exist by the time it runs.
  // Belt and braces after this exact failure: an About block that read a
  // dataset the page had not loaded threw inside mountChrome, which took
  // the nav, the scroll-reveal and the page's own scripts down with it.
  // The footer is decoration; the page is not. A logged failure here
  // costs a strip at the bottom, an unhandled one costs the site.
  try { mountFooterAbout(); } catch (e) { console.error("footer about:", e); }
  try { mountFooterLearn(); } catch (e) { console.error("footer learn:", e); }
  // Last, so the columns and the strip above it both count as "already linked".
  try { dedupeVersionLine(); } catch (e) { console.error("footer dedupe:", e); }

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
  // The office address was hardcoded into twelve footers while
  // JK.brand.location sat unread — the drift this file exists to prevent.
  // One hook, one source.
  document.querySelectorAll("[data-location]").forEach(el => { el.textContent = JK.brand.location; });
  /* Registered name — or the incorporation position, while there is not
     one yet. Bound from JK.brand so the day the certificate issues is a
     one-line edit in data.js rather than a hunt through the legal pages,
     which is how the Privacy Notice came to ship a bracketed blank in
     the first place. The markup carries the same sentence, so the
     statement survives with JavaScript disabled; this only keeps it in
     step. */
  document.querySelectorAll("[data-registered-name]").forEach(el => {
    el.textContent = JK.brand.pending ? JK.brand.pending.registeredName : JK.brand.name;
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

  // Reveal is mounted last, after the nav and footer exist, so generated
  // chrome participates in the same motion system as authored markup.
  mountReveal();

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

/* ---- storage access that can never throw ----
   Safari private browsing (and storage-blocked configurations) throw a
   SecurityError on any localStorage/sessionStorage call, not just writes.
   A single unguarded call anywhere in a top-level script aborts every
   feature wired after it — these wrappers make that class of bug
   structurally impossible instead of relying on a try/catch at every
   call site.

   A READ that fails is a non-event: there was nothing stored, the caller
   gets the empty default, and the site behaves exactly as it does for a
   first-time visitor. Those catches stay silent, deliberately.

   A WRITE that fails is the opposite, and it was being swallowed by the
   same reflex. Forty diagnostic questions, or an hour in the venture
   builder, then a reload, and the work is gone with nothing having said
   so — and the results page, which needs all forty answers, tells you to
   "complete all 40 questions first" when you just did. The browser knew.
   The page did not pass it on.

   So: writes go through reportingWrite, which fails soft (the in-memory
   state is untouched and the session keeps working) and says so once. */
let storageWarned = false;

/* Named for the two ways a browser refuses a write, because the fix is
   different for each and "storage error" helps nobody. */
function storageRefusal(err) {
  const name = err && err.name;
  if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED") {
    return "This browser's storage for this site is full.";
  }
  return "This browser is blocking storage for this site — private or incognito windows usually are.";
}

function warnStorageUnavailable(err) {
  if (storageWarned) return;              // one banner, not one per keystroke
  storageWarned = true;
  console.warn("JK: storage write refused —", err);
  if (typeof document === "undefined" || !document.body) return;

  const bar = document.createElement("div");
  bar.className = "jk-storage-warning";
  bar.setAttribute("role", "alert");

  const text = document.createElement("p");
  /* Says what broke, what still works, and what the visitor loses — in
     that order, because the middle clause is the one that stops someone
     abandoning a half-finished diagnostic in a panic. */
  text.textContent = storageRefusal(err) +
    " Your work is safe on this page and will still score, but it will not" +
    " survive a reload or a new tab. Finish and export before you leave.";

  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "jk-storage-warning-close";
  dismiss.setAttribute("aria-label", "Dismiss storage warning");
  dismiss.textContent = "×";
  dismiss.addEventListener("click", () => bar.remove());

  bar.append(text, dismiss);
  /* Appended, not prepended. role="alert" is announced the moment it is
     inserted regardless of position, so putting it first buys nothing
     and costs a keyboard user the skip link: the close button would
     become the first tab stop on the page, ahead of the site's own
     navigation, for the rest of the session. */
  document.body.append(bar);
}

/* Returns whether the value was persisted, so a caller that can do
   something better than the banner has the fact available. */
function reportingWrite(fn) {
  try { fn(); return true; }
  catch (err) { warnStorageUnavailable(err); return false; }
}

/* ---- storage ---- */
function saveAnswers(obj) { return reportingWrite(() => localStorage.setItem(STORE_KEY, JSON.stringify(obj))); }
function loadAnswers() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; } }
function clearAnswers() { return reportingWrite(() => localStorage.removeItem(STORE_KEY)); }

function sessionGet(key) { try { return sessionStorage.getItem(key); } catch { return null; } }
function sessionSet(key, value) { return reportingWrite(() => sessionStorage.setItem(key, value)); }

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
             /* benchmarkCadence travels with the date it qualifies. Without
                it results.js could compute an age but not say what the age
                meant, and printed "the next undefined edition may be due":
                a projection carrying a fact and dropping the unit for
                reading it. */
             benchmark: d.benchmark, benchmarkSrc: d.benchmarkSrc, benchmarkAsOf: d.benchmarkAsOf,
             benchmarkCadence: d.benchmarkCadence,
             standard: d.standard,
             screensOnly: d.screensOnly, fullAssessment: d.fullAssessment,
             scaleNote: d.scaleNote, scaleSrc: d.scaleSrc,
             caskLink: d.caskLink, canvasLink: d.canvasLink };
  });

  /* ---- the safety flag, which does NOT move the index ----------------

     The index is a weighted average across eight domains, and safety is
     eighteen of a hundred. So a carrier whose SMS exists on paper and
     nowhere else can be carried to a respectable headline by seven
     commercial domains doing well. Averaged, that reads as a healthy
     airline. It is not one, and no regulator will average it.

     The index is deliberately LEFT ALONE. A number a client may already
     have quoted should not silently change, and capping it would be this
     tool asserting a pass mark it has no standing to set — SM ICG's own
     guidance is that an SMS evaluation should not be scored at all, and
     never as pass/fail. What travels instead is a flag that survives the
     average and says which answer raised it.

     Raised on the SMS-MATURITY ANSWER, not on the domain percentage: a
     good reporting rate and clean regulatory findings can lift the
     domain while the management system underneath is still paper, and
     that is exactly the case worth flagging. */
  const SAFETY_FLOOR = 2; // below "Proactive" — i.e. Deficient or Reactive
  const smsMaturity = (answers.safety || [])[0];
  const flags = [];
  if (Number.isInteger(smsMaturity) && smsMaturity < SAFETY_FLOOR) {
    const rungs = (JK.domains.find(d => d.id === "safety") || {}).questions || [];
    const rung = String(((rungs[0] || {}).o || [])[smsMaturity] || "").split(" — ")[0];
    flags.push({
      id: "sms-maturity",
      severity: "critical",
      title: "The safety management system is the finding",
      body: "You answered “" + rung + "” for SMS maturity. The index above averages that " +
            "with seven commercial domains, so it does not show it. An operator cannot trade a " +
            "deficient SMS against good unit costs, and an audit will not average the two — it " +
            "will open on this."
    });
  }

  return { domains, index: wsum ? Math.round(weighted / wsum) : 0, answeredAll, calibration: calib, flags };
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

  /* Rings and axes take currentColor at half opacity rather than a fixed
     sand. This radar is drawn on four different grounds — the ink hero on
     the home page, the results panel, the demo report and a parchment card
     in the MRO tool — and one fixed colour cannot serve all of them. The
     old #EADCC9 was picked for the dark hero, where it reads well; on the
     MRO card it measured 1.35:1, which is a scale nobody can see, and a
     radar's rings ARE its scale.

     currentColor inherits the surface's own text colour, so the rings are
     light on ink and dark on parchment without anyone maintaining a list
     of contexts. Half opacity keeps them recessive while clearing 3:1 on
     every one of those grounds: 3.52 on white, 3.48 on parchment, 3.44 on
     sand, 5.35 on ink. */
  const GRID = "currentColor";
  const GRID_OPACITY = "0.5";

  // rings
  [0.25, 0.5, 0.75, 1].forEach(f => {
    const poly = document.createElementNS(ns, "polygon");
    poly.setAttribute("points", domains.map((_, i) => pt(i, r * f).join(",")).join(" "));
    poly.setAttribute("fill", "none");
    poly.setAttribute("stroke", GRID);
    poly.setAttribute("stroke-opacity", GRID_OPACITY);
    poly.setAttribute("stroke-width", "1");
    svg.appendChild(poly);
  });
  // axes + labels
  domains.forEach((d, i) => {
    const [x, y] = pt(i, r);
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", cx); line.setAttribute("y1", cy); line.setAttribute("x2", x); line.setAttribute("y2", y);
    line.setAttribute("stroke", GRID);
    line.setAttribute("stroke-opacity", GRID_OPACITY);
    svg.appendChild(line);

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
    op.setAttribute("fill", "none");
    /* --jk-amber-sig, not --jk-amber. The palette documents #E08A34 as
       "highlight on dark" and every radar in this product sits on a
       light surface, where it renders at 2.67:1 — under the 3:1 WCAG
       asks of a graphical object, on the one line the chart exists to
       let you compare against. The signal amber is the palette's answer
       for light backgrounds. The legend swatch on index.html carries
       the same value; a key that does not match its line is not a key. */
    op.setAttribute("stroke", "#B87503");
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

/* ---- namespaced per-tool storage: reads default, writes report ---- */
function toolStore(key) {
  const k = "jk_" + key + "_v3";
  return {
    load() { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch { return {}; } },
    save(obj) { return reportingWrite(() => localStorage.setItem(k, JSON.stringify(obj))); },
    clear() { return reportingWrite(() => localStorage.removeItem(k)); }
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

/* ---- scroll reveal ----
   Content is visible by default and only *becomes* animatable once this
   runs, so anything without JS — a crawler, a reader mode, a failed
   script load — still sees a complete page. The transform is a few pixels
   with no layout impact, each element reveals once and is then unobserved,
   and the whole thing no-ops under prefers-reduced-motion. Restraint is
   the point: motion should make the page feel considered, not staged. */
function mountReveal() {
  if (!("IntersectionObserver" in window)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const targets = document.querySelectorAll("[data-reveal], section > .wrap > *");
  if (!targets.length) return;
  document.documentElement.classList.add("has-reveal");

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      io.unobserve(e.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });

  /* Anything that hides content behind JS needs an escape hatch, because
     the failure mode is a blank page rather than a missing flourish.
     Printing is the case that actually bit: "Print / save as PDF" is the
     headline feature of every tool, and a visitor who landed and printed
     without scrolling got a board pack with 23 invisible blocks. The
     print stylesheet handles it declaratively; beforeprint covers
     browsers that snapshot layout before applying print media; and the
     timeout covers an observer that never fires at all. */
  const revealAll = () => {
    io.disconnect();
    document.querySelectorAll(".will-reveal").forEach(el => el.classList.add("is-in"));
  };
  window.addEventListener("beforeprint", revealAll);
  if (window.matchMedia) {
    const mq = window.matchMedia("print");
    if (mq.addEventListener) mq.addEventListener("change", e => { if (e.matches) revealAll(); });
  }
  setTimeout(revealAll, 8000);

  targets.forEach((el, i) => {
    // Anything already on screen at load reveals immediately — a visitor
    // should never watch the first viewport assemble itself.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
      el.classList.add("is-in");
      return;
    }
    el.style.setProperty("--reveal-i", String(i % 6));
    el.classList.add("will-reveal");
    io.observe(el);
  });
}

/* ---- level annual debt service ----
   Standard amortising payment: the constant annual amount that retires
   `principal` over `years` at `ratePct`. Lives here rather than in the
   Venture Builder because the dashboard re-derives the same DSCR from the
   saved model — two implementations of this would drift, and the number
   they disagree about is the one a lender reads. */
function annualDebtService(principal, ratePct, years) {
  if (!(principal > 0) || !(years > 0)) return 0;
  const r = ratePct / 100;
  if (r === 0) return principal / years;
  return principal * r / (1 - Math.pow(1 + r, -years));
}

/* ---- look-through effective interest ----
   Walks each OpCo holding back up the ownership chain, multiplying
   percentages. A party appearing both directly at OpCo and through the
   chain (the classic founder-trust pattern) has its two paths summed —
   which is exactly the number a regulator reconstructs, and the one
   applicants routinely get wrong by reading only the OpCo register.

   `holders` is { tierKey: [{ n, p, chain, local, direct }] }.
   Returns { partyName: { direct, indirect, local } } in percentage points. */
function lookThrough(holders) {
  holders = holders || {};
  const parties = {};
  const add = (name, amount, isDirect, local) => {
    const k = String(name || "").trim() || "Unnamed";
    parties[k] = parties[k] || { direct: 0, indirect: 0, local: false };
    parties[k][isDirect ? "direct" : "indirect"] += amount;
    if (local) parties[k].local = true;
  };

  /* The same tier can legitimately be reached by several paths with
     different shares (the founder trust is reached both directly from
     OpCo and up through HoldCo), so the guard has to be per-path, not
     global — a visited *set* would silently drop the second path and
     understate the founder's interest. `path` carries the chain walked so
     far and only blocks a genuine cycle. */
  function resolve(tierKey, share, isDirect, path) {
    if (share <= 0) return;
    if (path.includes(tierKey)) return;            // genuine cycle — stop
    const next = path.concat(tierKey);
    (holders[tierKey] || []).forEach(h => {
      const frac = (+h.p || 0) / 100;
      if (frac <= 0) return;
      if (h.chain && holders[h.chain]) resolve(h.chain, share * frac, isDirect, next);
      else add(h.n, share * frac * 100, isDirect, h.local);
    });
  }

  (holders.op || []).forEach(h => {
    const frac = (+h.p || 0) / 100;
    if (frac <= 0) return;
    if (h.chain && holders[h.chain]) {
      // a stake the founder holds at OpCo through their own named vehicle
      // is still a DIRECT OpCo interest; everything else is indirect.
      resolve(h.chain, frac, !!h.direct, ["op"]);
    } else {
      add(h.n, frac * 100, true, h.local);
    }
  });
  return parties;
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

/* ---- service worker ----

   Registered from here rather than inline, because the CSP has no
   'unsafe-inline' in script-src and adding one to register a worker
   would trade the control that enforces this site's central privacy
   claim for a convenience.

   Failure is swallowed on purpose. The worker adds offline capability
   and nothing else: it is network-first for every request, so a visitor
   whose browser refuses to register it gets precisely the site they
   would have got anyway. A console error here would describe a
   degradation nobody experienced. */
if (typeof navigator !== "undefined" && "serviceWorker" in navigator &&
    location.protocol !== "file:" && !isEmbedded()) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

if (typeof window !== "undefined") {
  Object.assign(window, { STORE_KEY, JK_LOGO, JK_LOGO_LIGHT, applyPartner, mountChrome, isEmbedded, applyEmbedMode,
    saveAnswers, loadAnswers, clearAnswers, computeScores, indexVerdict, drawRadar, wrapLabel,
    wireToolEnquiryForm, sessionGet, sessionSet, reportingWrite,
    /* Exported so the company profile can COUNT the toolbox rather
       than assert a number beside it. The deck this page replaces
       was headed "Twelve tools" and listed nine — the count was
       right and the list was three short, which is exactly the
       drift a derived figure cannot have. */
    TOOL_MENU,
    toolStore, fmtMoney, fmtNum, fmtRatio, clampNum, escapeHtml, mountReveal,
    citeChip, citeChips, mountPrintHead, toolMailto, wireDisclosure,
    annualDebtService, lookThrough });
}
