/* Extracted verbatim from tools/operating-model-canvas.html so the site can carry a real
   script-src. Behaviour is unchanged: the tag sits where the inline
   block sat, with no defer or async, so execution order is identical.
   Edit here, not in the HTML. */

applyPartner(); mountChrome();

const PANELS = [
  { id: "network",    t: "Network & Markets",        p: "Which markets and routes do you serve, and who are your target customer segments?" },
  { id: "fleet",      t: "Fleet & Assets",           p: "Aircraft types, ownership (owned / leased), and your utilisation strategy." },
  { id: "value",      t: "Value Proposition",        p: "What do you sell, and how are you positioned — LCC, full-service, hybrid, regional feeder?" },
  { id: "revenue",    t: "Revenue Model",            p: "Revenue mix: passenger fares, ancillaries, cargo, charter, codeshare." },
  { id: "cost",       t: "Cost Structure",           p: "Your biggest cost drivers and your unit-cost (CASK) strategy." },
  { id: "operations", t: "Operations & Safety",      p: "OCC, MRO, SMS, dispatch and turnaround — how operations are run and assured." },
  { id: "people",     t: "People & Organisation",    p: "Structure, leadership, key capabilities, and what is outsourced." },
  { id: "partners",   t: "Partnerships & Distribution", p: "Codeshares, interline, GSAs, and channels (direct, GDS, NDC, OTA)." },
  { id: "priorities", t: "Key Risks & Priorities",   p: "Top risks to manage, and your 3–5 strategic priorities for the next 12–24 months." }
];

const KEY = "dn_operating_model_canvas_v1";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = (state) => reportingWrite(() => localStorage.setItem(KEY, JSON.stringify(state)));
let state = load();

// build the 9 panels
const grid = document.getElementById("grid");
PANELS.forEach((panel, i) => {
  const cell = document.createElement("div");
  cell.className = "omc-panel";
  cell.innerHTML = `<h2><span class="num">${i + 1}.</span> ${panel.t}</h2>
    <p class="prompt">${panel.p}</p>
    <textarea id="omc-${panel.id}" aria-label="${panel.t}"></textarea>`;
  grid.appendChild(cell);
  const ta = cell.querySelector("textarea");
  ta.value = state[panel.id] || "";
  ta.addEventListener("input", () => { state[panel.id] = ta.value; save(state); flashSaved(); summarise(); });
});

// airline name field
const airline = document.getElementById("airline");
airline.value = state.__airline || "";
airline.addEventListener("input", () => { state.__airline = airline.value; save(state); flashSaved(); syncPrintHead(); summarise(); });

// "Saved" feedback
const savedEl = document.getElementById("saved");
let savedTimer;
function flashSaved() {
  savedEl.textContent = "Saved ✓";
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => { savedEl.textContent = "Saved on your device"; }, 1200);
}

// print header (airline + date), shown only when printing
function syncPrintHead() {
  document.getElementById("ph-name").textContent =
    (airline.value ? airline.value + " — " : "") + "Operating Model Canvas";
}
document.getElementById("ph-date").textContent =
  new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
syncPrintHead();

/* ---- answer-first opening page for the printed pack ----

   This tool computes nothing, so the only honest thing a summary can
   lead with is whether the canvas is finished — and where it is not,
   what that specific hole costs the reader. A blank Cost Structure is
   not one missing paragraph of nine: paired with a blank Revenue Model
   it means the document says nothing about whether the airline makes
   money, which is the first question anyone opening it will ask.

   The thinness check is the other half. Nine panels each holding one
   line reads as complete to a counter and as unfinished to a reader,
   and the counter is what a completeness score would otherwise be. */
const THIN_CHARS = 80;

