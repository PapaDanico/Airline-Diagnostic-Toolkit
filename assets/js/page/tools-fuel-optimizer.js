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
/* Above this many points over benchmark the gap stops reading as a
   badly argued contract. Set at 6 rather than the first number that
   looked wide: this page's own worked example is 6.5% against a 2%
   benchmark and its whole call to action is a fuel tender, so a
   threshold that caught the default example would have every visitor
   told, on the page selling them a renegotiation, that renegotiating
   will not work. */
const STRUCTURAL_GAP = 6;

/* ---- answer-first opening page for the printed pack ----

   The saving leads in the two units the argument is actually had in:
   dollars a year for the board paper, cents a litre for the person at
   the tender table. Below it, the two things that most often make a
   headline saving undeliverable — a premium so far above benchmark that
   the gap is a supply-position problem rather than a negotiating one,
   and a spend figure with no volume behind it to check it against. */
function summarise() {
  const spend  = parseFloat(document.getElementById("spend").value) || 0;
  const prem   = parseFloat(document.getElementById("premium").value) || 0;
  const bench  = parseFloat(document.getElementById("benchmark").value) || 0;
  const uplift = parseFloat(document.getElementById("uplift").value) || 0;
  if (!(spend > 0)) return mountPrintSummary(null);

  const gap  = Math.max(0, prem - bench);
  const high = spend * gap / (100 + prem);
  const low  = high * 0.5;
  const f    = [];

  if (high > 0) {
    f.push({ sev: gap >= STRUCTURAL_GAP ? "stop" : "warn",
      h: `${gap.toFixed(1)} points of premium above benchmark, worth ${fmt(low)}–${fmt(high)} a year`,
      d: `Paying ${prem.toFixed(1)}% over Platts against a ${bench.toFixed(1)}% benchmark on ${fmt(spend)} of spend — ${((high / spend) * 100).toFixed(1)}% of the fuel bill` +
         (uplift > 0 ? `, or ${(low / uplift * 100).toFixed(2)}–${(high / uplift * 100).toFixed(2)} US¢ a litre, which is the unit the tender is argued in.` : `. Enter annual uplift to convert this into cents a litre.`) });
  }

  /* A premium this far out is rarely a negotiating failure. It usually
     means single-supplier supply at the station, and the remedy is a
     second into-plane provider, not a harder conversation with the
     first. Saying "renegotiate" to an operator who cannot is advice
     they will discard along with the rest of the pack. */
  if (gap >= STRUCTURAL_GAP) f.push({ sev: "warn", h: "A gap this wide is usually structural, not commercial",
    d: `${prem.toFixed(1)}% over benchmark points to a single into-plane supplier at the station rather than a poorly argued contract. The lever is a second provider or a self-handled into-plane arrangement; a renegotiation alone will not recover the full ${fmt(high)}.` });

  if (uplift > 0 && spend > 0) {
    const perLitre = spend / uplift;
    /* Jet A-1 into-plane across East Africa has not traded below about
       $0.40 or above about $2.50 a litre in any recent year. Outside
       that, the spend and the volume are not describing the same thing
       — almost always a spend entered for the fleet against uplift for
       one station, which would misprice the cents-a-litre finding
       above by an order of magnitude. */
    if (perLitre < 0.40 || perLitre > 2.50) f.push({ sev: "stop",
      h: `Spend and uplift imply $${perLitre.toFixed(3)} a litre`,
      d: `That is outside anything Jet A-1 has traded at into-plane in the region. The two figures are probably not describing the same scope — a network spend against one station's uplift, or litres entered where US gallons were meant.` });
  } else if (spend > 0) {
    f.push({ sev: "note", h: "No volume entered, so the spend cannot be sense-checked",
      d: `Annual uplift converts this result into cents a litre and is the only cross-check on the spend figure. Without it the saving is a percentage of a number nothing here can verify.` });
  }

  if (!f.length) f.push({ sev: "ok", h: `On benchmark at ${prem.toFixed(1)}% over Platts`,
    d: `Nothing to recover by renegotiating the differential${uplift > 0 ? `, at an effective $${(spend / uplift).toFixed(3)} a litre` : ""}. The remaining exposure is price risk rather than contract terms — a hedging policy, not a tender.` });

  mountPrintSummary({
    title: `${fmt(spend)} annual fuel spend at ${prem.toFixed(1)}% over Platts`,
    verdict: high > 0
      ? `${fmt(low)} – ${fmt(high)} a year recoverable by closing the premium to the ${bench.toFixed(1)}% benchmark`
      : `Contract is at or below the ${bench.toFixed(1)}% market benchmark — no differential to recover`,
    findings: f,
    basis: `Saving = annual spend × (contract premium − benchmark) ÷ (100 + contract premium), since the premium is already inside the spend. The range applies a 50–100% capture factor: not all of the gap is recoverable in one negotiation. Indicative only — actual terms depend on volume, supply location, credit and market conditions.`
  });
}

["spend","premium","benchmark","uplift"].forEach(id =>
  document.getElementById(id).addEventListener("input", () => { recalc(); summarise(); }));
recalc(); summarise();
wireToolEnquiryForm("fuel-enquiry", "Fuel Contract Optimizer Lite",
  { downloadUrl: "../assets/docs/JK_Fuel_Tender_Spec.pdf", downloadName: "Fuel Tender Specification" });

/* A result you cannot take away is a result that exists only for as long
   as the tab does. mountPrintHead stamps the mark, the tool name and the
   date onto the printed copy, because a board pack gets circulated
   detached from the page that produced it. */
mountPrintHead("Fuel Contract Optimizer Lite",
  "Indicative annual saving from closing the into-plane premium gap");
document.getElementById("print").addEventListener("click", () => window.print());
