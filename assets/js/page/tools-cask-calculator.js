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

// fuel cost-line detail: your fuel CASK vs. JK's 32%-of-target fuel share
const TARGET_FUEL_SHARE = 32;
function recalcFuel() {
  const op = parseFloat(document.getElementById("opcost").value) || 0;
  const ask = parseFloat(document.getElementById("ask").value) || 0;
  const targetCents = (parseFloat(document.getElementById("target").value) || 9);
  const fuelPct = parseFloat(document.getElementById("fuelPct").value) || 0;
  const fuelQual = document.getElementById("fuelQual");
  if (op <= 0 || ask <= 0 || fuelPct <= 0) {
    fuelQual.textContent = "Enter your figures to see the fuel breakdown.";
    return;
  }
  const caskCents = (op / ask) * 100;
  const fuelCaskCents = caskCents * fuelPct / 100;
  const targetFuelCaskCents = targetCents * TARGET_FUEL_SHARE / 100;
  const gapCents = fuelCaskCents - targetFuelCaskCents;
  if (gapCents <= 0) {
    fuelQual.innerHTML = `Your fuel CASK is <strong>${fuelCaskCents.toFixed(2)} US¢/ASK</strong> (${fuelPct}% of total) — already at or below JK's ${TARGET_FUEL_SHARE}% target fuel share.`;
    return;
  }
  const annualGap = (gapCents / 100) * ask; // cents→USD per ASK × ASK
  fuelQual.innerHTML = `Your fuel CASK is <strong>${fuelCaskCents.toFixed(2)} US¢/ASK</strong> (${fuelPct}% of total). At JK's ${TARGET_FUEL_SHARE}% target fuel share (${targetFuelCaskCents.toFixed(2)}¢), it would be <strong>${gapCents.toFixed(2)}¢ lower</strong> — saving roughly <strong>${fmtUsd(annualGap)}</strong> a year.`;
}
// opcost/ask/target feed both recalc() and recalcFuel(); fuelPct feeds
// only recalcFuel() — one listener per field, not one per consumer
const recalcAll = () => { recalc(); recalcFuel(); };
["opcost","ask","target"].forEach(id =>
  document.getElementById(id).addEventListener("input", recalcAll));
document.getElementById("fuelPct").addEventListener("input", recalcFuel);
recalcAll();
wireToolEnquiryForm("cask-enquiry", "CASK Benchmarking Calculator");
