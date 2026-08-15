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
