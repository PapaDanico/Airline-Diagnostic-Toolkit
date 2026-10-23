/* Fleet & Crew Planner: aircraft-years, pilots by type pool, control-room people.

   A fleet plan usually ends at the aircraft list. The headcount that
   follows it is then either a ceiling inherited from somewhere or a
   multiple of the number of tails, and neither survives a roster. Crew
   do not scale with tails. A pilot is rated on one type, so each type is
   its own pool and rounds up on its own: three tails of one type need
   fewer pilots per tail than three tails of three types, and a single-tail
   type has nobody to cover it when its crew are on leave.

   The arithmetic is deliberately plain so it can be argued with:

     pilots in a pool = tails × seats × 365 × coverage ÷ available duty days

   rounded up per pool. Available duty days are what is left of the year
   after rest, leave, training and sickness. Every one of those inputs is
   an operating-concept choice the plan should state, and none is a
   regulatory limit — the duty and fatigue rules that apply govern, and
   replace these. The page says so beside the inputs rather than in a
   footnote. */

(function () {
  applyPartner(); mountChrome();

  const store = toolStore("fleetcrew");
  let state = store.load();
  const $ = id => document.getElementById(id);
  state.rows = Array.isArray(state.rows) ? state.rows : [];
  let seq = 1 + Math.max(0, ...state.rows.map(r => r.id || 0));
  const e = escapeHtml;
  const PARAMS = ["fc-year", "fc-cover", "fc-rest", "fc-leave", "fc-train", "fc-other", "fc-pos", "fc-hrs", "fc-contr", "fc-lost", "fc-rev", "fc-y1", "fc-y2", "fc-y3"];
  const BOUNDS = { "fc-year": [2000, 2100], "fc-cover": [1, 100], "fc-rest": [0, 200], "fc-leave": [0, 100], "fc-train": [0, 100], "fc-other": [0, 100], "fc-pos": [0, 20], "fc-hrs": [1, 168], "fc-contr": [1, 80], "fc-lost": [0, 60], "fc-rev": [0, 1e6], "fc-y1": [1, 1e6], "fc-y2": [1, 1e6], "fc-y3": [1, 1e6] };
  const num = id => clampNum(parseFloat($(id).value), BOUNDS[id][0], BOUNDS[id][1]);
  const CLASSES = ["Jet", "Turboprop", "Rotary"];

  PARAMS.concat(["fc-plan"]).forEach(id => {
    if (state[id] !== undefined) $(id).value = state[id];
    $(id).addEventListener("input", run);
  });

  /* ---------- rows: built once, never rebuilt while typing ---------- */
  const ROW_STYLE = "display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;align-items:end;padding:.7rem 0;border-bottom:1px solid var(--jk-line)";
  const field = (label, el) => {
    const wrap = document.createElement("div"); wrap.className = "field"; wrap.style.margin = "0";
    const l = document.createElement("label"); l.textContent = label; l.style.fontSize = "var(--fs-xs)";
    el.setAttribute("aria-label", label); el.id = "ft" + (seq++); l.htmlFor = el.id; wrap.append(l, el); return wrap;
  };
  const input = (type, val, ph, min, max, on) => {
    const i = document.createElement("input"); i.type = type; i.value = val === undefined || val === null ? "" : val; if (ph) i.placeholder = ph;
    if (min !== undefined) i.min = min; if (max !== undefined) i.max = max;
    i.addEventListener("input", () => on(i.value)); return i;
  };
  function addRow(r) {
    const row = document.createElement("div"); row.style.cssText = ROW_STYLE;
    const cls = document.createElement("select"); CLASSES.forEach(c => { const o = document.createElement("option"); o.value = c; o.textContent = c; cls.appendChild(o); });
    cls.value = CLASSES.includes(r.cls) ? r.cls : "Jet"; cls.addEventListener("change", () => { r.cls = cls.value; run(); });
    const rm = document.createElement("button"); rm.type = "button"; rm.className = "btn btn-ghost btn-sm"; rm.textContent = "Remove"; rm.setAttribute("aria-label", "Remove this aircraft");
    rm.addEventListener("click", () => { state.rows = state.rows.filter(x => x !== r); row.remove(); if (!state.rows.length) emptyNote(); run(); });
    row.append(
      field("Type name", input("text", r.type, "e.g. Mid-range jet", undefined, undefined, v => { r.type = v; run(); })),
      field("Class", cls),
      field("Pilots on the flight deck", input("number", r.seats, "", 1, 3, v => { r.seats = v; run(); })),
      field("Enters service (year)", input("number", r.year, "", 2000, 2100, v => { r.year = v; run(); })),
      field("Quarter (1–4)", input("number", r.q, "", 1, 4, v => { r.q = v; run(); })),
      rm);
    $("tails").appendChild(row);
  }
  function emptyNote() { $("tails").innerHTML = `<p class="muted" style="font-size:var(--fs-sm)">No aircraft yet. Add one, or load the worked example.</p>`; }
  function buildRows() { $("tails").innerHTML = ""; state.rows.forEach(addRow); if (!state.rows.length) emptyNote(); }

  /* ---------- the model ---------- */
  const key = s => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  function model() {
    const y0 = Math.round(num("fc-year")), years = [0, 1, 2, 3, 4].map(i => y0 + i);
    const tails = state.rows.map(r => ({ type: String(r.type || "").trim() || "Untyped", cls: r.cls || "Jet", seats: Math.max(1, Math.round(parseFloat(r.seats) || 2)), y: Math.round(parseFloat(r.year)), q: Math.min(4, Math.max(1, Math.round(parseFloat(r.q) || 1))) })).filter(t => isFinite(t.y));
    const avail = 365 - num("fc-rest") - num("fc-leave") - num("fc-train") - num("fc-other");
    const cov = num("fc-cover") / 100;
    const pools = new Map();
    tails.forEach(t => { const k = key(t.type); if (!pools.has(k)) pools.set(k, { name: t.type, cls: t.cls, seats: t.seats, tails: [] }); pools.get(k).tails.push(t); });
    const poolRows = [...pools.values()].map(p => ({ p, need: years.map(y => { const n = p.tails.filter(t => t.y <= y).length; return n && avail > 0 ? Math.ceil(n * p.seats * 365 * cov / avail - 1e-9) : 0; }) }));
    const acYears = years.map(y => tails.reduce((a, t) => a + (t.y < y ? 1 : t.y === y ? (5 - t.q) / 4 : 0), 0));
    const inSvc = years.map(y => tails.filter(t => t.y <= y).length);
    const required = years.map((y, i) => poolRows.reduce((a, r) => a + r.need[i], 0));
    const plan = String($("fc-plan").value || "").split(/[,;\s]+/).map(parseFloat).filter(isFinite);
    const prod = num("fc-contr") * (1 - num("fc-lost") / 100);
    const occPer = prod > 0 ? num("fc-hrs") / prod : null;
    const occ = occPer === null ? null : occPer * num("fc-pos");
    const singles = [...pools.values()].filter(p => p.tails.length === 1);
    const rev = parseFloat($("fc-rev").value);
    const finalTails = inSvc[4];
    const hours = isFinite(rev) && rev > 0 && finalTails ? ["fc-y1", "fc-y2", "fc-y3"].map(id => ({ yield: num(id), hrs: Math.round(rev * 1e6 / finalTails / num(id)) })) : null;
    return { y0, years, tails, avail, cov, pools: [...pools.values()], poolRows, acYears, inSvc, required, plan, occPer, occ, singles, hours, rev: isFinite(rev) ? rev : null };
  }

  function run() {
    PARAMS.forEach(id => { state[id] = $(id).value; }); state["fc-plan"] = $("fc-plan").value;
    const M = model();
    if (!M.tails.length) { blank(); store.save(state); return; }
    render(M); summarise(M); store.save(state);
  }
  function blank() {
    $("fc-head").textContent = "—"; $("fc-band").textContent = "Add the aircraft.";
    $("fc-qual").textContent = "Aircraft-years and crew pools appear once at least one aircraft has a type and an entry year.";
    ["fc-kpis", "fc-years", "fc-findings"].forEach(id => { $(id).innerHTML = ""; });
    mountPrintSummary(null);
  }

  function render(M) {
    const last = M.years.length - 1;
    $("fc-head").textContent = M.required[last] + " pilots";
    $("fc-band").textContent = `Required in ${M.years[last]} across ${M.pools.length} type pool${M.pools.length === 1 ? "" : "s"}`;
    $("fc-qual").textContent = `${M.tails.length} aircraft on ${M.pools.length} type${M.pools.length === 1 ? "" : "s"} (${(M.tails.length / M.pools.length).toFixed(1)} tails per type), ${M.avail} available duty days per pilot at ${(M.cov * 100).toFixed(0)}% coverage.`;
    $("fc-kpis").innerHTML = [
      ["Aircraft", M.tails.length, ""],
      ["Types", M.pools.length, M.singles.length ? "is-amber" : ""],
      ["Single-tail types", M.singles.length, M.singles.length ? "is-amber" : "is-green"],
      ["OCC people", M.occ === null ? "—" : M.occ.toFixed(1), ""]
    ].map(([l, v, c]) => `<div class="kpi ${c}"><div class="kv tnum">${v}</div><div class="kl">${l}</div></div>`).join("");

    let h = `<table class="gap-table"><thead><tr><th>${""}</th>${M.years.map(y => `<th>${y}</th>`).join("")}</tr></thead><tbody>`;
    h += `<tr><td>Aircraft in service</td>${M.inSvc.map(v => `<td class="tnum">${v}</td>`).join("")}</tr>`;
    h += `<tr><td>Aircraft-years</td>${M.acYears.map(v => `<td class="tnum">${v.toFixed(2)}</td>`).join("")}</tr>`;
    M.poolRows.forEach(r => { h += `<tr><td>Pilots: ${e(r.p.name)}</td>${r.need.map(v => `<td class="tnum">${v}</td>`).join("")}</tr>`; });
    h += `<tr class="tot"><td><b>Pilots required</b></td>${M.required.map(v => `<td class="tnum"><b>${v}</b></td>`).join("")}</tr>`;
    if (M.plan.length) {
      h += `<tr><td>Pilots the plan provides</td>${M.years.map((y, i) => `<td class="tnum">${M.plan[i] === undefined ? "—" : M.plan[i]}</td>`).join("")}</tr>`;
      h += `<tr><td>Margin</td>${M.years.map((y, i) => { const d = M.plan[i] === undefined ? null : M.plan[i] - M.required[i]; return `<td class="tnum"><b style="color:${d === null ? "inherit" : d < 0 ? "var(--jk-red-dk)" : d === 0 ? "var(--jk-amber-text)" : "var(--jk-green)"}">${d === null ? "—" : (d > 0 ? "+" : "") + d}</b></td>`; }).join("")}</tr>`;
    }
    $("fc-years").innerHTML = h + `</tbody></table>` +
      (M.hours ? `<p class="qual" style="margin:.8rem 0 0">Block hours per tail in ${M.years[last]} to earn ${M.rev.toLocaleString("en-GB")} m of flying revenue: ${M.hours.map(x => `${x.hrs.toLocaleString("en-GB")} h at $${x.yield.toLocaleString("en-GB")}/h`).join(" · ")}.</p>` : "");

    const items = [];
    const short = M.plan.length ? M.years.map((y, i) => ({ y, d: M.plan[i] === undefined ? null : M.plan[i] - M.required[i] })).filter(x => x.d !== null && x.d < 0) : [];
    if (short.length) items.push(["Stop", `The plan's pilot numbers are short in ${short.map(x => x.y).join(", ")}`, `Short by ${short.map(x => `${-x.d} in ${x.y}`).join(", ")} against what the type pools require at ${(M.cov * 100).toFixed(0)}% coverage.`]);
    else if (M.plan.length && M.years.some((y, i) => M.plan[i] !== undefined && M.plan[i] === M.required[i])) items.push(["Warning", "The plan's pilot numbers equal the requirement with no margin", "Nothing is left for management, instructor or check pilots, or for the loss of one."]);
    if (M.singles.length) items.push(["Warning", `${M.singles.length} single-tail type${M.singles.length > 1 ? "s" : ""}: ${M.singles.map(p => p.name).join(", ")}`, "Each carries the full cost of a type — manuals, training, spares, approvals — and has no cross-cover for crew or maintenance. Test lease, ACMI or a common type."]);
    if (M.occ !== null && num("fc-pos") > 0) items.push(["Note", `The control centre needs about ${M.occ.toFixed(1)} people`, `${num("fc-pos")} position${num("fc-pos") > 1 ? "s" : ""} for ${num("fc-hrs")} hours a week at ${M.occPer.toFixed(2)} people per position. If the plan allocates fewer to operations control, say whether it is outsourced or part-time.`]);
    items.push(["Note", `Commonality is ${(M.tails.length / M.pools.length).toFixed(1)} tails per type`, "Higher is cheaper to crew, maintain and certify. Every additional type is a pool, a manual set and an approval."]);
    $("fc-findings").innerHTML = items.map(([t, hh, d]) => `<div style="padding:.55rem 0;border-bottom:1px solid rgba(255,255,255,.12);font-size:var(--fs-sm)"><b style="color:var(--jk-amber);font-size:var(--fs-xs);text-transform:uppercase;letter-spacing:.08em">${t}</b><div><b>${e(hh)}</b></div><div>${e(d)}</div></div>`).join("");
    M._items = items;
  }

  function summarise(M) {
    const last = M.years.length - 1;
    const f = M._items.map(([t, h, d]) => ({ sev: t === "Stop" ? "stop" : t === "Warning" ? "warn" : "note", h, d }));
    mountPrintSummary({
      title: "Fleet and crew",
      verdict: `${M.tails.length} aircraft on ${M.pools.length} type${M.pools.length === 1 ? "" : "s"} need ${M.required[last]} pilots by ${M.years[last]}, sized by type pool at ${(M.cov * 100).toFixed(0)}% coverage.`,
      findings: f,
      basis: `Pilots in each pool = tails × seats × 365 × coverage ÷ ${M.avail} available duty days, rounded up per type; a tail is crewed in full from the year it enters service. Duty-day inputs are illustrative planning figures, not regulatory limits, and management, instructor and check pilots are excluded unless counted as seats. Aircraft-years assume a tail joins at the start of its entry quarter.`
    });
  }

  /* worked example: eight tails on five types, generic names */
  $("load-fleet").addEventListener("click", () => {
    if (state.rows.length && !confirm("Replace the aircraft you have entered with the worked example?")) return;
    const R = (type, cls, seats, year, q) => ({ id: seq++, type, cls, seats, year, q });
    state.rows = [R("Mid-range jet", "Jet", 2, 2027, 2), R("Turboprop", "Turboprop", 2, 2027, 2), R("Long-range jet", "Jet", 2, 2027, 3), R("Light helicopter", "Rotary", 1, 2027, 4),
      R("Mid-range jet", "Jet", 2, 2028, 1), R("Turboprop", "Turboprop", 2, 2028, 3), R("Twin helicopter", "Rotary", 2, 2029, 1), R("Mid-range jet", "Jet", 2, 2029, 3)];
    buildRows(); run();
  });
  $("add-tail").addEventListener("click", () => {
    if (!state.rows.length) $("tails").innerHTML = "";
    const r = { id: seq++, type: "", cls: "Jet", seats: 2, year: Math.round(num("fc-year")), q: 1 }; state.rows.push(r); addRow(r);
    const f = $("tails").lastElementChild.querySelector("input"); if (f) f.focus(); run();
  });
  $("print").addEventListener("click", () => window.print());
  $("reset").addEventListener("click", () => {
    if (!confirm("Clear the fleet and return the operating concept to its defaults?")) return;
    state = { rows: [] };
    const D = { "fc-year": 2027, "fc-cover": 80, "fc-rest": 104, "fc-leave": 28, "fc-train": 14, "fc-other": 8, "fc-pos": 2, "fc-hrs": 168, "fc-contr": 40, "fc-lost": 15, "fc-rev": "", "fc-y1": 2500, "fc-y2": 3500, "fc-y3": 5000 };
    PARAMS.forEach(id => { $(id).value = D[id]; }); $("fc-plan").value = ""; buildRows(); run();
  });
  wireToolEnquiryForm("fc-enquiry", "Fleet & Crew Planner");
  mountPrintHead("Fleet & Crew Planner", "Aircraft-years, pilots by type pool and control-room staffing");
  buildRows(); run();
})();
