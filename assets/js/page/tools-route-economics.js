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
  /* The longest scheduled sector flown is around 15,000 km, so 18,000
     clears every real route with room to spare. */
  stage:  { max: 18000,  msg: (v) => `${Math.round(v).toLocaleString("en-US")} km is longer than the longest scheduled sector flown, which is around 15,000 km. Check the units — a mile is about 1.6 kilometres.` },
  seats:  { max: 900,    msg: (v) => `${v} seats is more than the largest certified passenger configuration in service.` },
  /* Anchored to the figure this site already publishes rather than to an
     unnamed "industry range": the CASK calculator states a JK
     competitive target of 9 US¢/ASK and cites IATA's Cost Disadvantage
     of African Airlines (2025) for African carriers running close to
     double the rest of the world. Six times the target is far outside
     anything that context supports; a sixth of it is below it. */
  cask:   { max: 60,     msg: (v) => `${v.toFixed(1)} US¢/ASK is more than six times the 9 US¢ target the CASK calculator benchmarks against. A figure entered in USD rather than cents reads a hundred times high.` },
  caskLo: { min: 1.5,    msg: (v) => `${v.toFixed(2)} US¢/ASK is a sixth of the 9 US¢ benchmark and below what any operator achieves. A figure entered in dollars where cents were meant reads a hundred times low.` },
  fare:   { max: 20000,  msg: (v) => `${usd(v)} is an implausible average one-way fare. Check whether this is a fare or the sector's total revenue.` }
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
  const fleet = renderFleet({ stage, seats, caskC, revPerPax, cargo, lfPct });
  summarise({ stage, seats, caskC, fare, cargo, lfPct, tripCost, totalRev, revPerPax,
              contrib, margin, raskC, blf, beFare, ask, cautions, fleet });
}

/* ---- answer-first opening page for the printed pack ----

   Ordered the way the findings kill the route: a sector that cannot
   break even at any load factor is not a margin problem, and a negative
   contribution is not a tolerance problem. Below those sit the two
   findings an operator most often gets wrong on their own — a break-even
   sitting just under the expected load factor, which reads as a pass
   until one soft month, and a fleet choice made on unit cost when unit
   cost is not what pays for the sector. */
function summarise(r) {
  const f = [];
  const cannot = r.blf === null || r.blf > 100;
  const headroom = r.blf === null ? null : r.lfPct - r.blf;

  if (cannot) f.push({ sev: "stop", h: "The sector cannot break even at this fare",
    d: `A full aircraft still leaves ${usd(r.tripCost - (r.seats * r.revPerPax + r.cargo))} uncovered at the entered fare. No load factor fixes this: the fare, the unit cost or the aircraft has to change.` });
  else if (r.contrib < 0) f.push({ sev: "stop", h: `Loses ${usd(-r.contrib)} a departure at ${r.lfPct.toFixed(0)}% load factor`,
    d: `Break-even is ${r.blf.toFixed(1)}%, ${Math.abs(headroom).toFixed(1)} points above the load factor expected — about ${Math.abs(Math.round(r.seats * headroom / 100))} seats a departure. Flown daily that is ${usd(Math.abs(r.contrib * 365))} a year of lost contribution.` });

  if (!cannot && r.contrib >= 0 && headroom !== null && headroom < 5)
    f.push({ sev: "warn", h: `Only ${headroom.toFixed(1)} points of load-factor headroom`,
      d: `Break-even at ${r.blf.toFixed(1)}% against ${r.lfPct.toFixed(0)}% expected leaves about ${Math.round(r.seats * headroom / 100)} seats between profit and loss. One soft month puts the sector under water.` });

  /* The divergence this tool exists to expose: the aircraft with the
     lowest unit cost is not the one that pays best on a thin sector. */
  if (r.fleet && r.fleet.divergent)
    f.push({ sev: "warn", h: "Lowest unit cost is not the best aircraft here",
      d: `${r.fleet.bestCask.name} is cheaper per ASK at ${r.fleet.bestCask.caskC.toFixed(2)}¢, but ${r.fleet.bestContrib.name} contributes ${usd(r.fleet.bestContrib.contrib - r.fleet.bestCask.contrib)} more a departure. CASK rewards the largest gauge you can fill; this sector does not fill it.` });

  if (!cannot && r.beFare !== null && r.beFare > r.fare)
    f.push({ sev: "warn", h: `Fare is ${usd(r.beFare - r.fare)} short of the break-even fare`,
      d: `At ${r.lfPct.toFixed(0)}% load factor the sector needs ${usd(r.beFare)} against the ${usd(r.fare)} entered — a ${((r.beFare - r.fare) / r.fare * 100).toFixed(0)}% increase, before any competitive response.` });

  if (r.cautions.length) f.push({ sev: "warn", h: "An input looks out of range",
    d: `${r.cautions[0]} The figures here are calculated exactly as entered.` });

  if (!f.length) f.push({ sev: "ok", h: `Contributes ${usd(r.contrib)} a departure`,
    d: `Break-even at ${r.blf.toFixed(1)}% against ${r.lfPct.toFixed(0)}% expected — ${headroom.toFixed(1)} points of headroom, about ${Math.round(r.seats * headroom / 100)} seats. Flown daily the sector returns ${usd(r.contrib * 365)} a year.` });

  mountPrintSummary({
    title: `${Math.round(r.stage).toLocaleString("en-US")} km sector, ${r.seats} seats`,
    verdict: cannot
      ? `Break-even load factor exceeds 100% — the sector does not cover its cost at any occupancy`
      : `${usd(r.contrib)} contribution a departure at ${r.lfPct.toFixed(0)}% load factor` +
        (r.margin === null ? "" : `, a ${r.margin.toFixed(1)}% margin`) +
        `, against a ${r.blf.toFixed(1)}% break-even`,
    findings: f,
    basis: `RASK ${cents(r.raskC)} against CASK ${cents(r.caskC)} per ASK on ${Math.round(r.ask).toLocaleString("en-US")} available seat-km. Single-sector arithmetic on the operator's own inputs — no demand forecast, no payload-range check and no schedule. Break-even bands are JK's reading, stated on the page, not a published standard.`
  });
}