function summarise() {
  const filled = PANELS.filter(p => (state[p.id] || "").trim().length > 0);
  const blank  = PANELS.filter(p => !(state[p.id] || "").trim().length);
  const thin   = filled.filter(p => (state[p.id] || "").trim().length < THIN_CHARS);
  if (!filled.length) return mountPrintSummary(null);

  const has = (id) => !!(state[id] || "").trim();
  const f = [];

  if (blank.length > PANELS.length / 2) f.push({ sev: "stop",
    h: `${blank.length} of ${PANELS.length} panels are empty`,
    d: `A canvas this sparse describes an intention rather than an operating model. The gaps are ${blank.slice(0, 4).map(p => p.t).join("; ")}${blank.length > 4 ? `; and ${blank.length - 4} more` : ""}.` });

  /* The pairings that make a hole consequential rather than merely
     incomplete. Each is a question the reader will ask that the
     document cannot answer. */
  const PAIRS = [
    { a: "revenue", b: "cost",       q: "whether the airline makes money",
      why: "They are the two halves of the same question, and a canvas missing either cannot be taken to a board or a lender." },
    { a: "fleet",   b: "network",    q: "whether the fleet suits the network",
      why: "Gauge and range are chosen against the sectors actually flown, so neither panel explains the aircraft decision on its own." },
    { a: "operations", b: "people",  q: "who is accountable for safety",
      why: "The operating model and the organisation behind it are read together at any audit, and separately by nobody." }
  ];
  PAIRS.forEach(pr => {
    if (!has(pr.a) && !has(pr.b)) f.push({ sev: "warn",
      h: `The canvas does not say ${pr.q}`,
      d: `${PANELS.find(p => p.id === pr.a).t} and ${PANELS.find(p => p.id === pr.b).t} are both empty. ${pr.why}` });
  });

  if (blank.length && blank.length <= PANELS.length / 2) f.push({ sev: "warn",
    h: `${blank.length} panel${blank.length > 1 ? "s" : ""} still empty`,
    d: `${blank.map(p => p.t).join("; ")}. Every panel a reader has to fill in for themselves is a place the model will be assumed rather than understood.` });

  if (thin.length) f.push({ sev: "note",
    h: `${thin.length} panel${thin.length > 1 ? "s are" : " is"} answered in a single line`,
    d: `${thin.slice(0, 4).map(p => p.t).join("; ")}${thin.length > 4 ? `; and ${thin.length - 4} more` : ""}. Short enough to count as complete and too short to be read as an answer — the usual sign of a panel filled in to clear the grid.` });

  if (!f.some(x => x.sev === "stop" || x.sev === "warn"))
    f.unshift({ sev: "ok", h: "All nine panels answered",
      d: `The canvas is complete as a document. What it cannot tell you is whether the nine answers are consistent with each other — that is the reading, and it is the work an outside pair of eyes is for.` });

  mountPrintSummary({
    title: `${(state.__airline || "").trim() ? (state.__airline || "").trim() + " — " : ""}Operating Model Canvas`,
    verdict: `${filled.length} of ${PANELS.length} panels answered` +
      (thin.length ? `, ${thin.length} of them in a single line` : "") +
      (blank.length ? `. ${blank.length} remain${blank.length === 1 ? "s" : ""} empty.` : ` — complete.`),
    findings: f,
    basis: `A structured capture of the operator's own description of their business across nine dimensions. Nothing here is computed, benchmarked or verified: the canvas records what the operator states, and its value is in what the nine statements reveal when read against one another.`
  });
}

// actions
document.getElementById("print").addEventListener("click", () => window.print());
document.getElementById("clear").addEventListener("click", () => {
  if (!confirm("Clear every panel on this canvas? This cannot be undone.")) return;
  state = {};
  save(state);
  PANELS.forEach(p => { document.getElementById("omc-" + p.id).value = ""; });
  airline.value = "";
  syncPrintHead();
  flashSaved();
  summarise();
});

summarise();
wireToolEnquiryForm("canvas-enquiry", "Operating Model Canvas");
// live-sync the enquiry form's airline field from the canvas's own airline
// input, until the visitor edits the enquiry field directly (a naive
// "only fill while empty" guard would stop syncing after the first
// keystroke, since the field is non-empty from then on)
const enquiryAirline = document.querySelector("#canvas-enquiry [name=airline]");
if (enquiryAirline) {
  let userEditedEnquiry = false;
  enquiryAirline.addEventListener("input", () => { userEditedEnquiry = true; });
  airline.addEventListener("input", () => {
    if (!userEditedEnquiry) enquiryAirline.value = airline.value;
  });
}

/* Letterhead on the printed canvas: logo, date, contact and the URL it
   came from. Without it the pack prints as an untitled grid. */
mountPrintHead("Operating Model Canvas");
