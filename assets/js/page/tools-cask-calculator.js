/* Extracted verbatim from tools/cask-calculator.html so the site can carry a real
   script-src. Behaviour is unchanged: the tag sits where the inline
   block sat, with no defer or async, so execution order is identical.
   Edit here, not in the HTML. */

applyPartner(); mountChrome();
const fmtUsd = n => "$" + Math.round(n).toLocaleString("en-US");
// Bands mirror the scorecard's Cost & Fuel unit-cost question (USD/ASK).
// Target comes first so the badge can never contradict the gap message.
function bandFor(caskUsd, targetUsd) {
  if (caskUsd <= targetUsd)
    return caskUsd < 0.08
      ? { txt: "Best-in-class unit cost", col: "#5cd6a0" }
      : { txt: "At JK competitive target", col: "#5cd6a0" };
  if (caskUsd <= 0.11) return { txt: "Above target — optimisation upside", col: "#f0c14b" };
  if (caskUsd <= 0.13) return { txt: "High — significant cost gap", col: "#ff8a80" };
  return { txt: "Very high — urgent cost action", col: "#ff8a80" };
}
function recalc() {
  const op = parseFloat(document.getElementById("opcost").value) || 0;
  const ask = parseFloat(document.getElementById("ask").value) || 0;
  const targetRaw = parseFloat(document.getElementById("target").value);
  const targetCents = targetRaw > 0 ? targetRaw : 9;   // fall back to JK default if blank/≤0
  const targetUsd = targetCents / 100;
  const caskEl = document.getElementById("cask");
  const bandEl = document.getElementById("band");
  const qual = document.getElementById("qual");
  if (op <= 0 || ask <= 0) {
    caskEl.textContent = "—";
    caskEl.style.color = "";
    bandEl.textContent = "Enter operating cost and ASK to see your CASK.";
    bandEl.style.color = "";
    qual.textContent = "CASK = total operating cost ÷ available seat-kilometres.";
    return;
  }
  const caskUsd = op / ask;
  const caskCents = caskUsd * 100;
  const b = bandFor(caskUsd, targetUsd);
  caskEl.textContent = caskCents.toFixed(2) + " US¢ / ASK";
  caskEl.style.color = b.col;
  bandEl.textContent = b.txt;
  bandEl.style.color = b.col;
  if (caskUsd > targetUsd) {
    const gapUsd = caskUsd - targetUsd;
    const high = gapUsd * ask;          // full gap to target
    const low = high * 0.5;             // conservative capture
    qual.innerHTML = `That's <strong>${(caskCents - targetCents).toFixed(2)} US¢</strong> above the JK target of ${targetCents.toFixed(1)} US¢. Closing that gap could remove <strong>${fmtUsd(low)}</strong>–<strong>${fmtUsd(high)}</strong> from annual operating cost (50–100% capture).`;
  } else {
    qual.innerHTML = `You're at or below the JK competitive target — a strong unit-cost position. The priority is protecting it as you grow: watch stage-length mix, gauge and overhead creep.`;
  }
}
// fleet-type stage-length context (informational, not part of the CASK maths)
const FLEET_NOTE = {
  "B737-800": "Typical stage length 900–1,500km; CASK is sensitive to the shorter end of this range.",
  "A320": "Typical stage length 900–1,500km, comparable to the 737-800 — gauge and configuration matter more than type here.",
  "E190": "Regional gauge (~100 seats); expect 10–20% higher CASK than narrowbody peers at the same stage length, offset by load-factor flexibility on thin routes.",
  "ATR72": "Turboprop, short stage lengths (<700km typical); CASK is structurally higher per seat-km — compare on cost-per-trip, not just CASK.",
  "DH8D": "Turboprop regional; similar dynamics to the ATR72 — benchmark trip economics, not CASK alone, for thin/short routes.",
  "Other": "Benchmark against the closest comparable gauge and stage length in your network."
};
function updateFleetNote() {
  document.getElementById("fleetNote").textContent = FLEET_NOTE[document.getElementById("fleetType").value] || "";
}
document.getElementById("fleetType").addEventListener("change", updateFleetNote);
updateFleetNote();

/* Cost-line detail.

   Crew, Maintenance and Airport/Nav were collected and then never read:
   three labelled, prefilled inputs under a heading promising a
   "Cost-line breakdown", of which exactly one did anything. Nothing on
   the page said so, and because none of them carries a name they were
   not reaching the enquiry form either — a visitor typed their cost
   structure into fields that fed nothing at all.

   Each line now gets the arithmetic Fuel already had: its share of the
   computed CASK, in the same cents/ASK unit as everything else. That is
   division, not modelling — no benchmark is invented for Crew,
   Maintenance or Airport/Nav, because JK publishes a target share for
   fuel (32%) and not for the others. Inventing three more targets to
   make the panel symmetrical would have put numbers on the page that
   nothing stands behind, which is the defect this whole session has
   been removing rather than adding.

   The shares are also reconciled against 100 for the first time. Four
   independent percentage fields could always sum to 115 and the page
   would price each one without comment. */
const TARGET_FUEL_SHARE = 32;
const COST_LINES = [
  { id: "fuelPct", name: "Fuel" },
  { id: "crewPct", name: "Crew" },
  { id: "maintPct", name: "Maintenance" },
  { id: "airportPct", name: "Airport / Nav" }
];
const pctOf = (id) => parseFloat(document.getElementById(id).value) || 0;