/* ---- which aircraft on this sector ----

   The comparison operators actually make, and the one place a unit-cost
   metric misleads on its own. CASK rewards the biggest gauge that can be
   filled; trip cost rewards the smallest that can carry the traffic. On
   a thin route those point in opposite directions, and the site's own
   CASK calculator already says so in its turboprop note without giving
   anyone a way to test it.

   Same sector, same fare, same expected load factor — only seats and
   unit cost change. Nothing here needs OEM data: the operator supplies
   the two figures for each type they are actually choosing between. */
function renderFleet(base) {
  const panel = document.getElementById("re-fleet-panel");
  const rows = [];
  for (let i = 0; i < 3; i++) {
    const name = (document.getElementById(`ac${i}-name`).value || "").trim();
    let seats = val(`ac${i}-seats`);
    let caskC = val(`ac${i}-cask`);
    /* The first row is the aircraft already modelled above; blanks there
       mean "the one I just described", not "skip me". */
    if (i === 0) { seats = seats ?? base.seats; caskC = caskC ?? base.caskC; }
    if (!name || seats === null || caskC === null || seats < 1 || caskC <= 0) continue;

    const ask = seats * base.stage;
    const trip = (caskC / 100) * ask;
    const pax = seats * (base.lfPct / 100);
    const rev = pax * base.revPerPax + base.cargo;
    rows.push({
      name, seats, caskC, trip,
      contrib: rev - trip,
      blf: base.revPerPax > 0 ? ((trip - base.cargo) / (seats * base.revPerPax)) * 100 : null
    });
  }

  if (rows.length < 2) { panel.hidden = true; return null; }
  panel.hidden = false;

  const bestContrib = rows.reduce((a, b) => (b.contrib > a.contrib ? b : a));
  const bestCask    = rows.reduce((a, b) => (b.caskC < a.caskC ? b : a));
  const bestTrip    = rows.reduce((a, b) => (b.trip < a.trip ? b : a));

  document.getElementById("re-fleet-table").innerHTML =
    `<thead><tr>${["Type", "Seats", "US¢/ASK", "Trip cost", "Break-even LF", "Contribution"]
      .map((h, i) => `<th style="text-align:${i ? "right" : "left"};padding:.4rem .5rem;border-bottom:1px solid rgba(255,255,255,.18);font-size:var(--fs-xs);text-transform:uppercase;letter-spacing:.05em">${h}</th>`)
      .join("")}</tr></thead><tbody>` +
    rows.map((r) => {
      const win = r === bestContrib;
      return `<tr${win ? ' style="font-weight:700"' : ""}>` +
        `<td style="padding:.4rem .5rem;border-bottom:1px solid rgba(255,255,255,.08)">${escapeHtml(r.name)}${win ? " ←" : ""}</td>` +
        [r.seats, r.caskC.toFixed(2), usd(r.trip),
         r.blf === null ? "—" : r.blf.toFixed(1) + "%", usd(r.contrib)]
          .map((v) => `<td style="text-align:right;padding:.4rem .5rem;border-bottom:1px solid rgba(255,255,255,.08)">${v}</td>`)
          .join("") + `</tr>`;
    }).join("") + `</tbody>`;

  /* "Contributes most" is the wrong sentence when every option is under
     water — the honest one is that the route does not work and this is
     the cheapest way to be wrong about it. */
  const allLose = bestContrib.contrib < 0;
  const parts = [allLose
    ? `At ${base.lfPct.toFixed(0)}% load factor <strong>every option here loses money on this sector</strong>. <strong>${escapeHtml(bestContrib.name)}</strong> loses least, at ${usd(Math.abs(bestContrib.contrib))} a departure — a reason to change the fare, the cost or the route, not a reason to pick an aircraft.`
    : `On this sector at ${base.lfPct.toFixed(0)}% load factor, <strong>${escapeHtml(bestContrib.name)}</strong> contributes most — ${usd(bestContrib.contrib)} a departure.`];

  /* The divergence is the finding. When the lowest unit cost is not the
     better answer, say why in the same breath, because CASK alone is the
     number most operators would have compared. */
  if (bestCask !== bestContrib) {
    parts.push(`<strong>${escapeHtml(bestCask.name)}</strong> has the lower unit cost at ${bestCask.caskC.toFixed(2)}¢ against ${bestContrib.caskC.toFixed(2)}¢, and is still the worse choice here: its ${bestCask.seats} seats cost ${usd(bestCask.trip)} to fly and there is not enough traffic at this load factor to fill the extra gauge. Unit cost rewards the biggest aircraft you can fill; this sector is not filling it.`);
  } else if (bestTrip !== bestContrib) {
    parts.push(`<strong>${escapeHtml(bestTrip.name)}</strong> is cheaper per departure at ${usd(bestTrip.trip)}, but carries fewer passengers than this fare and load factor can support.`);
  } else {
    parts.push(`It wins on unit cost and trip cost together, so the choice is not close on economics — capability, range and fleet commonality decide the rest.`);
  }
  document.getElementById("re-fleet-verdict").innerHTML = parts.join(" ");

  /* Handed back so the executive summary can carry the divergence
     finding rather than recomputing the comparison from scratch. */
  return { bestContrib, bestCask, bestTrip, allLose, divergent: bestCask !== bestContrib };
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
  mountPrintSummary(null);
}

