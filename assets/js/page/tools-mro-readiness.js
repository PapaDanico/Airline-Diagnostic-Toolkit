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
const save = (s) => reportingWrite(() => localStorage.setItem(KEY, JSON.stringify(s)));
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
    mountPrintSummary(null);
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
  summarise(index, v, domainPcts, sorted);
}

/* ---- answer-first opening page for the printed pack ----

   The screen reports domains; a technical improvement plan is built
   from questions. A Chief Engineer told "Technical Records is at 40%"
   knows only that something in there is wrong — the four items behind
   the score are what actually get assigned to someone. The summary
   therefore names the individual questions scored at or below "basic",
   which the tool has always known and never said out loud.

   Airworthiness leads regardless of whether it is the lowest domain.
   Every other gap here costs money; that one carries the certificate,
   and a pack that ranks a 45% compliance score below a 40% sourcing
   score has ordered the findings by arithmetic rather than by
   consequence. */
function summarise(index, v, domainPcts, sorted) {
  const f = [];
  const pctOfDomain = (id) => {
    const d = DOMAINS.findIndex(x => x.id === id);
    return d < 0 ? null : domainPcts[d].pct;
  };
  const comp = pctOfDomain("compliance");

  if (comp !== null && comp < 65) f.push({ sev: comp < 45 ? "stop" : "warn",
    h: `Airworthiness and compliance at ${comp}%`,
    d: comp < 45
      ? `The heaviest-weighted domain and the one a regulator or lessor opens first. At this level the exposure is the certificate, not the cost base — AD close-out, CAMO oversight and occurrence reporting come before any optimisation work.`
      : `Adequate but not audit-proof. The gap here is the one that converts into findings at an audit rather than into cost, so it is sequenced ahead of the commercial domains whatever their scores.` });

  /* The specific items, named. Anything at 0 or 1 is "no capability" or
     "basic / informal" on the page's own scale — not a weakness to
     monitor but a task to assign. */
  const weak = [];
  DOMAINS.forEach(d => (answers[d.id] || []).forEach((val, qi) => {
    if (Number.isInteger(val) && val <= 1) weak.push({ q: d.qs[qi], d: d.name, val });
  }));
  weak.sort((a, b) => a.val - b.val);
  if (weak.length) f.push({ sev: weak.some(w => w.val === 0) ? "stop" : "warn",
    h: `${weak.length} item${weak.length === 1 ? " is" : "s are"} at or below "basic / informal"`,
    d: weak.slice(0, 3).map(w => `${w.q} (${SCALE[w.val].toLowerCase()})`).join("; ") +
       (weak.length > 3 ? `; and ${weak.length - 3} more.` : ".") +
       ` These are the first entries on a technical improvement plan — each is a named owner and a date, not a programme.` });

  /* The widest domain gap, unless airworthiness has already been
     reported above and is that gap — saying it twice wastes the page. */
  const COMPLIANCE_NAME = DOMAINS.find(d => d.id === "compliance").name;
  if (sorted[0].pct < 65 && !(comp !== null && comp < 65 && sorted[0].name === COMPLIANCE_NAME))
    f.push({ sev: "warn", h: `${sorted[0].name} is the widest gap at ${sorted[0].pct}%`,
      d: `Next widest is ${sorted[1].name} at ${sorted[1].pct}%. Both sit below the level at which the domain supports the rest of the operation rather than draining it.` });

  /* "Widest gap" is the wrong phrase when the lowest domain is strong,
     and absurd when every domain ties at 100% — the earlier wording
     reported a best-in-class operation as having its widest gap in
     airworthiness at 100%. Above 80 the lowest domain is the thinnest
     margin, not a gap; a tie has no lowest at all. */
  const tied = sorted[0].pct === sorted[sorted.length - 1].pct;
  const lowest = tied
    ? `all five domains level at ${sorted[0].pct}%`
    : sorted[0].pct >= 80
      ? `thinnest margin ${sorted[0].name} at ${sorted[0].pct}%`
      : `widest gap ${sorted[0].name} at ${sorted[0].pct}%`;

  if (!f.some(x => x.sev === "stop" || x.sev === "warn"))
    f.push({ sev: "ok", h: `No domain below 65% and no item below "developing"`,
      d: tied
        ? `Every domain scores ${sorted[0].pct}%, so there is no weakest link to attack. The work is defending the position: the discipline that produced these scores has to survive fleet growth and the next change of postholder.`
        : `The weakest domain is ${sorted[0].name} at ${sorted[0].pct}%, which is an optimisation target rather than a gap. Nothing here blocks an audit or a lessor inspection.` });

  mountPrintSummary({
    title: `Technical Readiness Index ${index} — ${v.band}`,
    verdict: `${v.text} Weighted across five domains, ${lowest}.`,
    findings: f,
    basis: `Twenty questions across five weighted domains — airworthiness and compliance 25%, reliability 20%, MEL and dispatch 20%, sourcing 20%, technical records 15% — each scored 0–4 and normalised to 100. A self-assessment screening tool, not a compliance audit: the scores are the operator's own reading of their operation.`
  });
}
recalc();

document.getElementById("mro-reset").addEventListener("click", () => {
  if (!confirm("Clear all your answers on this device?")) return;
  answers = {}; save(answers);
  document.querySelectorAll(".mro-q select").forEach(s => s.value = "");
  recalc();
});

wireToolEnquiryForm("mro-enquiry", "MRO & Technical Readiness Diagnostic");

/* A result you cannot take away is a result that exists only for as long
   as the tab does. mountPrintHead stamps the mark, the tool name and the
   date onto the printed copy, because a board pack gets circulated
   detached from the page that produced it. */
mountPrintHead("MRO & Technical Readiness Diagnostic",
  "Technical Readiness Index across twenty airworthiness questions");
document.getElementById("print").addEventListener("click", () => window.print());
