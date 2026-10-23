/* Plan Consistency Check: the same fact stated two ways, and totals that
   do not add up.

   This exists because of a review of a 37-page board deck. Every one of
   its thirteen internal contradictions — a launch date on one page and
   another on the next, a fleet of seven in one table and eight in
   another, a headcount chart that summed to figures the headline had
   already superseded — was found by listing each date, count and total
   and putting them side by side. That is mechanical work, and mechanical
   work is what a tool is for. The judgement about which contradiction
   changes the decision stays with the reader, which is why every
   statement carries a weight and the findings are ordered by it.

   What it does not do is read the plan. The reader enters statements, so
   the tool can only compare what it is told, and a topic is matched on
   the words typed. Two phrasings of one fact will not be paired; the
   disclaimer says so rather than implying more. */

(function () {
  applyPartner(); mountChrome();

  const store = toolStore("consistency");
  let state = store.load();
  const $ = id => document.getElementById(id);
  state.claims = Array.isArray(state.claims) ? state.claims : [];
  state.sums = Array.isArray(state.sums) ? state.sums : [];
  if (typeof state.tol !== "number") state.tol = 0.5;
  let seq = 1 + Math.max(0, ...state.claims.map(c => c.id || 0), ...state.sums.map(s => s.id || 0));

  const WEIGHTS = ["High", "Medium", "Low"];
  const RANK = { High: 3, Medium: 2, Low: 1 };
  const SEV = { High: "stop", Medium: "warn", Low: "note" };

  /* ---------- reading what was typed ---------- */
  const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  const norm = s => String(s == null ? "" : s).toLowerCase().replace(/[^\p{L}\p{N}.\s%/-]/gu, " ").replace(/\s+/g, " ").trim();

  /* A date is read only when it is unmistakably one: ISO, or a day, a
     month name and a year. "1/4/2027" is ambiguous between two readings
     and is left as text rather than guessed. */
  function parseDate(s) {
    s = String(s).trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
    m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})$/);
    if (m && MONTHS[m[2].slice(0, 3).toLowerCase()] !== undefined) return Date.UTC(+m[3], MONTHS[m[2].slice(0, 3).toLowerCase()], +m[1]);
    m = s.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/);
    if (m && MONTHS[m[1].slice(0, 3).toLowerCase()] !== undefined) return Date.UTC(+m[3], MONTHS[m[1].slice(0, 3).toLowerCase()], +m[2]);
    return null;
  }

  /* A number may carry a currency prefix, thousands separators, a percent
     sign or a k / m / bn suffix. Anything else attached to it — "Q2 2028",
     "7 aircraft" — makes it text, because 2028 is not a quantity there. */
  function parseNum(s) {
    const t = String(s).trim().replace(/,/g, "");
    const m = t.match(/^(?:USD|US\$|KES|KSh|TZS|EUR|GBP|\$|£|€)?\s*(-?\d+(?:\.\d+)?)\s*(%|k|m|mn|bn|b)?$/i);
    if (!m) return null;
    const f = { k: 1e3, m: 1e6, mn: 1e6, b: 1e9, bn: 1e9 }[(m[2] || "").toLowerCase()] || 1;
    return parseFloat(m[1]) * f;
  }

  function read(v) {
    const s = String(v == null ? "" : v).trim();
    if (!s) return { k: "empty" };
    const d = parseDate(s); if (d !== null) return { k: "date", n: d, shown: s };
    const n = parseNum(s); if (n !== null) return { k: "num", n, shown: s };
    return { k: "text", t: norm(s), shown: s };
  }

  const same = (a, b, tolPct) => {
    if (a.k !== b.k) return false;
    if (a.k === "date") return a.n === b.n;
    if (a.k === "num") return Math.abs(a.n - b.n) <= (tolPct / 100) * Math.max(Math.abs(a.n), Math.abs(b.n));
    return a.t === b.t;
  };

  /* ---------- the analysis ---------- */
  function analyse() {
    const tol = Math.max(0, Number(state.tol) || 0);
    const groups = new Map();
    state.claims.forEach(c => {
      const key = norm(c.topic), v = read(c.value);
      if (!key || v.k === "empty") return;
      if (!groups.has(key)) groups.set(key, { topic: String(c.topic).trim(), items: [] });
      groups.get(key).items.push({ c, v });
    });
    const conflicts = [], agreed = [], single = [];
    groups.forEach(g => {
      if (g.items.length < 2) { single.push(g); return; }
      const clusters = [];
      g.items.forEach(it => {
        const hit = clusters.find(cl => same(cl[0].v, it.v, tol));
        if (hit) hit.push(it); else clusters.push([it]);
      });
      if (clusters.length > 1) {
        const w = g.items.reduce((m, it) => Math.max(m, RANK[it.c.w] || 2), 0);
        conflicts.push({ topic: g.topic, clusters, w: WEIGHTS.find(x => RANK[x] === w) });
      } else agreed.push(g);
    });
    conflicts.sort((a, b) => RANK[b.w] - RANK[a.w] || a.topic.localeCompare(b.topic));

    const sums = [];
    state.sums.forEach(s => {
      const raw = String(s.parts || "").split(/[,;\n]+/).map(x => x.trim()).filter(Boolean);
      const parts = raw.map(parseNum);
      const total = parseNum(String(s.total || ""));
      if (!raw.length || total === null) return;
      if (parts.some(p => p === null)) { sums.push({ s, bad: raw.filter((x, i) => parts[i] === null) }); return; }
      const got = parts.reduce((a, b) => a + b, 0);
      const diff = got - total;
      const ok = Math.abs(diff) <= (tol / 100) * Math.max(Math.abs(got), Math.abs(total));
      sums.push({ s, got, total, diff, ok, n: parts.length });
    });
    const failing = sums.filter(x => !x.bad && !x.ok).sort((a, b) => RANK[b.s.w || "Medium"] - RANK[a.s.w || "Medium"]);
    const unreadable = sums.filter(x => x.bad);
    return { groups, conflicts, agreed, single, sums, failing, unreadable, tol };
  }

  /* ---------- rows: built once, never rebuilt while typing ----------
     A row's inputs are created when the row is added or loaded and are
     left alone afterwards; only the findings panel is rewritten. Rebuilding
     the row under the cursor was this codebase's recurring defect. */
  const ROW_STYLE = "display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;align-items:end;padding:.7rem 0;border-bottom:1px solid var(--jk-line)";
  function field(label, el) {
    const wrap = document.createElement("div"); wrap.className = "field"; wrap.style.margin = "0";
    const l = document.createElement("label"); l.textContent = label; l.style.fontSize = "var(--fs-xs)";
    el.setAttribute("aria-label", label); el.id = "f" + (seq++);
    l.htmlFor = el.id; wrap.append(l, el); return wrap;
  }
  function text(val, ph, onInput) {
    const i = document.createElement("input"); i.type = "text"; i.value = val || ""; i.placeholder = ph || "";
    i.addEventListener("input", () => onInput(i.value)); return i;
  }
  function weightSel(val, onChange) {
    const s = document.createElement("select");
    WEIGHTS.forEach(w => { const o = document.createElement("option"); o.textContent = w; o.value = w; s.appendChild(o); });
    s.value = WEIGHTS.includes(val) ? val : "Medium";
    s.addEventListener("change", () => onChange(s.value)); return s;
  }
  function removeBtn(label, onClick) {
    const b = document.createElement("button"); b.type = "button"; b.className = "btn btn-ghost btn-sm";
    b.textContent = "Remove"; b.setAttribute("aria-label", label); b.addEventListener("click", onClick); return b;
  }

  function addClaimRow(c) {
    const row = document.createElement("div"); row.style.cssText = ROW_STYLE; row.dataset.claim = c.id;
    row.append(
      field("Topic", text(c.topic, "e.g. Launch date", v => { c.topic = v; run(); })),
      field("Value as written", text(c.value, "e.g. 1 Apr 2027", v => { c.value = v; run(); })),
      field("Where stated", text(c.src, "e.g. p.10", v => { c.src = v; run(); })),
      field("Weight", weightSel(c.w, v => { c.w = v; run(); })),
      removeBtn("Remove this statement", () => { state.claims = state.claims.filter(x => x !== c); row.remove(); run(); })
    );
    $("claims").appendChild(row);
  }
  function addSumRow(s) {
    const row = document.createElement("div"); row.style.cssText = ROW_STYLE; row.dataset.sum = s.id;
    row.append(
      field("What the total is", text(s.label, "e.g. FY2027 headcount chart", v => { s.label = v; run(); })),
      field("The parts, separated by commas", text(s.parts, "e.g. 8, 5, 8, 10", v => { s.parts = v; run(); })),
      field("Total the plan states", text(s.total, "e.g. 52", v => { s.total = v; run(); })),
      field("Where stated", text(s.src, "e.g. p.29", v => { s.src = v; run(); })),
      field("Weight", weightSel(s.w, v => { s.w = v; run(); })),
      removeBtn("Remove this total", () => { state.sums = state.sums.filter(x => x !== s); row.remove(); run(); })
    );
    $("sums").appendChild(row);
  }
  function buildRows() {
    $("claims").innerHTML = ""; $("sums").innerHTML = "";
    state.claims.forEach(addClaimRow); state.sums.forEach(addSumRow);
    if (!state.claims.length) $("claims").innerHTML = `<p class="muted" style="font-size:var(--fs-sm)">No statements yet. Add one, or load the worked example to see how it reads.</p>`;
  }

  /* ---------- rendering the answer ---------- */
  const e = escapeHtml;
  const valLine = it => `<b>${e(it.v.shown)}</b> <span style="opacity:.75">(${e(it.c.src || "source not given")})</span>`;
  function render(a) {
    const nFind = a.conflicts.length + a.failing.length;
    const high = a.conflicts.filter(c => c.w === "High").length + a.failing.filter(f => (f.s.w || "Medium") === "High").length;
    $("pc-head").textContent = state.claims.length || state.sums.length ? (nFind ? String(nFind) : "Clean") : "—";
    $("pc-band").textContent = !state.claims.length && !state.sums.length ? "Enter what the plan says."
      : nFind ? `${nFind} finding${nFind > 1 ? "s" : ""}${high ? ` · ${high} High` : ""}` : "No contradictions found";
    $("pc-qual").textContent = nFind
      ? `${a.conflicts.length} fact${a.conflicts.length === 1 ? "" : "s"} stated more than one way and ${a.failing.length} total${a.failing.length === 1 ? "" : "s"} that do not add up. Resolve these before the plan is circulated; each is the kind of difference a Board finds in the meeting.`
      : (a.agreed.length || a.sums.length ? `${a.agreed.length} topic${a.agreed.length === 1 ? "" : "s"} compared and every one agrees; ${a.sums.filter(x => x.ok).length} total${a.sums.filter(x => x.ok).length === 1 ? "" : "s"} add up.` : "A fact is only compared when it is stated at least twice under the same topic.");
    $("pc-kpis").innerHTML = [
      ["Statements", state.claims.filter(c => c.topic && c.value).length, ""],
      ["Topics compared", a.agreed.length + a.conflicts.length, ""],
      ["Contradictions", a.conflicts.length, a.conflicts.length ? "is-red" : "is-green"],
      ["Totals failing", a.failing.length, a.failing.length ? "is-red" : "is-green"]
    ].map(([l, v, c]) => `<div class="kpi ${c}"><div class="kv tnum">${v}</div><div class="kl">${l}</div></div>`).join("");

    const item = (tag, head, body) => `<div style="padding:.55rem 0;border-bottom:1px solid rgba(255,255,255,.12);font-size:var(--fs-sm)"><b style="color:var(--jk-amber);font-size:var(--fs-xs);text-transform:uppercase;letter-spacing:.08em">${e(tag)}</b><div><b>${e(head)}</b></div><div>${body}</div></div>`;
    let h = "";
    a.conflicts.forEach(c => { h += item(`${c.w} · stated ${c.clusters.length} ways`, c.topic, c.clusters.map(cl => cl.map(valLine).join("; ")).join("<br>versus ")); });
    a.failing.forEach(f => { h += item(`${f.s.w || "Medium"} · does not add up`, f.s.label || "Unnamed total", `Parts sum to <b>${f.got.toLocaleString("en-GB", { maximumFractionDigits: 3 })}</b>; the plan states <b>${f.total.toLocaleString("en-GB", { maximumFractionDigits: 3 })}</b> (${f.diff > 0 ? "+" : ""}${f.diff.toLocaleString("en-GB", { maximumFractionDigits: 3 })}, ${e(f.s.src || "source not given")}).`); });
    a.unreadable.forEach(u => { h += item("Cannot read", u.s.label || "Unnamed total", `Could not read ${u.bad.map(e).join(", ")} as a number. Parts must be numbers.`); });
    if (a.single.length) h += `<p class="qual" style="margin:.8rem 0 0">${a.single.length} topic${a.single.length === 1 ? " is" : "s are"} stated once, so there is nothing to compare: ${a.single.slice(0, 4).map(g => e(g.topic)).join(", ")}${a.single.length > 4 ? "…" : ""}.</p>`;
    $("pc-findings").innerHTML = h || `<p class="qual" style="margin:0">Findings appear here.</p>`;
    summarise(a, nFind, high);
  }

  /* ---- answer-first opening page for the printed pack ----
     Ordered by the weight the reader gave each statement, never by the
     order they were typed: a High contradiction cannot sit below a Low. */
  function summarise(a, nFind, high) {
    if (!state.claims.length && !state.sums.length) { mountPrintSummary(null); return; }
    const f = [];
    a.conflicts.forEach(c => f.push({ sev: SEV[c.w], h: `${c.topic}: stated ${c.clusters.length} ways`,
      d: c.clusters.map(cl => cl.map(it => `${it.v.shown} (${it.c.src || "source not given"})`).join(", ")).join(" versus ") + "." }));
    a.failing.forEach(x => f.push({ sev: SEV[x.s.w || "Medium"], h: `${x.s.label || "A total"} does not add up`,
      d: `Parts sum to ${x.got.toLocaleString("en-GB", { maximumFractionDigits: 3 })}; the plan states ${x.total.toLocaleString("en-GB", { maximumFractionDigits: 3 })} (${x.s.src || "source not given"}).` }));
    if (!nFind) f.push({ sev: "ok", h: "No contradictions found",
      d: `${a.agreed.length} topic${a.agreed.length === 1 ? "" : "s"} stated more than once, all consistent, and ${a.sums.filter(x => x.ok).length} total${a.sums.filter(x => x.ok).length === 1 ? "" : "s"} checked. This is consistency, not correctness: a plan can agree with itself and still be wrong.` });
    mountPrintSummary({
      title: "Plan consistency",
      verdict: nFind
        ? `${nFind} finding${nFind > 1 ? "s" : ""}${high ? `, ${high} of them High` : ""}: ${a.conflicts.length} fact${a.conflicts.length === 1 ? "" : "s"} stated more than one way and ${a.failing.length} total${a.failing.length === 1 ? "" : "s"} that do not add up.`
        : `No contradictions found across ${a.agreed.length} topic${a.agreed.length === 1 ? "" : "s"} and ${a.sums.filter(x => x.ok).length} total${a.sums.filter(x => x.ok).length === 1 ? "" : "s"}.`,
      findings: f,
      basis: `Compared on the statements entered, ${state.claims.filter(c => c.topic && c.value).length} in all. Topics are matched on the words typed; numbers within ${a.tol}% are treated as equal, dates must match to the day, and other text must match after case and punctuation are ignored. A fact stated once cannot be checked. Weights are the reader's own.`
    });
  }

  function run() { render(analyse()); store.save(state); }

  /* ---------- actions ---------- */
  $("add-claim").addEventListener("click", () => {
    if (!state.claims.length) $("claims").innerHTML = "";
    const c = { id: seq++, topic: "", value: "", src: "", w: "Medium" }; state.claims.push(c); addClaimRow(c);
    const first = $("claims").lastElementChild.querySelector("input"); if (first) first.focus();
  });
  $("add-sum").addEventListener("click", () => {
    const s = { id: seq++, label: "", parts: "", total: "", src: "", w: "Medium" }; state.sums.push(s); addSumRow(s);
    const first = $("sums").lastElementChild.querySelector("input"); if (first) first.focus();
  });
  $("tol").value = state.tol;
  $("tol").addEventListener("input", () => { const v = parseFloat($("tol").value); state.tol = isFinite(v) && v >= 0 ? Math.min(v, 10) : 0.5; run(); });

  /* A worked example in the shape of the contradictions that matter in a
     real plan. It is illustrative: nothing in it is any organisation's. */
  $("load-example").addEventListener("click", () => {
    if ((state.claims.length || state.sums.length) && !confirm("Replace what you have entered with the worked example?")) return;
    const C = (topic, value, src, w) => ({ id: seq++, topic, value, src, w });
    state.claims = [
      C("Launch date", "1 Apr 2027", "Summary, p.4", "High"), C("Launch date", "15 Mar 2027", "Programme timeline, p.12", "High"), C("Launch date", "1 April 2027", "Board decisions, p.20", "High"),
      C("Fleet size", "7", "Scenario table, p.5", "High"), C("Fleet size", "8", "Fleet plan, p.9", "High"),
      C("Terminal opening", "Q2 2028", "Delivery plan, p.10", "Medium"), C("Terminal opening", "2029", "Investment case, p.21", "Medium"),
      C("FY2027 headcount", "52", "Headline, p.30", "High"), C("FY2027 headcount", "50", "Functional chart, p.29", "High"),
      C("Acquisition price", "USD 8.6m", "Valuation reference, p.4", "Medium"), C("Acquisition price", "USD 10m", "Planning assumption, p.18", "Medium"),
      C("Safety reports to", "Accountable Manager", "Structure, p.27", "Low")
    ];
    state.sums = [
      { id: seq++, label: "FY2027 revenue by line", parts: "2.5, 1.8, 1.2, 0.4, 0.4, 1.0, 0.8, 0.5, 0.4", total: "9.0", src: "p.16", w: "Medium" },
      { id: seq++, label: "FY2027 headcount by function", parts: "8, 5, 8, 10, 4, 3, 4, 5, 3", total: "52", src: "p.29", w: "High" },
      { id: seq++, label: "Terminal capital by year", parts: "1.5, 6.5, 2.0", total: "10", src: "p.22", w: "Medium" }
    ];
    buildRows(); run();
  });

  $("export").addEventListener("click", () => {
    const a = analyse();
    const q = s => `"${String(s).replace(/"/g, '""')}"`;
    const lines = [["Type", "Weight", "Topic or total", "Detail"].map(q).join(",")];
    a.conflicts.forEach(c => lines.push(["Contradiction", c.w, c.topic, c.clusters.map(cl => cl.map(it => `${it.v.shown} (${it.c.src || "no source"})`).join(" / ")).join(" VERSUS ")].map(q).join(",")));
    a.failing.forEach(f => lines.push(["Total does not add up", f.s.w || "Medium", f.s.label || "", `parts ${f.got} vs stated ${f.total} (${f.s.src || "no source"})`].map(q).join(",")));
    const blob = new Blob([lines.join("\r\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob), l = document.createElement("a");
    l.href = url; l.download = "plan-consistency-register.csv"; document.body.appendChild(l); l.click(); l.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $("print").addEventListener("click", () => window.print());
  $("reset").addEventListener("click", () => {
    if (!confirm("Clear every statement and total you have entered?")) return;
    state = { claims: [], sums: [], tol: 0.5 }; $("tol").value = 0.5; buildRows(); run();
  });
  wireToolEnquiryForm("pc-enquiry", "Plan Consistency Check");
  mountPrintHead("Plan Consistency Check", "The same fact stated two ways, and totals that do not add up");

  buildRows();
  run();
})();
