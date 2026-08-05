/* Extracted verbatim from tools/fuel-optimizer.html so the site can carry a real
   script-src. Behaviour is unchanged: the tag sits where the inline
   block sat, with no defer or async, so execution order is identical.
   Edit here, not in the HTML. */

applyPartner(); mountChrome();
const fmt = n => "$" + Math.round(n).toLocaleString("en-US");
function recalc() {
  const spend = parseFloat(document.getElementById("spend").value) || 0;
  const prem = parseFloat(document.getElementById("premium").value) || 0;
  const bench = parseFloat(document.getElementById("benchmark").value) || 0;
  const gap = Math.max(0, prem - bench);     // premium gap, percentage points
  const high = spend * gap / (100 + prem);   // premium is already inside spend
  const low = high * 0.5;                    // conservative capture
  const savePct = spend > 0 ? (high / spend) * 100 : 0;
  const rng = document.getElementById("range");
  const qual = document.getElementById("qual");
  if (high <= 0) {
    rng.textContent = "On benchmark";
    qual.textContent = "Your contract is already at or below the market benchmark. The opportunity is to lock that in and manage price risk — see the hedge-trigger framework in the full tool.";
    return;
  }
  rng.textContent = fmt(low) + " – " + fmt(high);
  qual.innerHTML = `Your airline could be saving between <strong>${fmt(low)}</strong> and <strong>${fmt(high)}</strong> a year by renegotiating closer to market benchmarks — roughly ${savePct.toFixed(1)}% of your current fuel spend.`;
}
["spend","premium","benchmark","uplift"].forEach(id =>
  document.getElementById(id).addEventListener("input", recalc));
recalc();
wireToolEnquiryForm("fuel-enquiry", "Fuel Contract Optimizer Lite",
  { downloadUrl: "../assets/docs/DN_Fuel_Tender_Spec.pdf", downloadName: "Fuel Tender Specification" });
