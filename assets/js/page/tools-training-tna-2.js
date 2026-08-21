/* Extracted verbatim from tools/training-tna.html so the site can carry a real
   script-src. Behaviour is unchanged: the tag sits where the inline
   block sat, with no defer or async, so execution order is identical.
   Edit here, not in the HTML. */

(function () {
  /* ---------------------------------------------------------------
     COST BASIS

     These figures were sterling, and unsourced. Restating them in
     dollars alone would have relabelled a guess, so they are rebuilt on
     published prices and each rate now shows the arithmetic that got
     there.

     The anchor is IATA's own published course pricing, which is quoted
     in USD, is aviation-specific, and carries a developing-nation rate
     that is the relevant one for East Africa: classroom courses run USD
     1,700–3,900 at the standard rate and from USD 1,180 for
     participants from developing nations.

     One proficiency level is taken to be one training intervention —
     a course, a module, a simulator slot. That is a modelling
     assumption, not an observed price, and it is the reason these stay
     labelled indicative. What has changed is that a reader can now see
     what the number was built from and disagree with it.

     THE TYPE RATING IS THE EXCEPTION, and finding it was the point of
     doing this properly. At the old flat rate, taking a pilot from
     awareness to expert on "aircraft systems mastery (type-rating)"
     came to four levels at £600 — around £2,400 for a type rating that
     is published at USD 18,000–48,000 for a narrowbody. Not a currency
     problem: an order-of-magnitude one, which converting to dollars
     would have carried over intact. Competencies may now override the
     group rate, and that one does.

     Engineer type-training was checked against the same suspicion and
     did NOT need an override: published B1/B2 type courses spread over
     four levels land close to the group rate already.
     --------------------------------------------------------------- */
  const COST_BASIS = {
    currency: "USD",
    asOf: "August 2026",
    sources: [
      { label: "IATA — published training course pricing (USD)",
        url: "https://www.iata.org/en/training/courses/pricing/" },
      { label: "Published narrowbody type-rating and recurrent training pricing, 2026",
        url: "https://rotatepilot.com/blog/how-much-does-type-rating-cost-2026" }
    ]
  };

  // Competency model: name + best-practice target. costPerPoint = USD per
  // person to raise one proficiency level, per the basis above.
  const GROUPS = [
    { name: "Flight Crew (Pilots & Flight Engineers)",
      note: "Operations, safety, and technical competencies specific to line flying and crew resource management.",
      costPerPoint: 2400,
      costBasis: "Mid-point of IATA's published classroom band (USD 1,700–3,900). Flight-crew " +
                 "competencies here are largely non-type-specific — procedures, threat and error " +
                 "management, CRM, decision-making — and map to a classroom or CBT module plus a " +
                 "simulator slot. The type rating is priced separately below.",
      items: [
        ["SOP compliance & procedural discipline", 5],
        ["Advanced threat & error management (TEM)", 5],
        ["Aircraft systems mastery (type-rating)", 5, {
          cost: 7500,
          basis: "A narrowbody type rating is published at USD 18,000–48,000. Taking a pilot from " +
                 "awareness to expert is four levels, so the mid-point spreads to roughly USD 7,500 " +
                 "a level. At the group rate this competency read about USD 2,400 for the whole " +
                 "rating, which is the single largest error the old model carried."
        }],
        ["Navigation & flight planning", 4],
        ["Crew resource management (CRM)", 4],
        ["Emergency procedures & decision-making", 5],
        ["Weather interpretation & avoidance", 4],
        ["Fuel management & optimization", 4],
        ["Communication & technical English (ICAO Level 4+)", 4] ] },
    { name: "Cabin Crew",
      note: "Safety, customer service, and emergency-response competencies for in-flight operations.",
      costPerPoint: 1200,
      costBasis: "IATA's developing-nation floor (from USD 1,180). Cabin safety and service courses " +
                 "sit at the bottom of the published band and are widely delivered regionally.",
      items: [
        ["Emergency & safety procedures", 5],
        ["First aid & medical response", 4],
        ["Customer service & hospitality", 4],
        ["Conflict & passenger de-escalation", 4],
        ["Cultural awareness & communication", 3],
        ["PRM (Person with Reduced Mobility) assistance", 3],
        ["Dangerous goods awareness", 3],
        ["Revenue protection & fraud detection", 3] ] },
    { name: "Engineers & Maintenance",
      note: "Technical, regulatory, and quality-assurance competencies for aircraft maintenance and airworthiness.",
      costPerPoint: 2800,
      costBasis: "Upper half of IATA's published classroom band. Technical and airworthiness courses " +
                 "run longer than commercial ones. Checked against published B1/B2 type-training " +
                 "pricing spread over four levels, which lands in the same range — so unlike the " +
                 "flight-crew type rating, this needs no separate figure.",
      items: [
        ["AME licensing & compliance (KCAA/EASA)", 5],
        ["Aircraft systems & troubleshooting (type-specific)", 5],
        ["Maintenance planning & scheduling", 4],
        ["Non-destructive testing (NDT) & inspection", 4],
        ["Defect management & task card execution", 4],
        ["Line maintenance & turnaround procedures", 4],
        ["Quality assurance & audit", 3],
        ["Tool control & asset management", 3],
        ["Documentation & technical English", 3],
        ["Safety culture & incident reporting", 4] ] },
    { name: "Ground Operations & Support",
      note: "Operational, safety, and customer-service competencies for ramp, cargo, dispatch, and ground services.",
      costPerPoint: 900,
      costBasis: "Below IATA's classroom floor. Ramp, load-control and dangerous-goods awareness " +
                 "courses are short-duration and routinely delivered by local providers and in-house " +
                 "instructors rather than bought in.",
      items: [
        ["Aircraft handling & safety (ramp)", 4],
        ["Ground-service equipment operation", 4],
        ["Weight & balance / loading procedures", 4],
        ["Cargo & dangerous goods handling", 4],
        ["Turnaround & dispatch procedures", 4],
        ["Flight planning & load control", 3],
        ["Customer service & passenger handling", 3],
        ["Fueling & defueling procedures", 3],
        ["Airside safety & regulations", 4],
        ["Communication & coordination (ground-to-flight)", 4],
        ["Environmental & waste management", 2],
        ["Security & restricted-area access", 3] ] }
  ];

  const STORE = "dn_tna_v1";
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const totalItems = GROUPS.reduce((a, g) => a + g.items.length, 0);
  let state = {};
  try { state = JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { state = {}; }

  function priority(gap, target) {
    if (gap <= 0) return { cls: "pri-none", label: "On target" };
    if (gap >= 2 && target >= 4) return { cls: "pri-high", label: "High" };
    if (gap >= 2 || target >= 4) return { cls: "pri-medium", label: "Medium" };
    return { cls: "pri-low", label: "Low" };
  }
  const money = n => "$" + Math.round(n).toLocaleString("en-US");

  /* The basis block is rendered from COST_BASIS and the group rates
     themselves. Writing it into the HTML by hand would let the stated
     figure and the applied figure drift, which is the whole failure
     this section exists to prevent. */
  function renderBasis() {
    const host = document.getElementById("basis-groups");
    if (!host) return;
    const overrides = [];
    GROUPS.forEach(g => g.items.forEach(it => {
      if (it[2] && it[2].cost) overrides.push({ name: it[0], cost: it[2].cost, basis: it[2].basis });
    }));
    host.innerHTML = GROUPS.map(g => `
      <div class="note" style="margin:.8rem 0">
        <b>${esc(g.name)} — ${money(g.costPerPoint)} per level.</b>
        ${esc(g.costBasis || "No basis recorded.")}
      </div>`).join("") + overrides.map(o => `
      <div class="note warn" style="margin:.8rem 0">
        <b>${esc(o.name)} — ${money(o.cost)} per level, not the group rate.</b>
        ${esc(o.basis)}
      </div>`).join("");

    document.getElementById("basis-sources").innerHTML = COST_BASIS.sources
      .map(x => `<a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.label)}</a>`)
      .join(" and ");
    document.getElementById("basis-asof").textContent = COST_BASIS.asOf;
  }

  // Build tables
  const host = document.getElementById("tna-groups");
  GROUPS.forEach((g, gi) => {
    const rows = g.items.map((it, ii) => {
      const key = gi + "-" + ii;
      const cur = state[key];
      const opts = [`<option value="">—</option>`].concat([1, 2, 3, 4, 5].map(n =>
        `<option value="${n}"${cur === n ? " selected" : ""}>${n}</option>`)).join("");
      // A competency may carry its own rate. The type rating does,
      // because the group figure understated it by an order of magnitude.
      const cpp = (it[2] && it[2].cost) || g.costPerPoint;
      const why = it[2] && it[2].basis ? ` title="${esc(it[2].basis)}"` : "";
      return `<tr data-key="${key}" data-target="${it[1]}" data-cpp="${cpp}">
        <td class="competency">${esc(it[0])}</td>
        <td class="target">${it[1]}</td>
        <td class="current"><select class="cur-select" aria-label="Current level for ${esc(it[0])}">${opts}</select></td>
        <td class="gap"><span class="gap-val">—</span></td>
        <td class="priority"><span class="pri-unset">—</span></td>
        <td class="cost"${why}>—</td>
      </tr>`;
    }).join("");
    host.insertAdjacentHTML("beforeend", `
      <section class="staff-group">
        <h3>${esc(g.name)}</h3>
        <p class="muted">${esc(g.note)}</p>
        <div class="table-scroll">
          <table class="tna-table">
            <thead><tr>
              <th>Competency</th><th class="target">Target</th><th class="current">Current</th>
              <th class="gap">Gap</th><th class="priority">Priority</th><th class="cost">Est. Cost</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>`);
  });

  function recompute() {
    let assessed = 0, gapSum = 0, highCount = 0, costSum = 0;
    const allGaps = [];
    const groupStats = {};
    GROUPS.forEach(g => {
      groupStats[g.name] = { gap: 0, high: 0, cost: 0, assessed: 0, total: g.items.length };
    });

    document.querySelectorAll("#tna-groups tr[data-key]").forEach(tr => {
      const sel = tr.querySelector(".cur-select");
      const target = parseInt(tr.dataset.target, 10);
      const cpp = parseInt(tr.dataset.cpp, 10);
      const gapCell = tr.querySelector(".gap-val");
      const priCell = tr.querySelector(".priority");
      const costCell = tr.querySelector(".cost");
      const groupName = tr.closest(".staff-group").querySelector("h3").textContent;

      if (sel.value === "") {
        gapCell.textContent = "—"; gapCell.className = "gap-val";
        priCell.innerHTML = `<span class="pri-unset">—</span>`;
        costCell.textContent = "—";
        return;
      }
      const cur = parseInt(sel.value, 10);
      const gap = Math.max(0, target - cur);
      assessed++; gapSum += gap;
      gapCell.textContent = gap; gapCell.className = "gap-val " + (gap > 0 ? "gap-pos" : "gap-zero");
      const pri = priority(gap, target);
      priCell.innerHTML = `<span class="pri-badge ${pri.cls}">${pri.label}</span>`;
      if (pri.cls === "pri-high") highCount++;
      const cost = gap * cpp;
      costSum += cost;
      costCell.textContent = gap > 0 ? money(cost) : "$0";

      if (groupStats[groupName]) {
        groupStats[groupName].gap += gap;
        groupStats[groupName].cost += cost;
        groupStats[groupName].assessed++;
        if (pri.cls === "pri-high") groupStats[groupName].high++;
      }
      if (gap > 0) allGaps.push({ competency: tr.querySelector(".competency").textContent, gap, cost, target, current: cur });
    });

    document.getElementById("stat-assessed").textContent = assessed + " / " + totalItems;
    document.getElementById("stat-avggap").textContent = assessed ? (gapSum / assessed).toFixed(1) : "—";
    document.getElementById("stat-high").textContent = highCount;
    document.getElementById("stat-cost").textContent = money(costSum);

    // Update progress
    const pct = Math.round((assessed / totalItems) * 100);
    document.getElementById("progress-bar").style.width = pct + "%";
    document.getElementById("progress-pct").textContent = pct;
    document.getElementById("progress-count").textContent = assessed + " / " + totalItems;

    // Update group summaries
    const groupHost = document.getElementById("group-summaries");
    groupHost.innerHTML = "";
    GROUPS.forEach(g => {
      const stats = groupStats[g.name];
      const html = `<div class="group-summary">
        <div class="name">${g.name}</div>
        <div class="stat"><span>Gap:</span><strong>${stats.gap}</strong></div>
        <div class="stat"><span>High Priority:</span><strong>${stats.high}</strong></div>
        <div class="stat"><span>Est. Cost:</span><strong>${money(stats.cost)}</strong></div>
        <div class="stat"><span>Assessed:</span><strong>${stats.assessed}/${stats.total}</strong></div>
      </div>`;
      groupHost.insertAdjacentHTML("beforeend", html);
    });

    // Update top gaps
    const topGaps = allGaps.sort((a, b) => b.gap - a.gap).slice(0, 5);
    if (topGaps.length > 0) {
      document.getElementById("top-gaps-section").style.display = "block";
      const listHost = document.getElementById("top-gaps-list");
      listHost.innerHTML = topGaps.map(g => `
        <div class="gap-item">
          <span class="comp">${g.competency}</span>
          <div class="metrics">
            <span style="color:var(--jk-red-dk);font-weight:600">Gap: ${g.gap}</span>
            <span style="color:var(--jk-muted)">${money(g.cost)}</span>
          </div>
        </div>`).join("");
    } else {
      document.getElementById("top-gaps-section").style.display = "none";
    }

    summarise({ assessed, gapSum, highCount, costSum, allGaps, groupStats, pct });
  }

  /* ---- answer-first opening page for the printed pack ----

     A training needs analysis is read by whoever signs the budget, and
     the figure they act on is the cost of closing the high-priority
     gaps — not the total, which includes every nice-to-have and is
     therefore the number that gets the whole plan deferred.

     Coverage leads when it is thin. A TNA built on a third of the
     establishment produces a confident cost for a third of the
     organisation, and it is the unassessed remainder that turns a
     budget request into a supplementary one three months later. */
  function summarise({ assessed, highCount, costSum, allGaps, groupStats, pct }) {
    if (!assessed) return mountPrintSummary(null);
    const f = [];

    if (pct < 60) f.push({ sev: "stop",
      h: `Only ${assessed} of ${totalItems} competencies assessed`,
      d: `The cost below covers ${pct}% of the establishment. An unassessed competency is not one without a gap — it is one nobody has looked at, and it is where the supplementary budget request comes from.` });

    if (highCount) {
      const highCost = allGaps
        .filter(g => priority(g.gap, g.target).cls === "pri-high")
        .reduce((a, g) => a + g.cost, 0);
      f.push({ sev: "stop", h: `${highCount} high-priority gap${highCount > 1 ? "s" : ""} costing ${money(highCost)} to close`,
        d: `A shortfall of two or more levels against a target of four or above — large and required at once. This is the figure to put to a budget holder: the ${money(costSum)} total includes every gap, and asking for the total is how the whole plan gets deferred.` });
    }

    /* A concentration in one group is usually a recruitment or
       supervision question as much as a training one, and the
       distinction changes who owns the remedy. */
    const worst = Object.entries(groupStats)
      .filter(([, s]) => s.assessed > 0)
      .sort((a, b) => (b[1].gap / b[1].assessed) - (a[1].gap / a[1].assessed))[0];
    if (worst && worst[1].gap > 0) f.push({ sev: "warn",
      h: `${worst[0]} carries the deepest shortfall`,
      d: `${worst[1].gap} levels across ${worst[1].assessed} assessed competencies, ${money(worst[1].cost)} to close. Training closes a gap; it does not stop one reopening, so a concentration this size is worth reading as a hiring and supervision question too.` });

    if (allGaps.length && !highCount) f.push({ sev: "warn",
      h: `${allGaps.length} gap${allGaps.length > 1 ? "s" : ""} open, none of them high priority`,
      d: `${money(costSum)} to close everything. Nothing here is urgent by the tool's own test, so this is a development plan to schedule across the training year rather than a remediation to fund now.` });

    if (!f.some(x => x.sev === "stop" || x.sev === "warn"))
      f.unshift({ sev: "ok", h: `No gaps across ${assessed} assessed competencies`,
        d: `Every assessed competency sits at or above its target level. The exposure now is drift — currency, turnover, and the next change of fleet or scope — rather than a present shortfall.` });

    mountPrintSummary({
      title: "Training needs analysis",
      verdict: `${assessed} of ${totalItems} competencies assessed (${pct}%), ` +
        `${allGaps.length} gap${allGaps.length === 1 ? "" : "s"} open` +
        (highCount ? `, ${highCount} high priority` : "") +
        `, ${money(costSum)} to close in full.`,
      findings: f,
      basis: `Gap = target level minus current level per competency, costed at the per-level figure stated against each line. Priority is high where the gap is two or more levels against a target of four or above. Levels and costs are the operator's own assessment — a planning instrument, not an audit of individual competence.`
    });
  }

  function save() {
    state = {};
    document.querySelectorAll("#tna-groups tr[data-key]").forEach(tr => {
      const v = tr.querySelector(".cur-select").value;
      if (v !== "") state[tr.dataset.key] = parseInt(v, 10);
    });
    reportingWrite(() => localStorage.setItem(STORE, JSON.stringify(state)));
  }

  host.addEventListener("change", e => {
    if (e.target.classList.contains("cur-select")) { save(); recompute(); }
  });

  // Keyboard shortcuts: press 1-5 to set proficiency while focused on a select
  document.addEventListener("keydown", e => {
    const isFocused = document.activeElement?.classList?.contains("cur-select");
    if (!isFocused) return;
    const num = parseInt(e.key, 10);
    if (num >= 1 && num <= 5) {
      e.preventDefault();
      document.activeElement.value = String(num);
      document.activeElement.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });

  document.getElementById("tna-print").addEventListener("click", () => window.print());
  document.getElementById("tna-reset").addEventListener("click", () => {
    if (!confirm("Clear all current-level entries?")) return;
    reportingWrite(() => localStorage.removeItem(STORE));
    document.querySelectorAll("#tna-groups .cur-select").forEach(s => s.value = "");
    recompute();
  });
  document.getElementById("tna-export").addEventListener("click", () => {
    const rows = [];
    document.querySelectorAll("#tna-groups tr[data-key]").forEach(tr => {
      const cur = tr.querySelector(".cur-select").value;
      rows.push({
        competency: tr.querySelector(".competency").textContent,
        target: parseInt(tr.dataset.target, 10),
        current: cur === "" ? null : parseInt(cur, 10),
        gap: cur === "" ? null : Math.max(0, parseInt(tr.dataset.target, 10) - parseInt(cur, 10))
      });
    });
    const exp = {
      tool: "Training Needs Analysis",
      assessed: document.getElementById("stat-assessed").textContent,
      avgGap: document.getElementById("stat-avggap").textContent,
      highPriority: document.getElementById("stat-high").textContent,
      estCost: document.getElementById("stat-cost").textContent,
      /* The currency and its basis travel with the file. A figure read
         out of an export six months from now, with no currency on it and
         no note of what it was built from, is how an indicative planning
         number becomes a quoted one. */
      currency: COST_BASIS.currency,
      costBasis: {
        asOf: COST_BASIS.asOf,
        assumption: "One proficiency level is treated as one training intervention. Indicative for planning; not a quotation.",
        sources: COST_BASIS.sources,
        ratesPerLevel: GROUPS.map(g => ({ group: g.name, perLevel: g.costPerPoint, basis: g.costBasis })),
        competencyOverrides: GROUPS.flatMap(g => g.items
          .filter(it => it[2] && it[2].cost)
          .map(it => ({ competency: it[0], perLevel: it[2].cost, basis: it[2].basis })))
      },
      competencies: rows,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exp, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "dn-training-tna-" + new Date().toISOString().split("T")[0] + ".json";
    a.click(); URL.revokeObjectURL(url);
  });

  renderBasis();
  recompute();
  wireToolEnquiryForm("tna-enquiry", "Training Needs Analysis");
})();