function recalcFuel() {
  const op = parseFloat(document.getElementById("opcost").value) || 0;
  const ask = parseFloat(document.getElementById("ask").value) || 0;
  const targetCents = (parseFloat(document.getElementById("target").value) || 9);
  const fuelPct = pctOf("fuelPct");
  const fuelQual = document.getElementById("fuelQual");
  const lineList = document.getElementById("lineBreakdown");
  if (op <= 0 || ask <= 0) {
    lineList.innerHTML = "";
    fuelQual.textContent = "Enter your figures to see the cost-line breakdown.";
    return;
  }
  const caskCentsAll = (op / ask) * 100;

  /* Every line, including the ones left at zero — a line shown as 0.00¢
     is a visible answer; a line silently omitted looks like a bug. */
  const rows = COST_LINES.map((l) => {
    const pct = pctOf(l.id);
    return `<span>${l.name}</span><span>${pct}%</span><span><strong>${(caskCentsAll * pct / 100).toFixed(2)}¢</strong></span>`;
  });
  const stated = COST_LINES.reduce((n, l) => n + pctOf(l.id), 0);
  const residual = 100 - stated;
  if (residual >= 0) {
    rows.push(`<span>Everything else</span><span>${residual.toFixed(0)}%</span><span><strong>${(caskCentsAll * residual / 100).toFixed(2)}¢</strong></span>`);
  }
  lineList.innerHTML = rows.join("");

  if (stated > 100) {
    fuelQual.innerHTML = `Your four cost lines add up to <strong>${stated.toFixed(0)}%</strong> of operating cost. They cannot exceed 100% — the figures above are priced off your ${caskCentsAll.toFixed(2)}¢ CASK as entered, but at least one share is wrong.`;
    return;
  }
  if (fuelPct <= 0) {
    fuelQual.textContent = "Enter a fuel share to compare it against JK's target.";
    return;
  }
  const fuelCaskCents = caskCentsAll * fuelPct / 100;
  const targetFuelCaskCents = targetCents * TARGET_FUEL_SHARE / 100;
  const gapCents = fuelCaskCents - targetFuelCaskCents;
  if (gapCents <= 0) {
    /* Describe the comparison that was actually made. This read "already
       at or below JK's 32% target fuel share" — a claim about SHARE —
       while the test above compares COSTS per ASK. At a 3.50¢ CASK with
       40% fuel, fuel costs 1.40¢/ASK against the 2.88¢ the target
       allows, so the sentence fired and told an operator their 40% share
       was at or below 32%, with "(40% of total)" printed inside the same
       sentence contradicting it. 40% is not an edge case: it is the
       figure this page cites for African carriers.

       The gap branch below already words this comparison correctly. */
    fuelQual.innerHTML = `Your fuel CASK is <strong>${fuelCaskCents.toFixed(2)} US¢/ASK</strong> (${fuelPct}% of total) — at or below the <strong>${targetFuelCaskCents.toFixed(2)}¢</strong> that JK's ${TARGET_FUEL_SHARE}% target fuel share allows at a ${targetCents.toFixed(2)}¢ target CASK.`;
    return;
  }
  const annualGap = (gapCents / 100) * ask; // cents→USD per ASK × ASK
  fuelQual.innerHTML = `Your fuel CASK is <strong>${fuelCaskCents.toFixed(2)} US¢/ASK</strong> (${fuelPct}% of total). At JK's ${TARGET_FUEL_SHARE}% target fuel share (${targetFuelCaskCents.toFixed(2)}¢), it would be <strong>${gapCents.toFixed(2)}¢ lower</strong> — saving roughly <strong>${fmtUsd(annualGap)}</strong> a year.`;
}
// opcost/ask/target feed both recalc() and recalcFuel(); the cost-line
// shares feed only recalcFuel() — one listener per field, not one per
// consumer. Derived from COST_LINES so a fifth line cannot be added to
// the panel and left unwired, which is how three of the four came to be
// inert in the first place.
/* Publish the unit cost for the route calculator to pick up.

   CASK is the one figure the route tool cannot ask an operator to
   produce off the top of their head, and it is the whole output of this
   page. Written on every valid recalculation and cleared the moment the
   inputs stop being valid, so a stale number can never pre-fill
   anything downstream. The route tool says where it came from. */
const caskStore = toolStore("cask");
function publishCask() {
  const op = parseFloat(document.getElementById("opcost").value) || 0;
  const ask = parseFloat(document.getElementById("ask").value) || 0;
  if (op <= 0 || ask <= 0) { caskStore.clear(); return; }
  caskStore.save({ caskCents: (op / ask) * 100, fleetType: document.getElementById("fleetType").value });
}

const recalcAll = () => { recalc(); recalcFuel(); publishCask(); };
["opcost","ask","target"].forEach(id =>
  document.getElementById(id).addEventListener("input", recalcAll));
document.getElementById("fleetType").addEventListener("change", publishCask);
COST_LINES.forEach(l =>
  document.getElementById(l.id).addEventListener("input", recalcFuel));
recalcAll();
wireToolEnquiryForm("cask-enquiry", "CASK Benchmarking Calculator");