/* Bands on the break-even load factor.

   These are JK's reading, not a published standard, and the tool says so
   rather than presenting them as neutral fact. Every other figure on
   this site traces to IATA, KCAA or a stated source; the one place that
   was not true was here, on a tool that hands an operator a word like
   "comfortable" about their own route.

   The site's existing idiom for a house judgement is the CASK
   calculator's "JK competitive target", which is labelled as JK's and
   left editable. Same treatment: the cut-offs are named on the page,
   attributed, and the reader can disagree with them and still keep the
   arithmetic, which is the part that is not a matter of opinion.

   The 100% line is the exception. It is arithmetic — above it the sector
   cannot pay for itself however full it flies — so it is stated flatly
   while the rest are hedged. */
const BLF_BANDS = { comfortable: 65, workable: 80, thin: 90 };

function bandFor(blf) {
  if (blf > 100)                return { txt: "Cannot break even at this fare", col: "#ff8a80" };
  if (blf > BLF_BANDS.thin)     return { txt: "Break-even only at near-capacity", col: "#ff8a80" };
  if (blf > BLF_BANDS.workable) return { txt: "Thin — little tolerance for a soft month", col: "#f0c14b" };
  if (blf > BLF_BANDS.comfortable) return { txt: "Workable", col: "#5cd6a0" };
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

const FIELDS = ["re-stage", "re-seats", "re-cask", "re-fare", "re-anc", "re-cargo", "re-lf"];
for (let i = 0; i < 3; i++) FIELDS.push(`ac${i}-name`, `ac${i}-seats`, `ac${i}-cask`);
FIELDS.forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("input", calculate);
});
calculate();
wireToolEnquiryForm("route-enquiry", "Route Economics & Break-even Calculator");

/* A result you cannot take away is a result that exists only for as long
   as the tab does. mountPrintHead stamps the mark, the tool name and the
   date onto the printed copy, because a board pack gets circulated
   detached from the page that produced it. */
mountPrintHead("Route Economics & Break-even Calculator",
  "Single-sector contribution, break-even load factor and fare floor");
document.getElementById("print").addEventListener("click", () => window.print());
