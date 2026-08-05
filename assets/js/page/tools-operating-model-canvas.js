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
const save = (state) => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };
let state = load();

// build the 9 panels
const grid = document.getElementById("grid");
PANELS.forEach((panel, i) => {
  const cell = document.createElement("div");
  cell.className = "omc-panel";
  cell.innerHTML = `<h4><span class="num">${i + 1}.</span> ${panel.t}</h4>
    <p class="prompt">${panel.p}</p>
    <textarea id="omc-${panel.id}" aria-label="${panel.t}"></textarea>`;
  grid.appendChild(cell);
  const ta = cell.querySelector("textarea");
  ta.value = state[panel.id] || "";
  ta.addEventListener("input", () => { state[panel.id] = ta.value; save(state); flashSaved(); });
});

// airline name field
const airline = document.getElementById("airline");
airline.value = state.__airline || "";
airline.addEventListener("input", () => { state.__airline = airline.value; save(state); flashSaved(); syncPrintHead(); });

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
});

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
