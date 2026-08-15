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
  /* Annual uplift was collected and never read. It had a label, a
     sensible default of 30,000,000 litres, and an input listener that
     called this function — so it looked live — while nothing in here
     touched it, and with no name attribute it did not reach the enquiry
     form either. A visitor typed their fuel volume into a field that fed
     nothing.

     It converts the result into the unit a fuel tender is actually
     negotiated in. Everything above is dollars a year, which is the
     right number for a board paper and the wrong one for the person at
     the table arguing over cents a litre. That is division by a figure
     the operator supplied — no benchmark and no model behind it. */
  const uplift = parseFloat(document.getElementById("uplift").value) || 0;
  const gap = Math.max(0, prem - bench);     // premium gap, percentage points
  const high = spend * gap / (100 + prem);   // premium is already inside spend
  const low = high * 0.5;                    // conservative capture
  const savePct = spend > 0 ? (high / spend) * 100 : 0;
  const rng = document.getElementById("range");
  const qual = document.getElementById("qual");
  /* Guarded rather than assumed: uplift is optional, and dividing by a
     blank field would print "$Infinity a litre". */
  const perLitre = uplift > 0 && spend > 0
    ? ` At ${Math.round(uplift).toLocaleString("en-US")} litres a year that is an effective <strong>$${(spend / uplift).toFixed(3)}/litre</strong> today`
    : "";
  /* No spend is not a verdict.

     `high` is spend x gap, so clearing the spend field drove it to zero
     and fell into the branch below, which congratulated the visitor on a
     contract it had been told nothing about: "already at or below the
     market benchmark", with an effective price of $0.000/litre "to hold
     in the next tender". The premium and benchmark fields still held
     their defaults, so the page looked fully answered.

     The markup ships the honest state — an em dash and "Enter your
     figures to see the range" — and before this nothing could return to
     it, because recalc() runs on load and every path out of it writes a
     result. Restoring it is the whole fix. */
  if (!(spend > 0)) {
    rng.textContent = "—";
    qual.textContent = "Enter your annual fuel spend to see the range.";
    return;
  }
  if (high <= 0) {
    rng.textContent = "On benchmark";
    qual.innerHTML = "Your contract is already at or below the market benchmark. The opportunity is to lock that in and manage price risk — see the hedge-trigger framework in the full tool."
      + (perLitre ? `${perLitre}, which is the figure to hold in the next tender.` : "");
    return;
  }
  rng.textContent = fmt(low) + " – " + fmt(high);
  qual.innerHTML = `Your airline could be saving between <strong>${fmt(low)}</strong> and <strong>${fmt(high)}</strong> a year by renegotiating closer to market benchmarks — roughly ${savePct.toFixed(1)}% of your current fuel spend.`
    + (uplift > 0
      ? `${perLitre}, and the saving is <strong>${(low / uplift * 100).toFixed(2)}–${(high / uplift * 100).toFixed(2)} US¢ a litre</strong> — the unit a tender is argued in.`
      : "");
}
["spend","premium","benchmark","uplift"].forEach(id =>
  document.getElementById(id).addEventListener("input", recalc));
recalc();
wireToolEnquiryForm("fuel-enquiry", "Fuel Contract Optimizer Lite",
  { downloadUrl: "../assets/docs/JK_Fuel_Tender_Spec.pdf", downloadName: "Fuel Tender Specification" });
