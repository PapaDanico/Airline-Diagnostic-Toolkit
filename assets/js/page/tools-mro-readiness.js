/* Extracted verbatim from tools/mro-readiness.html so the site can carry a real
   script-src. Behaviour is unchanged: the tag sits where the inline
   block sat, with no defer or async, so execution order is identical.
   Edit here, not in the HTML. */

applyPartner(); mountChrome();

const DOMAINS = [
  { id: "compliance", name: "Airworthiness & Compliance", weight: 25, qs: [
    "AD / Service Bulletin tracking and close-out discipline",
    "Audit readiness of technical records (if a regulator or lessor audited tomorrow)",
    "Continuing airworthiness management oversight of the fleet",
    "Occurrence / defect reporting discipline and follow-through"
  ]},
  { id: "records", name: "Technical Records & Digitisation", weight: 15, qs: [
    "Digitisation of technical records (vs paper-based)",
    "Component / life-limited-parts tracking accuracy (hours, cycles, calendar)",
    "Retrievability — time to produce a component's full back-to-birth history",
    "Data integration between maintenance, engineering and finance systems"
  ]},
  { id: "reliability", name: "Reliability & Maintenance Programme", weight: 20, qs: [
    "MSG-3 task-interval review and escalation/de-escalation discipline",
    "Defect trend analysis and root-cause investigation",
    "Unscheduled removal rate tracking against fleet benchmarks",
    "Maintenance programme optimisation (task packaging, check intervals)"
  ]},
  { id: "mel", name: "MEL & Dispatch Management", weight: 20, qs: [
    "MEL deferral tracking and carry-forward visibility",
    "Rectification-interval discipline (A/B/C category compliance)",
    "Dispatch-reliability impact of deferred items — visibility to leadership",
    "Recurring-defect linkage back to MEL and reliability data"
  ]},
  { id: "sourcing", name: "Spares, Rotables & MRO Sourcing", weight: 20, qs: [
    "Spares availability planning and AOG risk management",
    "Rotable pooling vs owned-stock strategy",
    "In-house vs outsourced MRO (make-vs-buy) decision discipline",
    "MRO turnaround-time (TAT) tracking against contracted SLAs"
  ]}
];
const SCALE = JK.scaleGeneric;
const KEY = "dn_mro_readiness_v1";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };
let answers = load();

const panels = document.getElementById("panels");
DOMAINS.forEach(d => {
  const panel = document.createElement("div");
  panel.className = "mro-panel";
  panel.innerHTML = `<h2>${d.name}</h2><p class="w">Weight ${d.weight}% of index</p>`;
  d.qs.forEach((q, qi) => {
    const wrap = document.createElement("div");
    wrap.className = "mro-q";
    const opts = SCALE.map((s, si) => `<option value="${si}">${si} — ${s}</option>`).join("");
    wrap.innerHTML = `<label>${q}</label><select data-d="${d.id}" data-q="${qi}"><option value="">Not answered</option>${opts}</select>`;
    panel.appendChild(wrap);
    const sel = wrap.querySelector("select");
    sel.value = (answers[d.id] || [])[qi] ?? "";
    sel.addEventListener("change", () => {
      answers[d.id] = answers[d.id] || [];
      answers[d.id][qi] = sel.value === "" ? undefined : parseInt(sel.value, 10);
      save(answers);
      recalc();
    });
  });
  panels.appendChild(panel);
});

function recalc() {
  let weighted = 0, wsum = 0, answeredAll = true;
  const domainPcts = DOMAINS.map(d => {
    const vals = (answers[d.id] || []).filter(v => Number.isInteger(v));
    if (vals.length < d.qs.length) answeredAll = false;
    const pct = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length / 4) * 100 : 0;
    weighted += pct * d.weight; wsum += d.weight;
    return { name: d.name, pct: Math.round(pct) };
  });
  drawRadar(document.getElementById("mro-radar"), domainPcts);
  const idxEl = document.getElementById("mro-index");
  const bandEl = document.getElementById("mro-band");
  const qualEl = document.getElementById("mro-qual");
  if (!answeredAll) {
    idxEl.textContent = "—";
    bandEl.textContent = "Answer all 20 questions to see your index.";
    qualEl.textContent = "";
    return;
  }
  const index = Math.round(weighted / wsum);
  const v = indexVerdict(index);
  idxEl.textContent = index;
  idxEl.style.color = v.color;
  bandEl.textContent = v.band;
  bandEl.style.color = v.color;
  const sorted = [...domainPcts].sort((a, b) => a.pct - b.pct);
  qualEl.innerHTML = `Widest gaps: <strong>${sorted[0].name}</strong> (${sorted[0].pct}%) and <strong>${sorted[1].name}</strong> (${sorted[1].pct}%).`;
}
recalc();

document.getElementById("mro-reset").addEventListener("click", () => {
  if (!confirm("Clear all your answers on this device?")) return;
  answers = {}; save(answers);
  document.querySelectorAll(".mro-q select").forEach(s => s.value = "");
  recalc();
});

wireToolEnquiryForm("mro-enquiry", "MRO & Technical Readiness Diagnostic");
