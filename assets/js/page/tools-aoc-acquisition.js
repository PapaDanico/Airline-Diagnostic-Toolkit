/* AOC Acquisition Analyser.

   The platform could model building an operator and could not model
   buying one, which is the other half of the same decision and the one
   clients arrive already having half-made. "There's an AOC for sale"
   is a sentence that has started a great many bad transactions.

   The analysis rests on one fact the rest of the page keeps returning
   to: a certificate is not property. It is issued to a company against
   an organisation the Authority has accepted, so it cannot be lifted
   out and sold. A buyer either acquires the company — and every
   liability inside it — or acquires aeroplanes and no authority to fly
   them commercially.

   Everything here is arithmetic on figures the buyer supplies, against
   planning bands this site already publishes for the greenfield case.
   There is no market data behind it, no comparable-transaction set and
   no valuation opinion, and it does not pretend otherwise. */

(function () {
  applyPartner(); mountChrome();
  mountPrintHead("AOC Acquisition Analyser",
    "Buy-or-build, certificate premium, deal structure and the regulatory gates");

  const store = toolStore("acquisition");
  let state = store.load();
  const $ = id => document.getElementById(id);
  const SECTOR = JKV.sector("aoc");

  /* Lines that exist because a certificate has to be earned, as opposed
     to assets any operator needs however it came by its authority. This
     is the honest comparator for a certificate premium: spares and
     ground equipment would be bought either way, and an aircraft is an
     aircraft whoever holds the AOC. */
  const CERT_LINE = /certification|manual|training/i;

  const BOUNDS = {
    "a-price": [0, 1e12], "a-owned": [0, 1e12], "a-cash": [0, 1e12],
    "a-debt": [0, 1e12], "a-lease": [0, 1e12]
  };
  const num = id => {
    const b = BOUNDS[id] || [0, Infinity];
    return clampNum(parseFloat($(id).value), b[0], b[1]);
  };

  state.route = state.route || "share";
  state.tier = SECTOR.capital.tiers.some(t => t.id === state.tier) ? state.tier : "scheduled";
  state.remed = state.remed || {};
  state.flags = state.flags || {};
  /* The default is a structure that PASSES the ownership test, not one
     that fails it. A tool that opens on a red finding the visitor did
     not enter is crying wolf, and the wolf stops being heard by the
     time they type their own numbers. 49/51 is also the shape most of
     these deals end up in once counsel has looked at them, so the
     default doubles as the answer to the problem the panel poses. */
  const DEFAULT_HOLDERS = () => [
    { n: "Acquiring investor", p: 49, local: false },
    { n: "Existing local shareholders", p: 51, local: true }
  ];
  state.holders = state.holders || DEFAULT_HOLDERS();

  /* ---------- deal route ---------- */
  function renderRoutes() {
    $("route-seg").innerHTML = JKA.routes.map(r => `
      <button type="button" class="seg${r.id === state.route ? " is-on" : ""}" data-route="${r.id}"
              aria-pressed="${r.id === state.route}">${r.name}
        <small style="display:block;font-weight:400;opacity:.75">${r.keepsAoc ? "Certificate survives" : "Certificate is lost"}</small>
      </button>`).join("");
    $("route-seg").querySelectorAll("[data-route]").forEach(b =>
      b.addEventListener("click", () => { state.route = b.dataset.route; renderRoutes(); recompute(); }));

    const r = JKA.routes.find(x => x.id === state.route);
    /* An asset purchase is not a worse option to be weighed against a
       better one — for a buyer whose object is the certificate it is a
       different transaction that does not deliver the thing being
       bought. The panel says so before any number appears. */
    $("route-note").innerHTML = `<div class="note ${r.keepsAoc ? "" : "warn"}">
        <b>${escapeHtml(r.name)}${r.keepsAoc ? "" : " does not acquire the certificate"}</b>
        ${escapeHtml(r.d)} ${escapeHtml(r.cost)}
        ${r.c && r.c.length ? `<span style="display:block;margin-top:.5rem">${citeChips(r.c)}</span>` : ""}
      </div>`;
  }

  /* ---------- greenfield comparator ---------- */
  function renderTiers() {
    $("a-tier").innerHTML = SECTOR.capital.tiers
      .map(t => `<option value="${t.id}"${t.id === state.tier ? " selected" : ""}>${t.label} — ${t.sub}</option>`).join("");
    $("a-tier").addEventListener("change", () => { state.tier = $("a-tier").value; recompute(); });
  }
  const tier = () => SECTOR.capital.tiers.find(t => t.id === state.tier) || SECTOR.capital.tiers[0];
  const band = (pred) => tier().lines.filter(pred).reduce(
    (a, l) => ({ lo: a.lo + l.lo, hi: a.hi + l.hi }), { lo: 0, hi: 0 });

  /* ---------- remediation & transaction cost ---------- */
  const COST_LINES = () => JKA.remediation.concat(JKA.dealCosts);

  function seedRemed() {
    state.remed = {};
    COST_LINES().forEach(l => { state.remed[l.id] = Math.round((l.lo + l.hi) / 2); });
  }
  if (!Object.keys(state.remed).length) seedRemed();

  function renderRemediation() {
    $("remediation-lines").innerHTML = COST_LINES().map(l => {
      const v = state.remed[l.id] ?? Math.round((l.lo + l.hi) / 2);
      return `
      <div class="field" style="margin-bottom:16px">
        <label for="rm-${l.id}" style="display:flex;justify-content:space-between;gap:1rem;align-items:baseline">
          <span>${escapeHtml(l.k)}${l.cat === "wc" ? ' <span class="tag" style="vertical-align:middle">working capital</span>' : ""}</span>
        </label>
        <div class="cx-row">
          <input type="range" id="rm-${l.id}" min="${l.lo}" max="${l.hi}"
                 step="${Math.max(1000, Math.round((l.hi - l.lo) / 100))}"
                 value="${Math.max(l.lo, Math.min(l.hi, v))}" aria-describedby="rmh-${l.id}">
          <input type="number" id="rmn-${l.id}" class="cx-num" min="0" step="1000" value="${v}"
                 aria-label="${escapeHtml(l.k)} — exact amount in USD">
        </div>
        <p class="hint" id="rmh-${l.id}">
          <b data-rband="${l.id}">Planning band ${fmtMoney(l.lo)} – ${fmtMoney(l.hi)}</b> · ${escapeHtml(l.why)}
          ${l.c && l.c.length ? ` ${citeChips(l.c)}` : ""}
        </p>
      </div>`;
    }).join("");

    COST_LINES().forEach(l => {
      const sl = $("rm-" + l.id), nu = $("rmn-" + l.id);
      /* Slider bounded by the band, number field not. A buyer holding a
         real quotation should never be told their own figure is out of
         range — only that it sits outside what we would have planned. */
      const set = (v, fromSlider) => {
        v = Math.max(0, Math.min(1e12, v || 0));
        state.remed[l.id] = v;
        if (!fromSlider) sl.value = Math.max(l.lo, Math.min(l.hi, v));
        if (fromSlider) nu.value = v;
        const bEl = document.querySelector(`[data-rband="${l.id}"]`);
        if (bEl) {
          const out = v > l.hi || v < l.lo;
          bEl.textContent = out
            ? `Outside the planning band of ${fmtMoney(l.lo)} – ${fmtMoney(l.hi)}`
            : `Planning band ${fmtMoney(l.lo)} – ${fmtMoney(l.hi)}`;
          bEl.style.color = out ? "var(--jk-amber-text)" : "";
        }
        recompute();
      };
      sl.addEventListener("input", () => set(+sl.value, true));
      nu.addEventListener("input", () => set(+nu.value, false));
    });
  }

  /* ---------- diligence flags ---------- */
  function renderFlags() {
    $("redflags").innerHTML = JKA.redFlags.map(f => {
      const on = !!state.flags[f.id];
      return `<label class="chk${on ? " done" : ""}" data-f="${f.id}" style="border:1px solid var(--jk-line);margin-bottom:8px">
          <input type="checkbox" ${on ? "checked" : ""}>
          <span class="chk-t"><b>${escapeHtml(f.t)} ${f.sev === "stop"
            ? '<span class="tag gap" style="vertical-align:middle">walk away</span>'
            : '<span class="tag" style="vertical-align:middle">price it</span>'}</b>
            <small>${escapeHtml(f.d)}</small>
            ${f.c && f.c.length ? `<span style="display:block;margin-top:.15rem">${citeChips(f.c)}</span>` : ""}
          </span>
        </label>`;
    }).join("");
    $("redflags").querySelectorAll("input").forEach(inp => {
      inp.addEventListener("change", () => {
        const lab = inp.closest(".chk");
        if (inp.checked) state.flags[lab.dataset.f] = true; else delete state.flags[lab.dataset.f];
        lab.classList.toggle("done", inp.checked);
        recompute();
      });
    });
  }

  /* ---------- post-completion cap table ---------- */
  function renderHolders() {
    $("holders").innerHTML = state.holders.map((h, i) => `
      <div class="flex items-center gap wrapf" style="margin-bottom:8px">
        <input type="text" data-h="${i}" data-k="n" value="${escapeHtml(h.n)}" placeholder="Shareholder"
               aria-label="Shareholder ${i + 1} name" style="flex:1;min-width:170px;padding:.45rem .6rem;border:1px solid var(--jk-line-2);border-radius:6px;font-family:var(--sans);font-size:.86rem">
        <input type="number" data-h="${i}" data-k="p" value="${h.p}" min="0" max="100" step="0.5"
               aria-label="Shareholder ${i + 1} percentage" style="width:92px;padding:.45rem .6rem;border:1px solid var(--jk-line-2);border-radius:6px;font-family:var(--sans);font-size:.86rem;text-align:right">
        <label style="display:flex;align-items:center;gap:.35rem;font-size:.82rem">
          <input type="checkbox" data-h="${i}" data-k="local" ${h.local ? "checked" : ""}> National
        </label>
        <button type="button" class="linkbtn" data-del="${i}" aria-label="Remove shareholder ${i + 1}">Remove</button>
      </div>`).join("");

    $("holders").querySelectorAll("[data-h]").forEach(el => {
      el.addEventListener("input", () => {
        const h = state.holders[+el.dataset.h];
        if (!h) return;
        if (el.dataset.k === "local") h.local = el.checked;
        else if (el.dataset.k === "p") h.p = clampNum(parseFloat(el.value), 0, 100);
        else h.n = el.value;
        recompute();
      });
      if (el.type === "checkbox") el.addEventListener("change", () => {
        const h = state.holders[+el.dataset.h];
        if (h) { h.local = el.checked; recompute(); }
      });
    });
    $("holders").querySelectorAll("[data-del]").forEach(b =>
      b.addEventListener("click", () => {
        state.holders.splice(+b.dataset.del, 1);
        renderHolders(); recompute();
      }));
  }

  $("add-holder").addEventListener("click", () => {
    state.holders.push({ n: "", p: 0, local: false });
    renderHolders(); recompute();
  });

  /* ---------- gates ---------- */
  function renderGates(months) {
    $("gate-list").innerHTML = JKA.gates.map(g => `
      <div style="padding:.55rem 0;border-bottom:1px solid var(--jk-line)">
        <div class="flex between items-center gap">
          <b style="font-family:var(--sans);font-size:.9rem">${escapeHtml(g.k)}
            ${g.req ? '<span class="tag kcaa" style="vertical-align:middle">required</span>' : ""}</b>
          <span class="tnum muted" style="font-size:.82rem;white-space:nowrap">${
            g.lo === g.hi ? (g.lo < 1 ? "14 days" : `${g.lo} mo`) : `${g.lo}–${g.hi} mo`}</span>
        </div>
        <div class="muted" style="font-size:.82rem;margin-top:.2rem">${escapeHtml(g.d)}
          ${g.c && g.c.length ? ` ${citeChips(g.c)}` : ""}</div>
      </div>`).join("") +
      `<p class="muted" style="font-size:.84rem;margin:.8rem 0 0">Longest gate governs: about
        <b class="tnum">${months.lo}–${months.hi} months</b> from signing to operating under your own control.</p>`;
  }

  /* ---------- the model ---------- */
  function recompute() {
    const r = JKA.routes.find(x => x.id === state.route);
    const price = num("a-price"), owned = num("a-owned"), cash = num("a-cash");
    const debt = num("a-debt"), lease = num("a-lease");

    const remedTotal = COST_LINES().reduce((a, l) => a + (state.remed[l.id] || 0), 0);
    $("remed-total").textContent = fmtMoney(remedTotal);

    const allIn       = price + remedTotal;
    const netTangible = owned + cash - debt - lease;
    const premium     = price - netTangible;

    const gf     = band(() => true);
    const certGf = band(l => CERT_LINE.test(l.k));
    const gfMid  = (gf.lo + gf.hi) / 2;

    /* Gates run concurrently, so the longest governs. Summing them
       would triple-count three notifications that are filed in the
       same fortnight. */
    const months = JKA.gates.reduce((a, g) => ({
      lo: Math.max(a.lo, g.lo), hi: Math.max(a.hi, g.hi)
    }), { lo: 0, hi: 0 });
    /* Compared against the FAST end of the greenfield band, so the time
       saved is the conservative figure rather than the flattering one. */
    const saved = Math.max(0, SECTOR.leadMonths[0] - months.hi);
    renderGates(months);

    const stops = JKA.redFlags.filter(f => state.flags[f.id] && f.sev === "stop");
    const warns = JKA.redFlags.filter(f => state.flags[f.id] && f.sev === "warn");

    /* ---- premium build-up ---- */
    $("premium-table").innerHTML = [
      ["Owned aircraft, spares and equipment", fmtMoney(owned)],
      ["Cash and receivables", fmtMoney(cash)],
      ["Less debt assumed", "(" + fmtMoney(debt) + ")"],
      ["Less lease liability", "(" + fmtMoney(lease) + ")"],
      ["Net tangible acquired", fmtMoney(netTangible)],
      ["Equity purchase price", fmtMoney(price)],
      ["Premium for the certificate", fmtMoney(premium)]
    ].map(([k, v], i) => {
      const strong = i >= 4;
      return `<span${strong ? ' style="font-weight:700"' : ""}>${k}</span>` +
             `<span class="tnum" style="text-align:right${strong ? ";font-weight:700" : ""}">${v}</span>`;
    }).join("");

    $("premium-note").innerHTML = !r.keepsAoc
      ? `No certificate is acquired on this structure, so there is no certificate premium to assess. The figures above are a fleet and working-capital purchase, and the operating authority is not among them.`
      : premium <= 0
      ? `The price sits at or below net tangible assets, so the certificate is coming free with the balance sheet. That is either a bargain or a warning — ask what the seller knows about the finding register that you do not.`
      : premium > certGf.hi
        ? `You are paying <strong>${fmtMoney(premium)}</strong> above net tangible assets for the certificate. Earning one from scratch — programme, manuals and initial training — costs <strong>${fmtMoney(certGf.lo)} – ${fmtMoney(certGf.hi)}</strong> for this class of operation. The premium exceeds the top of that range, so it buys time and an operating history, not a certificate.`
        : `The <strong>${fmtMoney(premium)}</strong> premium sits inside the <strong>${fmtMoney(certGf.lo)} – ${fmtMoney(certGf.hi)}</strong> it costs to earn a certificate for this class of operation, before counting the ${SECTOR.leadMonths[0]}–${SECTOR.leadMonths[1]} months it takes.`;

    /* ---- KPIs ---- */
    /* An asset purchase acquires no certificate, so it saves no
       certification time and carries no certificate premium. Printing
       either against it would dress a fleet purchase up as the deal the
       buyer thinks they are doing. */
    $("deal-kpis").innerHTML = [
      ["All-in cost", fmtMoney(allIn), allIn > gf.hi ? "is-red" : allIn > gfMid ? "is-amber" : "is-green"],
      ["Greenfield equivalent", `${fmtMoney(gf.lo)}–${fmtMoney(gf.hi)}`, ""],
      ["Certificate premium", r.keepsAoc ? fmtMoney(premium) : "n/a", r.keepsAoc && premium > certGf.hi ? "is-amber" : ""],
      ["Months saved", r.keepsAoc ? (saved ? `${saved}+` : "None") : "None",
        !r.keepsAoc ? "is-red" : saved >= 6 ? "is-green" : saved ? "is-amber" : "is-red"]
    ].map(([l, v, c]) => `<div class="kpi ${c}"><div class="kv tnum">${v}</div><div class="kl">${l}</div></div>`).join("");

    /* ---- ownership test ---- */
    const parties = lookThrough({ op: state.holders });
    const entries = Object.entries(parties).map(([n, v]) => ({ n, ...v, total: v.direct + v.indirect }));
    const grand = entries.reduce((a, e) => a + e.total, 0);
    const localPct = entries.filter(e => e.local).reduce((a, e) => a + e.total, 0);

    $("control-note").innerHTML = Math.abs(grand - 100) > 1
      ? `<div class="note warn"><b>The cap table totals ${grand.toFixed(1)}%</b>Holdings have to sum to 100 before the ownership test means anything.</div>`
      : localPct < 50
        ? `<div class="note warn"><b>National effective interest falls to ${localPct.toFixed(1)}% after completion</b>An air service licence commonly requires substantial ownership and effective control by nationals. A share purchase that dilutes below the threshold puts the licence at risk on the day it completes — and the licence, not the AOC, is what permits the commercial service. ${citeChips(["airsvc"])}</div>`
        : `<div class="note ok"><b>National effective interest ${localPct.toFixed(1)}% after completion</b>Above a simple majority on the economics. Effective control is measured on more than shareholding — voting rights, board composition, veto rights and who appoints the accountable manager all count. ${citeChips(["airsvc"])}</div>`;

    /* ---- verdict ----
       Ordered by what actually decides it. Structure first: a deal that
       does not acquire the certificate cannot be evaluated on price,
       and putting a cost comparison above that would invite exactly the
       reasoning the tool exists to prevent. */
    let v;
    if (!r.keepsAoc) {
      v = { head: "No certificate", band: "This structure does not acquire the AOC",
        qual: `An asset purchase leaves the certificate with the company you are not buying. You would hold ${fmtMoney(owned)} of aircraft and equipment and no authority to operate them commercially — a greenfield applicant with a fleet already on the ramp. Restructure as a share purchase or price this as a fleet acquisition, not an AOC acquisition.`,
        cls: "is-red" };
    } else if (stops.length) {
      v = { head: `${stops.length} walk-away finding${stops.length > 1 ? "s" : ""}`,
        band: "Renegotiate or withdraw",
        qual: `${stops.map(f => f.t).join("; ")}. These are not price adjustments. Each one can leave the certificate suspended, lapsed or repossessed out from under the deal, and none of them is cured by paying less.`,
        cls: "is-red" };
    } else if (Math.abs(grand - 100) <= 1 && localPct < 50) {
      /* Ranked above every price comparison deliberately. A deal that
         breaks the ownership test does not become acceptable by being
         cheap, and the licence — not the AOC — is what permits the
         commercial service the buyer is paying for. */
      v = { head: "Licence at risk", band: `National interest falls to ${localPct.toFixed(1)}% on completion`,
        qual: `The certificate survives a share purchase; the air service licence may not. Substantial ownership and effective control by nationals is commonly required, and this cap table breaches it on the day it closes. Restructure the equity, or the buy-or-build comparison below is about an operation that cannot fly commercially.`,
        cls: "is-red" };
    } else if (allIn <= gf.lo) {
      v = { head: "Buy", band: "Cheaper than certifying, and years faster",
        qual: `All-in ${fmtMoney(allIn)} against a greenfield range of ${fmtMoney(gf.lo)}–${fmtMoney(gf.hi)}, and operating ${saved}+ months sooner. On these figures the acquisition wins on both axes${warns.length ? `, with ${warns.length} finding${warns.length > 1 ? "s" : ""} still to price into the warranties` : ""}.`,
        cls: "is-green" };
    } else if (allIn <= gf.hi) {
      v = { head: "Buy, on the time", band: "Inside the greenfield range",
        qual: `All-in ${fmtMoney(allIn)} sits within the ${fmtMoney(gf.lo)}–${fmtMoney(gf.hi)} it would cost to certify this operation from scratch, and arrives ${saved}+ months earlier. The case rests on the time, so it holds only if the ${saved} months are worth something specific — a contract, a season, a slot.`,
        cls: "is-amber" };
    } else {
      const perMonth = saved > 0 ? (allIn - gfMid) / saved : null;
      v = { head: "Build, unless the time is worth it",
        band: "Costs more than certifying from scratch",
        qual: `All-in ${fmtMoney(allIn)} against a greenfield mid-point of ${fmtMoney(gfMid)}. ` +
          (perMonth
            ? `The excess buys ${saved} months, at <strong>${fmtMoney(perMonth)} a month</strong>. That is the number to defend — not the purchase price.`
            : `And it saves no time, because the gates with the Authority run about as long as the difference. There is nothing being bought here that certification would not deliver.`),
        cls: "is-red" };
    }
    $("verdict-head").textContent = v.head;
    $("verdict-band").textContent = v.band;
    $("verdict-band").style.color = v.cls === "is-green" ? "#5cd6a0" : v.cls === "is-amber" ? "#f0c14b" : "#ff8a80";
    $("verdict-head").style.color = $("verdict-band").style.color;
    $("verdict-qual").innerHTML = v.qual;

    summarise({ r, price, allIn, remedTotal, netTangible, premium, gf, certGf, gfMid,
                months, saved, stops, warns, localPct, grand, lease, owned });
    store.save(state);
  }

  /* ---- answer-first opening page for the printed pack ----

     Structure leads whatever the numbers say. A pack that opens with a
     favourable price comparison on a deal that does not acquire the
     certificate has buried the only finding that matters under the one
     the reader wanted to see.

     Below that, the two findings that most often survive a diligence
     process and reach completion anyway: an ownership test the deal
     itself breaks, and a premium paid for a certificate that exceeds
     what earning one costs. Both are invisible in a financial model,
     because neither is a line in it. */
  function summarise(a) {
    const f = [];

    if (!a.r.keepsAoc) f.push({ sev: "stop", h: "This structure does not acquire the certificate",
      d: `An AOC is issued to a company against an accepted organisation and cannot be conveyed by an asset sale. The transaction as drawn buys ${fmtMoney(a.owned)} of aircraft and equipment and leaves the operating authority with the vendor company. Restructure as a share purchase, or price it as a fleet deal.` });

    a.stops.forEach(s => f.push({ sev: "stop", h: s.t, d: s.d }));

    if (Math.abs(a.grand - 100) > 1) f.push({ sev: "warn",
      h: `The post-completion cap table totals ${a.grand.toFixed(1)}%`,
      d: `The ownership test cannot be read off a chain that does not close. Fix the holdings before relying on the figure below.` });
    else if (a.localPct < 50) f.push({ sev: "stop",
      h: `National effective interest falls to ${a.localPct.toFixed(1)}% on completion`,
      d: `An air service licence commonly requires substantial ownership and effective control by nationals. The AOC gets the attention in deal planning and the licence is what actually permits the commercial service — this fails on the day it closes, not at the next renewal.` });

    if (a.r.keepsAoc && a.premium > a.certGf.hi) f.push({ sev: "warn",
      h: `Certificate premium of ${fmtMoney(a.premium)} exceeds what earning one costs`,
      d: `Programme, manuals and initial training for this class of operation run ${fmtMoney(a.certGf.lo)}–${fmtMoney(a.certGf.hi)}. Above that, the premium is buying elapsed time and an operating history rather than a certificate, and it should be defended on those terms.` });

    if (a.r.keepsAoc && a.allIn > a.gf.hi) f.push({ sev: "warn",
      h: `All-in cost of ${fmtMoney(a.allIn)} is above the greenfield range`,
      d: `Certifying this operation from scratch costs ${fmtMoney(a.gf.lo)}–${fmtMoney(a.gf.hi)}. ` +
         (a.saved > 0
           ? `The acquisition arrives ${a.saved} months earlier, so the excess prices out at ${fmtMoney((a.allIn - a.gfMid) / a.saved)} a month of time.`
           : `And the gates with the Authority consume the time it would have saved, so the excess buys nothing.`) });

    if (a.warns.length) f.push({ sev: "warn",
      h: `${a.warns.length} diligence finding${a.warns.length > 1 ? "s" : ""} to price into the warranties`,
      d: `${a.warns.slice(0, 3).map(w => w.t).join("; ")}${a.warns.length > 3 ? `; and ${a.warns.length - 3} more` : ""}. Each is quantifiable and belongs in an indemnity or an escrow rather than in the price, because the amount is not known at signing.` });

    if (a.lease > 0) f.push({ sev: "note", h: "The leased fleet is already on the balance sheet",
      d: `A reported lease liability of ${fmtMoney(a.lease)} capitalises the leased aircraft under IFRS 16. Applying a rent multiple on top of it — the pre-IFRS-16 convention still in wide use — counts the same fleet twice and overstates enterprise value by roughly that amount again.` });

    if (!f.some(x => x.sev === "stop" || x.sev === "warn"))
      f.unshift({ sev: "ok", h: `All-in ${fmtMoney(a.allIn)}, inside the greenfield range`,
        d: `Nothing in diligence blocks the deal, the structure preserves the certificate, and the ownership test holds at ${a.localPct.toFixed(1)}%. The remaining work is warranty cover for what diligence could not see.` });

    mountPrintSummary({
      title: `AOC acquisition — ${fmtMoney(a.price)} equity price, ${a.r.name.toLowerCase()}`,
      verdict: !a.r.keepsAoc
        ? `The structure as drawn does not acquire the operating certificate`
        : `All-in ${fmtMoney(a.allIn)} against a greenfield range of ${fmtMoney(a.gf.lo)}–${fmtMoney(a.gf.hi)}, arriving about ${a.saved} months sooner, with a certificate premium of ${fmtMoney(a.premium)} over net tangible assets.`,
      findings: f,
      basis: `Buy-or-build compares all-in acquisition cost against this site's published greenfield capital bands for a ${tier().label.toLowerCase()} operation, and against the ${SECTOR.leadMonths[0]}–${SECTOR.leadMonths[1]} month certification lead. Time saved is measured against the fast end of that lead, not the slow end. Regulatory gates run concurrently, so the longest governs. Bands are JK planning figures, not quotations, and this is not a valuation: no comparable-transaction data sits behind any figure here.`
    });
  }

  /* ---------- actions ---------- */
  $("print").addEventListener("click", () => window.print());
  $("reset").addEventListener("click", () => {
    if (!confirm("Clear this acquisition analysis? This cannot be undone.")) return;
    state = { route: "share", tier: "scheduled", flags: {}, holders: DEFAULT_HOLDERS() };
    seedRemed();
    ["a-price", "a-owned", "a-cash", "a-debt", "a-lease"].forEach(id => { $(id).value = $(id).defaultValue; });
    renderRoutes(); renderTiers(); renderRemediation(); renderFlags(); renderHolders(); recompute();
  });
  $("reset-remed").addEventListener("click", () => { seedRemed(); renderRemediation(); recompute(); });

  ["a-price", "a-owned", "a-cash", "a-debt", "a-lease"].forEach(id =>
    $(id).addEventListener("input", recompute));

  wireToolEnquiryForm("acq-enquiry", "AOC Acquisition Analyser");

  /* ---------- boot ---------- */
  renderRoutes(); renderTiers(); renderRemediation(); renderFlags(); renderHolders(); recompute();
})();
