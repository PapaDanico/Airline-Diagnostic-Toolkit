/* Safety Assurance Map: hazards, barriers and where the assurance is evidenced.

   A hazard log that lists a hazard and a rating is a list. What makes a
   risk tolerable is the barriers between the threat and the top event and
   between the top event and the harm, and whether each one is really in
   place. So the tool asks for three things per hazard: a rating before
   controls, a rating after, and the barriers that account for the
   difference. It then checks the account:

     - a reduction with no barrier named under it,
     - a reduction that rests only on barriers that are planned, not in place,
     - a hazard with nothing on its recovery side (or its preventive side),
     - and any residual rating above the operator's own tolerable limit.

   Each barrier is tagged to the ICAO Annex 19 SMS element that manages or
   evidences it and to a functional area (IOSA section names, used as a
   neutral index), so the map can show which of the twelve elements the
   barriers in place actually evidence. That tag is a working convention,
   not a clause-by-clause compliance mapping, and the page says so.

   Risk is likelihood × severity on the common 5×5 scale. The cut-offs are
   inputs and are labelled as a convention: the operator's own SMS governs.
   Nothing here is verified; the tool organises judgements the user makes.

   The barrier rows are built once and never rewritten while typing, so a
   keystroke in a barrier description keeps focus and every character. */

