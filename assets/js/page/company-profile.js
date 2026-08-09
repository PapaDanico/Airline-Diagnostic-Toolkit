/* ============================================================
   Company profile — the deck, counted from the product.

   This page replaces a fifteen-slide PowerPoint, and it exists as a
   page for a reason the deck itself demonstrates. Slide 7 was headed
   "Twelve tools. Free." and listed nine. The count was right; the list
   was three short — Fuel Contract Optimizer, MRO Readiness Assessment
   and the Venture Control Room, which is the flagship. Three live
   products were invisible to anyone reading the company profile, and
   nothing could have told anybody: a slide has no way to notice that
   the toolbox grew.

   So nothing here is typed. The toolbox is rendered from TOOL_MENU —
   the same registry that builds the site navigation, which means a
   tool cannot appear in the menu and be missing from the profile. The
   sector count comes from the venture data, the phases from the
   certification model, the questions and domains from the scoring
   model. tests/audit.mjs fails the build if any of them drifts.

   The sister platform's profile page does the same thing from its own
   registers. Rule 10 of the shared charter, applied on both sides.
   ============================================================ */
applyPartner(); mountChrome();

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  /* ---- everything countable, counted ---- */
  const groups = (window.TOOL_MENU || []).map((g) => ({
    group: g.group,
    items: g.items.slice()
  }));
  const toolCount = groups.reduce((n, g) => n + g.items.length, 0);
  /* JKV, not JK. The venture model is its own namespace, and the five
     certification phases are phaseSpine — JK.phases is the 90-day
     sprint, a different thing with a confusingly similar name. Reading
     the wrong one would have printed a plausible number for the wrong
     concept, which is worse than printing nothing. */
  const sectors = (window.JKV && JKV.sectors) || [];
  const phases = (window.JKV && JKV.phaseSpine) || [];
  const domains = (window.JK && JK.domains) || [];
  const questions = domains.reduce((n, d) => n + d.questions.length, 0);
  const weightTotal = domains.reduce((n, d) => n + d.weight, 0);

  const stats = [
    [String(sectors.length), "regulated sectors covered — every requirement cited to its instrument"],
    [String(phases.length), "certification phases mapped, per the Authority\u2019s published process"],
    [String(toolCount), "free tools — no account, no signup, usable board-side today"],
    ["0", "data leaving the browser — every diagnostic runs and stays on this device"]
  ];

  const statsHost = $("cp-stats");
  if (statsHost) {
    statsHost.innerHTML = stats
      .map(([figure, label]) => `<div><b>${figure}</b><span>${label}</span></div>`)
      .join("");
  }

  /* The toolbox, in full, from the registry that builds the nav. The
     deck's error is unreproducible here: a tool the menu knows about
     and this list omits cannot exist. */
  const toolHost = $("cp-tools");
  if (toolHost) {
    toolHost.innerHTML = groups
      .map(
        (g) =>
          /* A div, not a section. jk.css gives every <section> the full
             band padding (`section { padding: var(--sec-y) 0 }`), so a
             nested one put a section's worth of air above and below each
             tool group — about 200px of nothing between two short lists.
             These are groups within a section, not sections. */
          `<div class="cp-group">
             <h3>${escapeHtml(g.group)} <small>${g.items.length} tools</small></h3>
             <ul>${g.items
               .map(
                 (t) =>
                   `<li><a href="${t.file}" data-keep-partner>${escapeHtml(t.label)}</a></li>`
               )
               .join("")}</ul>
           </div>`
      )
      .join("");
  }

  /* The scoring model, stated once and derived. */
  const modelHost = $("cp-model");
  if (modelHost && domains.length) {
    modelHost.innerHTML =
      `<p>The Airline Health Scorecard is <b>${questions} questions</b> across ` +
      `<b>${domains.length} weighted domains</b>, producing a 0–100 index. ` +
      `Weights total ${weightTotal}% and are calibrated to fleet type and operating model.</p>` +
      `<table class="cp-table"><thead><tr><th>Domain</th><th>Weight</th><th>Questions</th></tr></thead><tbody>` +
      domains
        .map(
          (d) =>
            `<tr><td>${escapeHtml(d.name)}</td><td>${d.weight}%</td><td>${d.questions.length}</td></tr>`
        )
        .join("") +
      `</tbody><tfoot><tr><td><b>Total</b></td><td><b>${weightTotal}%</b></td><td><b>${questions}</b></td></tr></tfoot></table>`;
  }

  /* The six sectors, from the venture model rather than a list typed
     beside it — the regulatory index and this page must agree. */
  const sectorHost = $("cp-sectors");
  if (sectorHost && sectors.length) {
    sectorHost.innerHTML = sectors
      .map((s) => `<li>${escapeHtml(s.name || s.label || String(s))}</li>`)
      .join("");
  }

  /* Stamped on the day it is read, not the day it was written. The
     whole argument for this being a page. */
  const asOf = $("cp-asof");
  if (asOf) {
    asOf.textContent = new Date().toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric"
    });
  }
})();
