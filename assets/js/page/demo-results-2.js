/* Extracted verbatim from demo-results.html so the site can carry a real
   script-src. Behaviour is unchanged: the tag sits where the inline
   block sat, with no defer or async, so execution order is identical.
   Edit here, not in the HTML. */

// Sample data for demo (same structure as real results)
const sampleAnswers = {
  safety: [2, 1, 2, 3, 2],
  ops: [4, 4, 4, 4, 3],
  fleet: [3, 3, 3, 3, 3],
  cost: [2, 2, 2, 2, 2],
  revenue: [3, 3, 3, 3, 2],
  commercial: [2, 2, 2, 2, 2],
  people: [3, 3, 3, 3, 3],
  finance: [2, 2, 1, 2, 2]
};
const s = computeScores(sampleAnswers);
const sorted = [...s.domains].sort((a, b) => a.pct - b.pct);

// Prescriber
const rxHost = document.getElementById("rx");
sorted.filter(d => d.pct < 65).slice(0, 3).forEach(d => {
  const div = document.createElement("div");
  div.className = "rx";
  const cask = d.caskLink ? `<div class="jk-tool"><a href="tools/cask-calculator.html">→ Check your unit cost with our free CASK Benchmarking Calculator</a></div>` : "";
  const canvas = d.canvasLink ? `<div class="jk-tool"><a href="tools/operating-model-canvas.html">→ Map the whole business with our free Operating Model Canvas</a></div>` : "";
  const std = d.standard ? `<div class="std">Aligns to recognised standard: <strong>${d.standard}</strong></div>` : "";
  div.innerHTML = `
    <h3>${d.name} — ${d.pct}% <span class="rag rag-${d.rag}" style="font-size:.8rem"><span class="dot"></span>${JK.ragLabel(d.pct)}</span></h3>
    <div class="cat">${d.rxCategory}</div>
    ${std}
    <div class="jk-tool">JK diagnostic that goes deeper: ${d.jkTool}</div>
    ${cask}
    ${canvas}`;
  rxHost.appendChild(div);
});

// Radar — uses the shared drawRadar() from common.js (this used to carry
// its own stale copy, predating that version's long-label wrapping fix)
drawRadar(document.getElementById("radar"), s.domains);