(function () {
  applyPartner(); mountChrome();

  const store = toolStore("safetymap");
  let state = store.load();
  const $ = id => document.getElementById(id);
  state.rows = Array.isArray(state.rows) ? state.rows : [];
  let seq = 1 + Math.max(0, ...state.rows.map(r => r.id || 0));
  const e = escapeHtml;
  const PARAMS = ["sf-acc", "sf-tol"];
  const BOUNDS = { "sf-acc": [1, 24], "sf-tol": [2, 24] };
  const num = id => clampNum(parseFloat($(id).value), BOUNDS[id][0], BOUNDS[id][1]);

  /* ICAO Annex 19, Appendix 2 SMS framework: four components, twelve elements. */
  const ELEMENTS = [
    ["1.1", "Management commitment", "Safety policy and objectives"],
    ["1.2", "Safety accountability and responsibilities", "Safety policy and objectives"],
    ["1.3", "Appointment of key safety personnel", "Safety policy and objectives"],
    ["1.4", "Coordination of emergency response planning", "Safety policy and objectives"],
    ["1.5", "SMS documentation", "Safety policy and objectives"],
    ["2.1", "Hazard identification", "Safety risk management"],
    ["2.2", "Safety risk assessment and mitigation", "Safety risk management"],
    ["3.1", "Safety performance monitoring and measurement", "Safety assurance"],
    ["3.2", "The management of change", "Safety assurance"],
    ["3.3", "Continuous improvement of the SMS", "Safety assurance"],
    ["4.1", "Training and education", "Safety promotion"],
    ["4.2", "Safety communication", "Safety promotion"]
  ];
  /* IOSA section names, used as a neutral index of the functional area. */
  const AREAS = [
    ["ORG", "Organisation and management"], ["FLT", "Flight operations"], ["DSP", "Operational control and dispatch"],
    ["MNT", "Engineering and maintenance"], ["CAB", "Cabin operations"], ["GRH", "Ground handling"],
    ["CGO", "Cargo operations"], ["SEC", "Security"]
  ];
  const STATUS = ["In place", "Planned", "Not in place"];
  const LIK = ["1 Extremely improbable", "2 Improbable", "3 Remote", "4 Occasional", "5 Frequent"];
  const SEV = ["1 Negligible", "2 Minor", "3 Major", "4 Hazardous", "5 Catastrophic"];

  const LIB = [
    ["Runway excursion on landing", "Aircraft leaves the runway surface", "Unstabilised approach\nContaminated or short runway\nBrake or anti-skid failure", "Aircraft damage\nInjury or fatality"],
    ["Controlled flight into terrain", "Aircraft flies into terrain or an obstacle", "Loss of situational awareness\nNavigation or database error\nDeviation from procedure at night or in cloud", "Hull loss\nFatalities"],
    ["Fatigue-related error", "Crew performance degraded below a safe level", "Roster or duty extension\nPoor rest between duties\nCircadian disruption on night duty", "Incorrect decision or handling\nIncident or accident"],
    ["Maintenance error or missed task", "Aircraft released with a defect or an incorrect task", "Task card or tool control failure\nParts of uncertain origin\nTime pressure on turnaround", "In-flight malfunction\nAirworthiness finding"],
    ["Loss of control in flight", "Aircraft exceeds the normal flight envelope", "Stall or upset at low speed\nSevere turbulence or icing\nSpatial disorientation", "Loss of control\nStructural damage"],
    ["Ground collision or ramp event", "Aircraft or vehicle strikes an aircraft, person or object on the ground", "Poor marshalling or ramp congestion\nUnapproved vehicle movements\nPoor visibility or lighting", "Aircraft damage\nGround injury"],
    ["Fuel contamination or miscalculation", "Engine or fuel system affected by wrong or insufficient fuel", "Contaminated or wrong-grade uplift\nIncorrect fuel planning\nUnplanned diversion or delay", "Engine malfunction\nFuel exhaustion"],
    ["Bird or wildlife strike", "Aircraft strikes wildlife", "Wildlife activity at or near the airfield\nNo wildlife management at the operating base", "Engine or airframe damage\nRejected take-off or return"],
    ["Helicopter operation at an unprepared site", "Landing or take-off at a site with unknown hazards", "Wires and obstacles\nBrownout or whiteout\nPoor performance margins", "Rotor strike\nLoss of control"],
    ["Security event or unlawful interference", "Unauthorised access to an aircraft or a flight", "Weak access control at the base or FBO\nInsider threat", "Hijack or sabotage\nLoss of customer trust"],
    ["Change introduced without a risk assessment", "A change is made without its hazards being assessed", "New aircraft type or base\nNew route or customer\nNew supplier or change of a key post", "Unmanaged risk enters operations\nAuthority finding"]
  ];

  const lines = s => String(s || "").split(/\n+/).map(x => x.trim()).filter(Boolean);
  const bandOf = (score, acc, tol) => score <= acc ? "Low" : score <= tol ? "Medium" : "High";

  PARAMS.forEach(id => {
    if (state[id] !== undefined) $(id).value = state[id];
    $(id).addEventListener("input", run);
  });
  LIB.forEach((h, i) => { const o = document.createElement("option"); o.value = i; o.textContent = h[0]; $("sf-lib").appendChild(o); });

  /* ---------- rows: built once, never rebuilt while typing ---------- */
  const HZ_STYLE = "border:1px solid var(--jk-line-2);border-radius:var(--radius-sm);padding:1rem 1.1rem;margin:0 0 1rem;background:var(--jk-white)";
  const BAR_STYLE = "display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;align-items:end;padding:.6rem 0;border-top:1px solid var(--jk-line)";
  const field = (label, el, grow) => {
    const wrap = document.createElement("div"); wrap.className = "field"; wrap.style.margin = "0";
    if (grow) wrap.style.gridColumn = "1 / -1";
    const l = document.createElement("label"); l.textContent = label; l.style.fontSize = "var(--fs-xs)";
    el.setAttribute("aria-label", label); el.id = "sm" + (seq++); l.htmlFor = el.id; wrap.append(l, el); return wrap;
  };
  const text = (val, ph, on) => { const i = document.createElement("input"); i.type = "text"; i.value = val || ""; if (ph) i.placeholder = ph; i.addEventListener("input", () => on(i.value)); return i; };
  const area = (val, ph, on) => { const t = document.createElement("textarea"); t.rows = 3; t.value = val || ""; if (ph) t.placeholder = ph; t.addEventListener("input", () => on(t.value)); return t; };
  const select = (opts, val, on) => {
    const s = document.createElement("select");
    opts.forEach(([v, l]) => { const o = document.createElement("option"); o.value = v; o.textContent = l; s.appendChild(o); });
    s.value = val; s.addEventListener("change", () => on(s.value)); return s;
  };
  const scale = labels => labels.map((l, i) => [String(i + 1), l]);

  function addBarrier(h, b, host) {
    const row = document.createElement("div"); row.style.cssText = BAR_STYLE;
    const kindLabel = b.kind === "Recovery" ? "Recovery barrier (after the top event)" : "Preventive barrier (before the top event)";
    const rm = document.createElement("button"); rm.type = "button"; rm.className = "btn btn-ghost btn-sm"; rm.textContent = "Remove"; rm.setAttribute("aria-label", "Remove this barrier");
    rm.addEventListener("click", () => { h.bars = h.bars.filter(x => x !== b); row.remove(); run(); });
    row.append(
      field(kindLabel, text(b.text, "What the barrier is", v => { b.text = v; run(); }), true),
      field("SMS element it evidences", select([["", "Not tagged"], ...ELEMENTS.map(x => [x[0], x[0] + " " + x[1]])], b.el || "", v => { b.el = v; run(); })),
      field("Functional area", select([["", "Other"], ...AREAS.map(x => [x[0], x[0] + " " + x[1]])], b.area || "", v => { b.area = v; run(); })),
      field("Status", select(STATUS.map(x => [x, x]), STATUS.includes(b.status) ? b.status : "Planned", v => { b.status = v; run(); })),
      rm);
    host.appendChild(row);
  }

  function addHazard(h) {
    const card = document.createElement("div"); card.style.cssText = HZ_STYLE; card.className = "sf-haz";
    const grid = document.createElement("div"); grid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;align-items:end";
    const barHost = document.createElement("div");
    const rm = document.createElement("button"); rm.type = "button"; rm.className = "btn btn-ghost btn-sm"; rm.textContent = "Remove hazard"; rm.setAttribute("aria-label", "Remove this hazard");
    rm.addEventListener("click", () => { state.rows = state.rows.filter(x => x !== h); card.remove(); if (!state.rows.length) emptyNote(); run(); });
    const clamp5 = v => String(Math.min(5, Math.max(1, Math.round(+v) || 3)));
    grid.append(
      field("Hazard", text(h.name, "e.g. Runway excursion on landing", v => { h.name = v; run(); }), true),
      field("Top event (what goes wrong)", text(h.top, "e.g. Aircraft leaves the runway surface", v => { h.top = v; run(); }), true),
      field("Threats (one per line)", area(h.threats, "What could cause the top event", v => { h.threats = v; run(); })),
      field("Consequences (one per line)", area(h.conseq, "What the top event could lead to", v => { h.conseq = v; run(); })),
      field("Likelihood before controls", select(scale(LIK), clamp5(h.l0), v => { h.l0 = +v; run(); })),
      field("Severity before controls", select(scale(SEV), clamp5(h.s0), v => { h.s0 = +v; run(); })),
      field("Likelihood after controls", select(scale(LIK), clamp5(h.l1), v => { h.l1 = +v; run(); })),
      field("Severity after controls", select(scale(SEV), clamp5(h.s1), v => { h.s1 = +v; run(); })));
    const addP = document.createElement("button"); addP.type = "button"; addP.className = "btn btn-ghost btn-sm"; addP.textContent = "+ Preventive barrier";
    const addR = document.createElement("button"); addR.type = "button"; addR.className = "btn btn-ghost btn-sm"; addR.textContent = "+ Recovery barrier";
    const mk = kind => () => { const b = { id: seq++, kind, text: "", el: "", area: "", status: "Planned" }; h.bars.push(b); addBarrier(h, b, barHost); const f = barHost.lastElementChild.querySelector("input"); if (f) f.focus(); run(); };
    addP.addEventListener("click", mk("Preventive")); addR.addEventListener("click", mk("Recovery"));
    const actions = document.createElement("div"); actions.style.cssText = "display:flex;gap:.6rem;flex-wrap:wrap;margin-top:.8rem;align-items:center"; actions.append(addP, addR, rm);
    const cap = document.createElement("p"); cap.className = "muted"; cap.style.cssText = "font-size:var(--fs-xs);margin:1rem 0 .2rem;text-transform:uppercase;letter-spacing:.08em"; cap.textContent = "Barriers";
    card.append(grid, cap, barHost, actions);
    h.bars.forEach(b => addBarrier(h, b, barHost));
    $("hazards").appendChild(card);
  }
  function emptyNote() { $("hazards").innerHTML = `<p class="muted" style="font-size:var(--fs-sm)">No hazards yet. Add one from the library, add a blank one, or load the worked example.</p>`; }
  function buildRows() { $("hazards").innerHTML = ""; state.rows.forEach(addHazard); if (!state.rows.length) emptyNote(); }
  const newHazard = (name, top, threats, conseq) => ({ id: seq++, name: name || "", top: top || "", threats: threats || "", conseq: conseq || "", l0: 3, s0: 3, l1: 3, s1: 3, bars: [] });

  /* ---------- the model ---------- */
  function model() {
    const acc = num("sf-acc"), tol = Math.max(num("sf-tol"), acc);
    const hz = state.rows.map((h, i) => {
      const rate = (l, s) => Math.min(5, Math.max(1, Math.round(+l) || 3)) * Math.min(5, Math.max(1, Math.round(+s) || 3));
      const l0 = Math.min(5, Math.max(1, Math.round(+h.l0) || 3)), s0 = Math.min(5, Math.max(1, Math.round(+h.s0) || 3));
      const l1 = Math.min(5, Math.max(1, Math.round(+h.l1) || 3)), s1 = Math.min(5, Math.max(1, Math.round(+h.s1) || 3));
      const bars = (h.bars || []).filter(b => String(b.text || "").trim());
      return { n: i + 1, h, name: String(h.name || "").trim() || "Unnamed hazard", top: String(h.top || "").trim(), l0, s0, l1, s1, init: rate(l0, s0), res: rate(l1, s1), bars,
        prev: bars.filter(b => b.kind !== "Recovery"), rec: bars.filter(b => b.kind === "Recovery"), inPlace: bars.filter(b => b.status === "In place") };
    });
    hz.forEach(x => { x.band = bandOf(x.res, acc, tol); x.bandInit = bandOf(x.init, acc, tol); });
    const bars = hz.flatMap(x => x.bars);
    const evEl = new Set(bars.filter(b => b.status === "In place" && b.el).map(b => b.el));
    const evArea = new Set(bars.filter(b => b.status === "In place" && b.area).map(b => b.area));
    const count = (key, id, status) => bars.filter(b => b[key] === id && (status === "In place" ? b.status === "In place" : b.status !== "In place")).length;
    return { acc, tol, hz, bars, inPlace: bars.filter(b => b.status === "In place").length, evEl, evArea, count,
      nHigh: hz.filter(x => x.band === "High").length, nMed: hz.filter(x => x.band === "Medium").length, nLow: hz.filter(x => x.band === "Low").length,
      untagged: bars.filter(b => !b.el).length };
  }

  function findings(M) {
    const out = [];
    M.hz.forEach(x => {
      const tag = `H${x.n} ${x.name}`;
      if (x.band === "High") out.push(["Stop", `${tag} is above tolerance after controls`, `Residual risk ${x.res} against a tolerable limit of ${M.tol}. It is intolerable until it is reduced, and a reduction needs barriers that are in place, not planned.`]);
      if (!x.bars.length) out.push(["Warning", x.res < x.init ? `${tag} claims a reduction from ${x.init} to ${x.res} with no barrier named` : `${tag} has no barrier named`, "The rating after controls has nothing under it. Name the barriers on both sides of the top event, or the residual rating should equal the initial one."]);
      else {
        if (x.res < x.init && !x.inPlace.length) out.push(["Warning", `${tag}: the reduction from ${x.init} to ${x.res} rests on barriers that are not yet in place`, "Every barrier is Planned or Not in place. Credit a reduction only for what exists today."]);
        if (!x.rec.length) out.push(["Warning", `${tag} has no recovery barrier`, "Nothing is named between the top event and the harm. If prevention fails, what limits the consequence?"]);
        if (!x.prev.length) out.push(["Warning", `${tag} has no preventive barrier`, "Nothing is named between the threats and the top event."]);
      }
      if (x.res > x.init) out.push(["Note", `${tag}: the rating after controls is higher than before`, `${x.res} after against ${x.init} before. Check the two ratings were not swapped.`]);
    });
    const miss = ELEMENTS.filter(el => !M.evEl.has(el[0])).map(el => el[0]);
    if (M.bars.length) out.push(["Note", `${M.evEl.size} of 12 SMS elements are evidenced by a barrier in place`, miss.length ? `No barrier in place is tagged to ${miss.join(", ")}. A barrier can be real and still untagged: check the tags before reading this as a gap.` : "Every element has at least one barrier in place tagged to it."]);
    if (M.untagged) out.push(["Note", `${M.untagged} barrier${M.untagged > 1 ? "s are" : " is"} not tagged to an SMS element`, "Untagged barriers cannot be counted toward any element."]);
    const rank = { Stop: 0, Warning: 1, Note: 2 };
    return out.sort((a, b) => rank[a[0]] - rank[b[0]]);
  }

  function run() {
    PARAMS.forEach(id => { state[id] = $(id).value; });
    const M = model();
    if (!M.hz.length) { blank(); store.save(state); return; }
    render(M); store.save(state);
  }
  function blank() {
    $("sf-head").textContent = "—"; $("sf-band").textContent = "Add a hazard.";
    $("sf-qual").textContent = "The matrix, findings and SMS map appear once at least one hazard is entered.";
    ["sf-kpis", "sf-matrix", "sf-findings", "sf-cover", "sf-bowtie"].forEach(id => { $(id).innerHTML = ""; });
    panels(true);
    mountPrintSummary(null);
  }

  /* Until a hazard exists the four detail panels have nothing to show, and an
     empty dark box is worse than none. They are shown and hidden, never rebuilt. */
  function panels(empty) { ["sf-matrix", "sf-findings", "sf-cover", "sf-bowtie"].forEach(id => $(id).closest(".result-panel").classList.toggle("is-empty", empty)); }

  const BANDCLS = { Low: "rm-low", Medium: "rm-med", High: "rm-high" };
  function matrix(M) {
    let h = `<table class="rm" aria-label="Risk matrix, likelihood by severity"><thead><tr><th scope="col"></th>${SEV.map(s => `<th scope="col">${e(s)}</th>`).join("")}</tr></thead><tbody>`;
    for (let l = 5; l >= 1; l--) {
      h += `<tr><th scope="row">${e(LIK[l - 1])}</th>`;
      for (let s = 1; s <= 5; s++) {
        const band = bandOf(l * s, M.acc, M.tol);
        const res = M.hz.filter(x => x.l1 === l && x.s1 === s), ini = M.hz.filter(x => x.l0 === l && x.s0 === s && !(x.l1 === l && x.s1 === s));
        h += `<td class="${BANDCLS[band]}" aria-label="Likelihood ${l}, severity ${s}, ${band} risk, score ${l * s}"><span class="rm-s">${band[0]}${l * s}</span>` +
          res.map(x => `<b class="rm-h" title="After controls: H${x.n} ${e(x.name)}">H${x.n}</b>`).join("") +
          ini.map(x => `<i class="rm-i" title="Before controls: H${x.n} ${e(x.name)}">H${x.n}</i>`).join("") + `</td>`;
      }
      h += `</tr>`;
    }
    h += `</tbody></table><p class="qual" style="margin:.7rem 0 0">Solid markers are the rating after controls; outlined markers are the rating before. Low is up to ${M.acc}, Medium up to ${M.tol}, High above. Each cell shows its band letter and score.</p>`;
    h += `<table class="gap-table" style="margin-top:.8rem"><thead><tr><th>Hazard</th><th>Before</th><th>After</th><th>Band</th><th>Barriers in place</th></tr></thead><tbody>` +
      M.hz.map(x => `<tr><td>H${x.n} ${e(x.name)}</td><td class="tnum">${x.init}</td><td class="tnum"><b>${x.res}</b></td><td>${x.band}</td><td class="tnum">${x.inPlace.length} of ${x.bars.length}</td></tr>`).join("") + `</tbody></table>`;
    return h;
  }

  function coverage(M) {
    let h = `<table class="gap-table"><thead><tr><th>Element</th><th>In place</th><th>Planned or not in place</th></tr></thead><tbody>`;
    let comp = "";
    ELEMENTS.forEach(([id, name, c]) => {
      if (c !== comp) { comp = c; h += `<tr><td colspan="3"><b>${e(c)}</b></td></tr>`; }
      const a = M.count("el", id, "In place"), b = M.count("el", id, "Not");
      h += `<tr><td>${id} ${e(name)}</td><td class="tnum">${a ? `<b>${a}</b>` : "—"}</td><td class="tnum">${b || "—"}</td></tr>`;
    });
    h += `</tbody></table><table class="gap-table" style="margin-top:.8rem"><thead><tr><th>Functional area</th><th>In place</th><th>Planned or not in place</th></tr></thead><tbody>`;
    AREAS.forEach(([id, name]) => {
      const a = M.count("area", id, "In place"), b = M.count("area", id, "Not");
      h += `<tr><td>${id} ${e(name)}</td><td class="tnum">${a ? `<b>${a}</b>` : "—"}</td><td class="tnum">${b || "—"}</td></tr>`;
    });
    return h + `</tbody></table>`;
  }

  function bowtie(M) {
    const bar = b => `<li><span class="bt-st">${e(b.status)}</span> ${e(b.text)}${b.el ? ` <span class="bt-tag">${e(b.el)}</span>` : ""}${b.area ? ` <span class="bt-tag">${e(b.area)}</span>` : ""}</li>`;
    const list = (a, empty) => a.length ? `<ul>${a.join("")}</ul>` : `<p class="bt-none">${empty}</p>`;
    return M.hz.map(x => `<div class="bt"><div class="bt-h"><b>H${x.n} ${e(x.name)}</b> · ${x.band} after controls (${x.res})</div>
      <div class="bt-grid">
        <div><h4>Threats</h4>${list(lines(x.h.threats).map(t => `<li>${e(t)}</li>`), "None entered")}</div>
        <div><h4>Preventive barriers</h4>${list(x.prev.map(bar), "None named")}</div>
        <div class="bt-top"><h4>Top event</h4><p>${e(x.top || "Not stated")}</p></div>
        <div><h4>Recovery barriers</h4>${list(x.rec.map(bar), "None named")}</div>
        <div><h4>Consequences</h4>${list(lines(x.h.conseq).map(t => `<li>${e(t)}</li>`), "None entered")}</div>
      </div></div>`).join("");
  }

  function render(M) {
    const F = findings(M);
    panels(false);
    $("sf-head").textContent = `${M.nHigh} above tolerance`;
    $("sf-band").textContent = `${M.hz.length} hazard${M.hz.length === 1 ? "" : "s"} · ${M.nHigh} High · ${M.nMed} Medium · ${M.nLow} Low`;
    $("sf-qual").textContent = `Ratings are those entered, after controls. ${M.inPlace} of ${M.bars.length} named barrier${M.bars.length === 1 ? " is" : "s are"} in place; the rest are planned or absent and are not credited.`;
    $("sf-kpis").innerHTML = [
      ["Hazards", M.hz.length, ""],
      ["Barriers in place", `${M.inPlace} of ${M.bars.length}`, M.bars.length && M.inPlace < M.bars.length ? "is-amber" : ""],
      ["Above tolerance", M.nHigh, M.nHigh ? "is-red" : "is-green"],
      ["SMS elements evidenced", `${M.evEl.size} of 12`, M.evEl.size < 12 ? "is-amber" : "is-green"]
    ].map(([l, v, c]) => `<div class="kpi ${c}"><div class="kv tnum">${v}</div><div class="kl">${l}</div></div>`).join("");
    $("sf-matrix").innerHTML = matrix(M);
    $("sf-findings").innerHTML = F.map(([t, hh, d]) => `<div style="padding:.55rem 0;border-bottom:1px solid rgba(255,255,255,.12);font-size:var(--fs-sm)"><b style="color:var(--jk-amber);font-size:var(--fs-xs);text-transform:uppercase;letter-spacing:.08em">${t}</b><div><b>${e(hh)}</b></div><div>${e(d)}</div></div>`).join("");
    $("sf-cover").innerHTML = coverage(M);
    $("sf-bowtie").innerHTML = bowtie(M);
    mountPrintSummary({
      title: "Safety assurance map",
      verdict: `${M.hz.length} hazard${M.hz.length === 1 ? "" : "s"}: ${M.nHigh} above tolerance after controls; ${M.inPlace} of ${M.bars.length} named barriers are in place and evidence ${M.evEl.size} of 12 SMS elements.`,
      findings: F.map(([t, h, d]) => ({ sev: t === "Stop" ? "stop" : t === "Warning" ? "warn" : "note", h, d })),
      basis: `Risk is likelihood × severity on a 5×5 scale; Low is up to ${M.acc}, Medium up to ${M.tol} and High above, as entered. Ratings, barriers and statuses are the user's own and are not verified. A barrier counts toward an SMS element (ICAO Annex 19 framework) only when its status is In place and it is tagged to that element; the tag is a working convention, not a compliance mapping. This is an organiser of judgements, not an SMS and not an assessment of one.`
    });
  }

  /* worked example: six generic hazards for a charter operator */
  const B = (kind, text, el, ar, status) => ({ id: seq++, kind, text, el, area: ar, status });
  function example() {
    const H = (name, top, threats, conseq, l0, s0, l1, s1, bars) => ({ id: seq++, name, top, threats, conseq, l0, s0, l1, s1, bars });
    const L = i => LIB[i];
    return [
      H(L(0)[0], L(0)[1], L(0)[2], L(0)[3], 4, 4, 2, 4, [
        B("Preventive", "Stabilised-approach gates with a mandatory go-around", "3.1", "FLT", "In place"),
        B("Preventive", "Landing-distance assessment before every approach", "2.2", "DSP", "In place"),
        B("Preventive", "Monthly flight-data exceedance review", "3.1", "FLT", "Planned"),
        B("Recovery", "Go-around and rejected-landing training each recurrent", "4.1", "FLT", "In place"),
        B("Recovery", "Airport emergency response plan coordinated", "1.4", "ORG", "Not in place")]),
      H(L(2)[0], L(2)[1], L(2)[2], L(2)[3], 4, 3, 3, 3, [
        B("Preventive", "Duty and rest limits applied to every roster", "2.2", "FLT", "In place"),
        B("Preventive", "Fatigue reporting channel for crew", "2.1", "ORG", "Planned"),
        B("Recovery", "Right to stand down without penalty", "4.2", "ORG", "Not in place")]),
      H(L(3)[0], L(3)[1], L(3)[2], L(3)[3], 3, 5, 2, 5, [
        B("Preventive", "Independent inspection of critical tasks", "2.2", "MNT", "In place"),
        B("Recovery", "Post-maintenance check flight and defect reporting", "3.1", "MNT", "In place")]),
      H(L(4)[0], L(4)[1], L(4)[2], L(4)[3], 2, 5, 2, 5, []),
      H(L(5)[0], L(5)[1], L(5)[2], L(5)[3], 4, 3, 3, 2, [
        B("Preventive", "Ground-handling supervision on every turnaround", "2.2", "GRH", "Planned"),
        B("Preventive", "Marshalling standard for the apron", "4.1", "GRH", "Planned"),
        B("Recovery", "Ground-damage reporting and review", "2.1", "GRH", "Planned")]),
      H(L(6)[0], L(6)[1], L(6)[2], L(6)[3], 3, 5, 3, 5, [
        B("Preventive", "Fuel-quality checks before each uplift", "2.2", "GRH", "Not in place"),
        B("Preventive", "Fuel-planning policy with reserves", "2.2", "DSP", "In place")])
    ];
  }

  $("load-example").addEventListener("click", () => {
    if (state.rows.length && !confirm("Replace the hazards you have entered with the worked example?")) return;
    state.rows = example(); buildRows(); run();
  });
  $("add-haz").addEventListener("click", () => {
    if (!state.rows.length) $("hazards").innerHTML = "";
    const h = newHazard(); state.rows.push(h); addHazard(h);
    const f = $("hazards").lastElementChild.querySelector("input"); if (f) f.focus(); run();
  });
  $("add-lib").addEventListener("click", () => {
    const i = parseInt($("sf-lib").value, 10); if (!isFinite(i)) return;
    if (!state.rows.length) $("hazards").innerHTML = "";
    const l = LIB[i], h = newHazard(l[0], l[1], l[2], l[3]); state.rows.push(h); addHazard(h); run();
  });
  $("print").addEventListener("click", () => window.print());
  $("reset").addEventListener("click", () => {
    if (!confirm("Clear the hazards and return the tolerability limits to their defaults?")) return;
    state = { rows: [] }; $("sf-acc").value = 4; $("sf-tol").value = 12; buildRows(); run();
  });
  wireToolEnquiryForm("sf-enquiry", "Safety Assurance Map");
  mountPrintHead("Safety Assurance Map", "Hazards, barriers and where the assurance is evidenced");
  buildRows(); run();
})();
