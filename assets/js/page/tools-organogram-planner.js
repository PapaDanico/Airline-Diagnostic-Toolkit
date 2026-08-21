/* Extracted verbatim from tools/organogram-planner.html so the site can carry a real
   script-src. Behaviour is unchanged: the tag sits where the inline
   block sat, with no defer or async, so execution order is identical.
   Edit here, not in the HTML. */

(function () {
  applyPartner(); mountChrome();

  const store = toolStore("organogram");
  let state = store.load();
  state.people = state.people || {};   // "<sector>|<roleIndex>" -> { n, dep }
  state.dept   = state.dept   || {};   // "<sector>|<deptIndex>" -> headcount
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));

  /* ---------- sector picker ---------- */
  const seg = $("sector-seg");
  JKV.sectors.forEach(s => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "seg"; b.dataset.sector = s.id;
    b.setAttribute("aria-pressed", "false");
    b.textContent = `${s.icon} ${s.short}`;
    b.addEventListener("click", () => select(s.id));
    seg.appendChild(b);
  });

  function select(id) {
    const s = JKV.sector(id);
    if (!s) return;
    state.sector = id;
    seg.querySelectorAll(".seg").forEach(el => el.setAttribute("aria-pressed", String(el.dataset.sector === id)));
    renderPostholders(s);
    renderScaffold(s);
    recompute();
    mountPrintHead("Organogram &amp; Postholder Planner", s.name);
    store.save(state);
  }

  /* ---------- postholders ---------- */
  function renderPostholders(s) {
    $("postholders").innerHTML = `<div class="org-row">` + s.postholders.map((p, i) => {
      const k = `${s.id}|${i}`;
      const rec = state.people[k] || {};
      return `<div class="role ${p.kcaa ? "is-postholder" : ""}" data-role="${i}" data-kcaa="${p.kcaa ? 1 : 0}">
          <b>${esc(p.r)}</b>
          <div class="r-tags"></div>
          ${p.note ? `<div class="r-rep" style="margin-top:.45rem">${esc(p.note)}</div>` : ""}
          <div style="margin-top:.6rem;display:grid;gap:6px">
            <input type="text" data-f="n" data-k="${k}" value="${esc(rec.n)}" placeholder="Holder name"
              aria-label="Holder for ${esc(p.r)}"
              style="width:100%;padding:.45rem .6rem;border:1px solid var(--jk-line-2);border-radius:6px;font-family:var(--sans);font-size:.84rem">
            <input type="text" data-f="dep" data-k="${k}" value="${esc(rec.dep)}" placeholder="Deputy / cover"
              aria-label="Deputy for ${esc(p.r)}"
              style="width:100%;padding:.45rem .6rem;border:1px solid var(--jk-line-2);border-radius:6px;font-family:var(--sans);font-size:.84rem">
          </div>
        </div>`;
    }).join("") + `</div>`;

    $("postholders").querySelectorAll("input").forEach(inp => {
      inp.addEventListener("input", () => {
        const k = inp.dataset.k;
        state.people[k] = state.people[k] || {};
        state.people[k][inp.dataset.f] = inp.value;
        store.save(state);
        paintTags(inp.closest(".role"));
        recompute();
      });
    });
    $("postholders").querySelectorAll(".role").forEach(paintTags);
  }

  /* Update one card's status tags in place.
     Re-rendering the whole list on input or blur would detach the very
     node the visitor is typing into — tabbing from a holder field to its
     deputy field would silently discard the edit. Mutating just the tag
     row keeps focus and in-progress text intact. */
  function paintTags(card) {
    if (!card) return;
    const s = JKV.sector(state.sector);
    const i = +card.dataset.role;
    const kcaa = card.dataset.kcaa === "1";
    const rec = state.people[`${s.id}|${i}`] || {};
    const hasN = !!(rec.n || "").trim(), hasD = !!(rec.dep || "").trim();
    card.classList.toggle("is-vacant", !hasN);
    card.querySelector(".r-tags").innerHTML =
      (kcaa ? '<span class="tag kcaa">Regulator-accepted</span>' : '<span class="tag">Supporting</span>') +
      (hasN ? "" : '<span class="tag gap">Vacant</span>') +
      (kcaa && hasN && !hasD ? '<span class="tag gap">No deputy</span>' : "") +
      (hasD ? '<span class="tag dep">Deputy named</span>' : "");
  }

  /* ---------- departmental scaffold ---------- */
  function renderScaffold(s) {
    $("scaffold").innerHTML = JKV.orgScaffold.map((d, i) => {
      const k = `${s.id}|${i}`;
      const n = state.dept[k] !== undefined ? state.dept[k] : defaultDept(s, i);
      return `<div class="card card-flat" style="padding:18px 22px;margin-bottom:12px">
          <div class="flex between items-center wrapf gap">
            <div style="flex:1;min-width:200px">
              <b style="font-family:var(--sans);font-size:.96rem">${esc(d.dep)}</b>
              <div class="muted" style="font-size:.82rem;margin-top:.2rem">${d.roles.map(esc).join(" · ")}</div>
            </div>
            <div class="flex items-center" style="gap:.5rem">
              <label class="muted" style="font-size:.8rem" for="dept-${i}">Headcount</label>
              <input type="number" id="dept-${i}" min="0" max="500" step="1" value="${n}" data-d="${k}"
                style="width:84px;padding:.45rem .6rem;border:1px solid var(--jk-line-2);border-radius:6px;font-family:var(--sans);font-size:.86rem;text-align:right">
            </div>
          </div>
        </div>`;
    }).join("");

    $("scaffold").querySelectorAll("input").forEach(inp => {
      inp.addEventListener("input", () => {
        state.dept[inp.dataset.d] = parseInt(inp.value, 10) || 0;
        store.save(state);
        recompute();
      });
    });
  }

  /* Distribute the sector's launch headcount across departments with a
     weighting that reflects where an aviation organisation actually carries
     its people — operations and technical dominate, admin is thin. */
  const DEPT_WEIGHT = [0.06, 0.09, 0.30, 0.20, 0.15, 0.09, 0.11];
  function defaultDept(s, i) {
    const total = (JKV.headcount[s.id] || {}).launch || 30;
    return Math.max(1, Math.round(total * (DEPT_WEIGHT[i] || 0.1)));
  }

  /* ---------- recompute ---------- */
  function recompute() {
    const s = JKV.sector(state.sector);
    if (!s) return;

    const kcaaPosts = s.postholders.filter(p => p.kcaa);
    let named = 0, deputised = 0, spof = 0;
    const spofList = [], vacantList = [];
    s.postholders.forEach((p, i) => {
      const rec = state.people[`${s.id}|${i}`] || {};
      const hasN = !!(rec.n || "").trim(), hasD = !!(rec.dep || "").trim();
      if (!p.kcaa) return;
      if (hasN) named++; else vacantList.push(p.r);
      if (hasD) deputised++;
      if (hasN && !hasD) { spof++; spofList.push(p.r); }
    });

    // a post is "ready" when it is named; deputy cover counts half again
    const denom = kcaaPosts.length * 1.5;
    const pct = denom ? Math.round(((named + deputised * 0.5) / denom) * 100) : 0;
    $("meter-fill").style.width = pct + "%";
    $("meter-val").textContent = pct + "%";
    $("k-named").textContent = `${named}/${kcaaPosts.length}`;
    $("k-dep").textContent   = `${deputised}/${kcaaPosts.length}`;
    $("k-spof").textContent  = spof;
    $("k-spof").parentElement.className = "kpi " + (spof === 0 ? "is-green" : spof <= 2 ? "is-amber" : "is-red");
    $("k-named").parentElement.className = "kpi " + (named === kcaaPosts.length ? "is-green" : "is-red");

    // headcount
    const deptTotal = JKV.orgScaffold.reduce((a, d, i) => {
      const k = `${s.id}|${i}`;
      return a + (state.dept[k] !== undefined ? state.dept[k] : defaultDept(s, i));
    }, 0);
    $("k-head").textContent = deptTotal;

    const hc = JKV.headcount[s.id] || { launch: deptTotal, y3: deptTotal, y5: deptTotal };
    const launch = Math.max(deptTotal, hc.launch);
    const rows = [
      { st: "Launch (Year 1)", n: launch, note: "Minimum viable establishment with every accepted post filled." },
      { st: "Year 3",          n: Math.max(hc.y3, Math.round(launch * (hc.y3 / hc.launch))), note: "Scaled with utilisation; deputies substantive rather than nominal." },
      { st: "Year 5",          n: Math.max(hc.y5, Math.round(launch * (hc.y5 / hc.launch))), note: "Steady state, with succession depth behind each accepted post." }
    ];
    let prev = null;
    $("ramp").querySelector("tbody").innerHTML = rows.map(r => {
      const g = prev ? `+${Math.round(((r.n - prev) / prev) * 100)}%` : "—";
      prev = r.n;
      return `<tr><td><b>${r.st}</b></td><td class="num">${r.n}</td><td class="num">${g}</td><td class="muted">${r.note}</td></tr>`;
    }).join("");

    // risk panel
    $("risk").innerHTML = spofList.length
      ? `<div class="note warn"><b>${spofList.length} accepted post${spofList.length > 1 ? "s" : ""} with no named cover</b>
           ${spofList.map(esc).join(", ")}. Documented deputisation for every key manager is expected practice, and an
           uncovered post becomes an operational stop the moment that person is unavailable. Where the post is one the
           Authority accepts personally — an Accountable Manager or Head of Training — an unplanned departure can trigger
           re-approval of the whole organisation.</div>`
      : (named === kcaaPosts.length
          ? `<div class="note ok"><b>Every accepted post is named and covered</b>Record the deputy arrangements in the relevant manual so they are visible to the Authority at surveillance.</div>`
          : `<div class="note"><b>Name the remaining posts</b>${kcaaPosts.length - named} accepted post${kcaaPosts.length - named > 1 ? "s remain" : " remains"} vacant. Certification does not proceed on a vacant post.</div>`);

    let v;
    if (named < kcaaPosts.length) v = { c: "note warn", t: "Posts still vacant", d: `${kcaaPosts.length - named} of ${kcaaPosts.length} accepted posts unnamed.` };
    else if (spof > 0) v = { c: "note warn", t: "Continuity risk", d: `${spof} named post${spof > 1 ? "s have" : " has"} no deputy.` };
    else v = { c: "note ok", t: "Organisation complete", d: "Every accepted post named and covered. Prepare the acceptance submissions and interview packs." };
    $("verdict").innerHTML = `<div class="${v.c}" style="margin:0"><b>${v.t}</b>${v.d}</div>`;

    const body =
      `Sector: ${s.name}\n` +
      `Accepted posts named: ${named}/${kcaaPosts.length}\n` +
      `Deputies named: ${deputised}/${kcaaPosts.length}\n` +
      `Posts without cover: ${spof}${spofList.length ? " (" + spofList.join(", ") + ")" : ""}\n` +
      `Planned launch headcount: ${launch}\n\n` +
      `I would like this organisation design reviewed.`;
    const href = toolMailto("Organogram", s.short + " organisation", body);
    $("talk").href = href; $("cta-mail").href = href;
    wireToolEnquiryForm("org-enquiry", "Organogram Planner");

    summarise({ s, kcaaPosts, named, deputised, spof, spofList, vacantList, launch, pct });
  }

  /* ---- answer-first opening page for the printed pack ----

     Ordered by what stops the certificate. A vacant accepted post is
     not a staffing gap, it is a submission that cannot be made; an
     uncovered post is a submission that can be made and then unwinds
     the moment one person resigns. Both outrank headcount, which is a
     budget question the board can settle at leisure.

     The last finding is the one an operator almost never arrives at
     unprompted: the accepted-post count does not scale with the fleet.
     A three-aircraft operator carries the same named accountabilities
     as a twenty-aircraft one, so the regulatory burden per aircraft is
     several times heavier at the small end. That is the structural fact
     behind most of the surprise in a first-time certification budget,
     and the planner has always had the numbers to say it. */
  function summarise({ s, kcaaPosts, named, deputised, spof, spofList, vacantList, launch, pct }) {
    const vacant = kcaaPosts.length - named;
    const f = [];

    if (vacant > 0) f.push({ sev: "stop",
      h: `${vacant} of ${kcaaPosts.length} regulator-accepted posts unnamed`,
      d: `${vacantList.slice(0, 4).join("; ")}${vacant > 4 ? `; and ${vacant - 4} more` : ""}. Certification does not proceed on a vacant accepted post — each needs a named individual whose credentials the Authority accepts personally, not a job description.` });

    /* A continuity risk, never a stop: certification proceeds on named
       posts, and an uncovered post is a submission that unwinds later
       rather than one that cannot be made now. The page's own verdict
       panel has always called this "Continuity risk"; ranking it as a
       blocker here would have the summary contradict the tool. */
    if (spof > 0) f.push({ sev: "warn",
      h: `${spof} named post${spof > 1 ? "s have" : " has"} no deputy`,
      d: `${spofList.slice(0, 4).join("; ")}${spofList.length > 4 ? `; and ${spofList.length - 4} more` : ""}. Documented deputisation is expected practice, and an uncovered post becomes an operational stop the day that person is unavailable. Where the Authority accepts the individual personally, an unplanned departure can force re-approval of the whole organisation.` });

    /* Density, not headcount. The ratio is what makes the case. */
    if (launch > 0) {
      const perPost = launch / kcaaPosts.length;
      f.push({ sev: "note", h: `${kcaaPosts.length} accepted posts against a launch establishment of ${launch}`,
        d: `One in every ${perPost.toFixed(1)} people carries a named regulatory accountability. That count is set by the scope of the certificate, not the size of the fleet — the same ${kcaaPosts.length} posts are required whether the operation runs three aircraft or twenty, so the compliance burden per aircraft is heaviest at the smallest scale.` });
    }

    if (!f.some(x => x.sev === "stop" || x.sev === "warn"))
      f.unshift({ sev: "ok", h: "Every accepted post is named and covered",
        d: `${named} of ${kcaaPosts.length} named, ${deputised} with a documented deputy. Record the deputisation arrangements in the relevant manual so they are visible to the Authority at surveillance rather than asserted at audit.` });

    mountPrintSummary({
      title: `${s.name} — organisation and postholder plan`,
      verdict: vacant > 0
        ? `${vacant} of ${kcaaPosts.length} accepted posts unnamed — the acceptance submission cannot be made as it stands`
        : spof > 0
          ? `All ${kcaaPosts.length} accepted posts named, but ${spof} carr${spof > 1 ? "y" : "ies"} no deputy — ${pct}% organisational readiness`
          : `All ${kcaaPosts.length} accepted posts named and covered — ${pct}% organisational readiness`,
      findings: f,
      basis: `Readiness weights a named holder at full value and a documented deputy at half again, across the ${kcaaPosts.length} posts this certificate scope requires the Authority to accept. Launch establishment of ${launch} is the operator's own departmental figures against JK's planning baseline. Post titles follow the Kenyan requirement set; other EAC authorities differ in naming rather than in substance.`
    });
  }

  $("print").addEventListener("click", () => window.print());
  $("reset").addEventListener("click", () => {
    const s = JKV.sector(state.sector);
    if (!s || !confirm(`Clear the organisation plan for ${s.short}?`)) return;
    Object.keys(state.people).forEach(k => { if (k.startsWith(s.id + "|")) delete state.people[k]; });
    Object.keys(state.dept).forEach(k => { if (k.startsWith(s.id + "|")) delete state.dept[k]; });
    store.save(state);
    select(s.id);
  });

  const fromUrl = new URLSearchParams(location.search).get("sector");
  select((fromUrl && JKV.sector(fromUrl)) ? fromUrl : (state.sector || "aoc"));
})();
