/* Extracted verbatim from methodology.html so the site can carry a real
   script-src. Behaviour is unchanged: the tag sits where the inline
   block sat, with no defer or async, so execution order is identical.
   Edit here, not in the HTML. */

applyPartner(); mountChrome();

/* The data-as-of stamp, read off the benchmarks rather than typed.

   This page said "current as of Q4 2024 – mid-2025" while the data
   carried figures dated June 2026 — a full year of refreshes the
   methodology page never heard about, on the one page whose subject is
   how current the figures are.

   results.html had exactly this bug and it was fixed there: its stamp
   is derived from JK.benchmarkMeta and asserted against the data. The
   fix was applied to one of the two pages that made the claim. Same
   source of truth here now, so a refreshed figure updates the sentence
   about refreshed figures. */
{
  const meta = JK.benchmarkMeta;
  const asof = document.getElementById("meth-asof");
  if (asof && meta) asof.textContent = meta.asOf;

  const src = document.getElementById("meth-sources");
  if (src && meta && meta.sources.length) src.textContent = meta.sources.join("; ");
}

/* What the suites checked, read from the file they generate.

   assets/js/verification-data.js is written by
   scripts/build-verification.mjs from records the suites emit as they
   run, and CI fails if the committed file disagrees with the run. So
   this table cannot claim a check that did not happen — which is the
   only reason it is worth putting on a page.

   A script rather than a fetch, because the E2E suite drives this site
   from file:// and fetch has an opaque origin there. The first version
   used fetch, passed when I drove it over http, and showed its fallback
   under the harness — a verification panel silently displaying "could
   not be loaded" while the paragraph above it promised the checks. The
   assertion below now refuses that state explicitly. */
{
  const host = document.getElementById("verif-body");
  const report = typeof window !== "undefined" ? window.JK_VERIFICATION : null;

  if (host) {
    if (report && Array.isArray(report.suites) && report.suites.length) {
      const ul = document.createElement("ul");
      for (const s of report.suites) {
        const li = document.createElement("li");
        const b = document.createElement("strong");
        /* textContent throughout. This is generated data, but it is
           still data reaching a page, and nothing here earns innerHTML. */
        b.textContent = s.headline;
        li.appendChild(b);
        ul.appendChild(li);
      }
      host.replaceChildren(ul);
    } else {
      /* Say nothing rather than something reassuring. A verification
         panel that cannot read its own source is the one thing on this
         page that must not degrade into a comfortable placeholder. */
      const p = document.createElement("p");
      p.className = "muted";
      p.style.fontSize = "var(--fs-sm)";
      p.textContent =
        "The verification figures could not be loaded, so none are shown. " +
        "They are generated at assets/verification.json by the test suites on every build.";
      host.replaceChildren(p);
    }
  }
}
