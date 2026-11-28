/* Extracted verbatim from about.html so the site can carry a real
   script-src. Behaviour is unchanged: the tag sits where the inline
   block sat, with no defer or async, so execution order is identical.
   Edit here, not in the HTML. */

applyPartner(); mountChrome();

/* Coverage figures come off the data model, never typed into the markup.
   A scope claim has to be true on the day someone reads it, not the day
   it was written — an About page is the likeliest page to go stale
   because it is the one nobody re-reads. */
(function () {
  /* Free means in an open toolbox AND not a client toolkit. */
  const open = JK.toolboxes.filter(b => !b.locked).reduce((n, b) => n + b.tools.filter(t => !t.client).length, 0);
  const client = JK.toolboxes.filter(b => !b.locked).reduce((n, b) => n + b.tools.filter(t => t.client).length, 0);
  const all = JK.toolboxes.reduce((n, b) => n + b.tools.length, 0);
  const questions = JK.domains.reduce((n, d) => n + d.questions.length, 0);
  const meta = JK.benchmarkMeta;
  const rows = [
    [open, "free diagnostic tools", "no signup — " + client + " more as client toolkits, " + (all - open - client) + " under engagement"],
    [JK.domains.length, "scorecard domains", questions + " questions, weighted"],
    [meta.sources.length, "benchmark sources", "oldest as at " + meta.asOf],
    [JK.phases.length, "engagement phases", "entry diagnostic through delivery"]
  ];
  document.getElementById("about-cover").innerHTML = rows.map(
    ([v, label, note]) => `<div><b>${v}</b><span>${label}</span><small>${note}</small></div>`
  ).join("");
})();
