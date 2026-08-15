/* Route economics: contribution, break-even load factor, break-even fare.

   The CASK calculator answers what a seat-kilometre costs. It stops
   there, which leaves the operator holding half an argument: a unit cost
   with nothing to compare it against. Every route decision turns on the
   other half — whether a given sector, at a given fare, fills enough
   seats to cover that cost.

   The metric set is the industry's, so the output can be taken into a
   room and argued with: break-even load factor, RASK against CASK,
   yield, contribution and margin.

   Everything here is arithmetic on figures the operator supplies. There
   is no licensed performance data behind it and it does not pretend
   otherwise — no payload-range, no demand forecast, no schedule. What it
   will not do is publish a confident number it cannot stand behind. */

applyPartner(); mountChrome();

const usd = (n) => (n < 0 ? "-" : "") + "$" + Math.abs(Math.round(n)).toLocaleString("en-US");
const cents = (n) => n.toFixed(2) + " US¢";
const val = (id) => {
  const v = parseFloat(document.getElementById(id).value);
  return isFinite(v) ? v : null;
};

/* Bounds that make a number suspicious rather than impossible. Each is
   wide enough that a real operator clears it and narrow enough that a
   units slip does not. They warn; only the refusals below stop the
   calculation. */
const SANE = {
  stage:  { max: 18000,  msg: (v) => `${Math.round(v).toLocaleString("en-US")} km is longer than any scheduled sector flown. Check the units — miles are about 1.6× kilometres.` },
  seats:  { max: 900,    msg: (v) => `${v} seats exceeds the largest certified passenger configuration in service.` },
  cask:   { max: 60,     msg: (v) => `${v.toFixed(1)} US¢/ASK is several times the industry range. A figure entered in USD rather than cents reads a hundred times high.` },
  caskLo: { min: 1.5,    msg: (v) => `${v.toFixed(2)} US¢/ASK is below any operator's unit cost. A figure entered in cents where dollars were meant reads a hundred times low.` },
  fare:   { max: 20000,  msg: (v) => `${usd(v)} is an implausible average one-way fare. Check whether this is a fare or a sector's total revenue.` }
};

function calculate() {
  const stage  = val("re-stage");
  const seats  = val("re-seats");
  const caskC  = val("re-cask");
  const fare   = val("re-fare");
  const anc    = val("re-anc") ?? 0;
  const cargo  = val("re-cargo") ?? 0;
  const lfPct  = val("re-lf");

  /* ---- refusals: without these the arithmetic has no meaning ---- */
  const errors = [];
  if (stage === null || stage <= 0) errors.push("Enter a sector length greater than zero.");
  if (seats === null || seats < 1) errors.push("There must be at least one seat.");
  if (caskC === null || caskC <= 0) errors.push("Enter a unit cost greater than zero — the CASK calculator will work it out if you do not have it.");
  if (fare === null || fare < 0) errors.push("A fare cannot be negative.");
  if (anc < 0) errors.push("Ancillary revenue cannot be negative.");
  if (cargo < 0) errors.push("Cargo revenue cannot be negative.");
  if (lfPct === null || lfPct <= 0 || lfPct > 100) errors.push("Expected load factor must be above 0 and no more than 100%.");

  const errSlot = document.getElementById("re-error");
  if (errors.length) {
    errSlot.innerHTML =
      `<div class="note warn" style="margin-top:1rem"><b>Cannot calculate yet</b>` +
      `<ul style="margin:.4rem 0 0 1.1rem;font-size:var(--fs-sm)">` +
      errors.map((e) => `<li>${e}</li>`).join("") + `</ul></div>`;
    blank();
    return;
  }
  errSlot.innerHTML = "";

  /* ---- cautions: odd but calculable, so say so and carry on ---- */
  const cautions = [];
  if (stage > SANE.stage.max) cautions.push(SANE.stage.msg(stage));
  if (seats > SANE.seats.max) cautions.push(SANE.seats.msg(seats));
  if (caskC > SANE.cask.max) cautions.push(SANE.cask.msg(caskC));
  if (caskC < SANE.caskLo.min) cautions.push(SANE.caskLo.msg(caskC));
  if (fare > SANE.fare.max) cautions.push(SANE.fare.msg(fare));

  /* ---- the model ---- */
  const ask       = seats * stage;                 // available seat-km, this sector
  const caskUsd   = caskC / 100;
  const tripCost  = caskUsd * ask;                 // USD to operate the sector
  const revPerPax = fare + anc;
  const pax       = seats * (lfPct / 100);
  const rpk       = pax * stage;
  const paxRev    = pax * revPerPax;
  const totalRev  = paxRev + cargo;
  const contrib   = totalRev - tripCost;
  const margin    = totalRev > 0 ? (contrib / totalRev) * 100 : null;
  const raskC     = (totalRev / ask) * 100;
  const yieldC    = rpk > 0 ? (paxRev / rpk) * 100 : null;

  /* Break-even load factor: the share of seats at which passenger
     revenue plus cargo exactly meets trip cost. Cargo is a credit
     against the cost before any seat is sold, which is why a freighter-
     heavy belly can carry a thin route. */
  const blf = revPerPax > 0 ? ((tripCost - cargo) / (seats * revPerPax)) * 100 : null;

  /* The fare that would break the sector even at the load factor the
     operator actually expects — the other way to ask the same question,
     and usually the more actionable one. */
  const beFare = pax > 0 ? (tripCost - cargo) / pax - anc : null;

  render({ stage, seats, caskC, fare, anc, cargo, lfPct, ask, tripCost, revPerPax,
           pax, paxRev, totalRev, contrib, margin, raskC, yieldC, blf, beFare, cautions });
}

function blank() {
  document.getElementById("re-blf").textContent = "—";
  document.getElementById("re-blf").style.color = "";
  document.getElementById("re-band").textContent = "Enter your figures.";
  document.getElementById("re-band").style.color = "";
  document.getElementById("re-qual").textContent =
    "The share of seats that must be sold before the sector covers its own cost.";
  document.getElementById("re-table").innerHTML = "";
  document.getElementById("re-contrib").textContent = "Enter your figures to see the sector result.";
  document.getElementById("re-levers").textContent =
    "Enter your figures to see the fare and load factor this sector needs.";
}

/* Bands on the break-even load factor. Above 100 the sector cannot pay
   for itself however full it flies, which is a different statement from
   "difficult" and is worded as one. */
function bandFor(blf) {
  if (blf > 100) return { txt: "Cannot break even at this fare", col: "#ff8a80" };
  if (blf > 90)  return { txt: "Break-even only at near-capacity", col: "#ff8a80" };
  if (blf > 80)  return { txt: "Thin — little tolerance for a soft month", col: "#f0c14b" };
  if (blf > 65)  return { txt: "Workable", col: "#5cd6a0" };
  return { txt: "Comfortable", col: "#5cd6a0" };
}

function render(r) {
  const blfEl = document.getElementById("re-blf");
  const band  = bandFor(r.blf);
  blfEl.textContent = r.blf.toFixed(1) + "%";
  blfEl.style.color = band.col;
  document.getElementById("re-band").textContent = band.txt;
  document.getElementById("re-band").style.color = band.col;

  const gap = r.lfPct - r.blf;
  document.getElementById("re-qual").innerHTML = r.blf > 100
    ? `Even a full aircraft leaves <strong>${usd(r.tripCost - (r.seats * r.revPerPax + r.cargo))}</strong> of the sector's cost uncovered. No load factor fixes this one — the fare, the cost or the aircraft has to change.`
    : (() => {
        const n = Math.abs(Math.round(r.seats * gap / 100));
        return `You expect <strong>${r.lfPct.toFixed(0)}%</strong>, which is <strong>${Math.abs(gap).toFixed(1)} points ${gap >= 0 ? "above" : "below"}</strong> break-even — about <strong>${n} seat${n === 1 ? "" : "s"}</strong> a departure.`;
      })();

  const rows = [
    ["Trip cost", usd(r.tripCost)],
    ["Passenger revenue", usd(r.paxRev)],
    ["Cargo &amp; mail", usd(r.cargo)],
    ["Total revenue", usd(r.totalRev)],
    ["RASK", cents(r.raskC) + " / ASK"],
    ["CASK", cents(r.caskC) + " / ASK"],
    ["Yield", r.yieldC === null ? "—" : cents(r.yieldC) + " / RPK"]
  ];
  document.getElementById("re-table").innerHTML = rows
    .map(([k, v]) => `<span>${k}</span><span style="text-align:right"><strong>${v}</strong></span>`)
    .join("");

  const sign = r.contrib >= 0 ? "contributes" : "loses";
  document.getElementById("re-contrib").innerHTML =
    `At ${r.lfPct.toFixed(0)}% the sector <strong>${sign} ${usd(Math.abs(r.contrib))}</strong> per departure` +
    (r.margin === null ? "" : ` — a margin of <strong>${r.margin.toFixed(1)}%</strong>`) +
    `. Over 365 daily rotations that is <strong>${usd(r.contrib * 365)}</strong> a year.` +
    (r.cautions.length
      ? `<span style="display:block;margin-top:.7rem;color:var(--jk-amber)"><strong>Check the inputs:</strong> ${r.cautions[0]} The figures above are calculated as entered.</span>`
      : "");

  /* Two levers, priced. Whichever is easier to move is the operator's
     call; the point is that both are quantified rather than argued. */
  const parts = [];
  if (r.beFare !== null && r.beFare > 0) {
    const delta = r.beFare - r.fare;
    parts.push(delta > 0
      ? `At ${r.lfPct.toFixed(0)}% load factor the fare would need to be <strong>${usd(r.beFare)}</strong> to break even — <strong>${usd(delta)} more</strong> than the ${usd(r.fare)} entered, a ${(delta / r.fare * 100).toFixed(0)}% increase.`
      : `The fare could fall to <strong>${usd(r.beFare)}</strong> before this sector stops covering its cost — <strong>${usd(-delta)}</strong> of room below the ${usd(r.fare)} entered.`);
  } else if (r.beFare !== null) {
    parts.push(`Cargo alone covers the sector at ${r.lfPct.toFixed(0)}% load factor: the break-even fare is below zero, so every passenger is contribution.`);
  }
  if (r.blf <= 100) {
    parts.push(`Holding the fare, the sector needs <strong>${Math.ceil(r.seats * r.blf / 100)} of ${r.seats} seats</strong> sold to break even.`);
  }
  const costRoom = (r.totalRev / r.ask) * 100;
  parts.push(`At ${r.lfPct.toFixed(0)}% and this fare, the sector supports a unit cost up to <strong>${cents(costRoom)}/ASK</strong> — your CASK is <strong>${cents(r.caskC)}</strong>.`);
  document.getElementById("re-levers").innerHTML = parts.join(" ");
}

/* ---- chain from the CASK calculator ----

   The one input an operator cannot produce from memory is their own unit
   cost, and the tool next door computes exactly that. If it has been
   used, its answer pre-fills this field and the hint says so — a
   pre-filled number with no provenance is worse than an empty one. */
(function inheritCask() {
  const hint = document.getElementById("re-cask-src");
  let saved = {};
  try { saved = toolStore("cask").load(); } catch { saved = {}; }
  const c = parseFloat(saved.caskCents);
  if (!isFinite(c) || c <= 0) return;
  document.getElementById("re-cask").value = c.toFixed(2);
  hint.innerHTML =
    `Carried over from your <a href="cask-calculator.html" data-keep-partner>CASK calculation</a>` +
    (saved.fleetType ? ` (${saved.fleetType})` : "") +
    ` — <strong>${c.toFixed(2)} US¢/ASK</strong>. Change it here to test a different sector; the calculator keeps its own.`;
})();

["re-stage", "re-seats", "re-cask", "re-fare", "re-anc", "re-cargo", "re-lf"].forEach((id) =>
  document.getElementById(id).addEventListener("input", calculate));
calculate();
wireToolEnquiryForm("route-enquiry", "Route Economics & Break-even Calculator");
