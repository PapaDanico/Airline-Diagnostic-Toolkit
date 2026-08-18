/* ============================================================
   JK & ASSOCIATES — THE VENTURE FILE (v3.1)

   Ten tools that each remember their own work are ten tools.
   One file they all report into is a platform. This module is that
   file: it holds the venture's identity (name, sector, target launch
   date), reads every tool's saved state, and derives a single
   cross-tool view — readiness, critical path, and the one thing to do
   next.

   ── DESIGN NOTE: derived, not published ─────────────────────
   Nothing here asks a tool to write a summary of itself. Each reader
   below opens that tool's existing localStorage record and computes
   the summary from the raw state. The tools stay untouched and
   unaware, a tool can be opened and used with no dashboard in sight,
   and there is no second copy of the truth to fall out of date.

   The cost is that a reader knows the shape of another tool's store.
   That coupling is deliberate and it is one-way: this file depends on
   the tools, never the reverse.

   Nothing leaves the device. Export writes a file the visitor chooses
   to save; import reads one they choose to open.
   ============================================================ */

const JKW = {

  PROFILE_KEY: "jk_venture_file_v3",
  SCEN_KEY: "jk_scenarios_v3",

  /* Most scenarios a workspace will hold. localStorage is a few megabytes
     and each scenario is a full copy of the workspace, so the cap is
     about keeping the quota comfortable rather than about the UI. */
  MAX_SCENARIOS: 12,

  /* Keys the platform owns. Both prefixes are live: the venture-track
     tools were built as jk_*, and the original operating-track tools
     still carry the dn_* names they shipped under. Renaming those would
     silently orphan the saved work of anyone who has used them. */
  KEY_RE: /^(jk|dn)_[A-Za-z0-9_]+$/,

  /* Indicative share of total certification lead time per phase. The
     five phases are not equal: document evaluation and on-site
     demonstration are where applications actually sit. Used only to
     back-schedule a target date — it is a planning aid, not a
     commitment, and the tool says so. */
  PHASE_SHARE: { pre: 0.10, formal: 0.15, docs: 0.30, demo: 0.35, cert: 0.10 },

  /* Module weights in the Launch Readiness Index. The certificate is
     the binding constraint on a greenfield venture — no amount of
     capital substitutes for it — so it carries the most. Capital is
     next, because certification burns cash on a fixed clock. Revenue
     readiness is the newest dimension: it is the test an investment
     committee asks first and the tool answered last. */
  WEIGHTS: { certnav: 35, venture: 20, organogram: 18, structure: 12, revenue: 15 },

  /* ---------- raw store access (never throws) ---------- */
  read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; }
  },
  exists(key) {
    try { return localStorage.getItem(key) !== null; } catch { return false; }
  },

  /* ---------- store sources ----------
     A reader should not care whether it is looking at the live workspace
     or at a snapshot taken three weeks ago. Both are just "something you
     can ask for a store by key", so every reader takes a source and the
     scenario comparison falls out for free rather than needing a second
     set of readers that would drift from the first. */
  liveSource() {
    const self = this;
    return { get: k => self.read(k), has: k => self.exists(k) };
  },
  objSource(stores) {
    stores = stores || {};
    return {
      get: k => (stores[k] && typeof stores[k] === "object") ? stores[k] : {},
      has: k => Object.prototype.hasOwnProperty.call(stores, k)
    };
  },

  /* ---------- the venture profile ---------- */
  profile() {
    const p = this.read(this.PROFILE_KEY);
    return { name: p.name || "", sector: p.sector || "aoc", target: p.target || "", updated: p.updated || "" };
  },
  saveProfile(patch) {
    const next = Object.assign(this.profile(), patch, { updated: new Date().toISOString() });
    /* The profile is the venture's name, stage and target date — typed
       once and relied on by every tool downstream. Losing it silently
       means each tool quietly reverts to placeholders. */
    reportingWrite(() => localStorage.setItem(this.PROFILE_KEY, JSON.stringify(next)));
    return next;
  },

  /* ============================================================
     MODULE READERS
     Each returns a uniform record so the dashboard renders one
     component, not four:
       { id, name, href, icon, started, pct, rag, headline, next,
         sector, facts:[{k,v}] }
     `rag` is "idle" until the tool has been used — an untouched tool
     is not a red flag, it is an unanswered question, and colouring it
     red would cry wolf on a first visit.
     ============================================================ */

  /* ---- 1. KCAA Certification Navigator ---- */
  certnav(prof, src) {
    src = src || this.liveSource();
    const st = src.get("jk_certnav_v3");
    const sec = JKV.sector(st.sector || prof.sector);
    const base = { id: "certnav", name: "KCAA Certification Navigator", icon: "🧭",
                   href: "certification-navigator.html", sector: sec ? sec.id : null };
    if (!sec) return Object.assign(base, { started: false, pct: 0, rag: "idle",
      headline: "Not started", next: "Pick your sector and walk the five phases.", facts: [] });

    const checked = st.checked || {};
    let done = 0, total = 0, cDone = 0, cTotal = 0, next = null, phaseNow = null;
    JKV.phaseSpine.forEach(p => {
      (sec.items[p.id] || []).forEach((it, i) => {
        total++;
        if (it.crit) cTotal++;
        if (checked[`${sec.id}|${p.id}|${i}`]) { done++; if (it.crit) cDone++; }
        else if (!next && it.crit) { next = it.t; phaseNow = p; }
      });
    });
    const pct = total ? Math.round((done / total) * 100) : 0;
    return Object.assign(base, {
      started: done > 0,
      pct,
      rag: done === 0 ? "idle" : cDone === cTotal ? "green" : pct >= 50 ? "amber" : "red",
      headline: `${done} of ${total} requirements closed`,
      next: next ? `Phase ${phaseNow.n} · ${phaseNow.t} — ${next}` : "Every gate item is closed. Assemble the submission pack.",
      phase: phaseNow,
      facts: [
        { k: "Sector", v: sec.short },
        { k: "Gate items closed", v: `${cDone}/${cTotal}` },
        { k: "Indicative lead time", v: `${sec.leadMonths[0]}–${sec.leadMonths[1]} months` }
      ]
    });
  },

  /* ---- 2. Greenfield Venture Builder ---- */
  venture(prof, src) {
    src = src || this.liveSource();
    const st = src.get("jk_venture_v3");
    const sec = JKV.sector(st.sector || prof.sector);
    const base = { id: "venture", name: "Greenfield Venture Builder", icon: "📊",
                   href: "venture-builder.html", sector: sec ? sec.id : null };
    const touched = src.has("jk_venture_v3") && !!st.capex;
    if (!sec || !touched) return Object.assign(base, { started: false, pct: 0, rag: "idle",
      headline: "Not started", next: "Size the capital requirement and test the funding stack.", facts: [] });

    const n = k => { const v = parseFloat(st[k]); return isFinite(v) ? v : 0; };
    /* Read the saved tier, not the sector. Line COUNT and line MEANING
       both vary by tier — a medevac model carries a medical interior and
       a rotary one carries life-limited parts — so summing a saved
       state.capex against the wrong tier's lines silently mis-classifies
       capex as working capital. Falls back to the first tier for models
       saved before tiers existed, which is where their figures came from. */
    const tier = sec.capital.tiers.find(t => t.id === st.tier) || sec.capital.tiers[0];
    let capex = 0, wc = 0;
    tier.lines.forEach((l, i) => {
      const v = (st.capex || {})[i] || 0;
      if (l.cat === "wc") wc += v; else capex += v;
    });
    const total = capex + wc;
    const funded = n("f-equity") + n("f-invest") + n("f-sub") + n("f-grant") + n("f-debt");
    const gap = Math.max(0, total - funded);
    const debt = n("f-debt"), rev = n("d-rev"), margin = n("d-margin"), cov = n("d-cov") || 1.25;
    const ds = annualDebtService(debt, n("d-rate"), n("d-term"));
    const dscr = (ds > 0 && rev > 0) ? (rev * margin / 100) / ds : null;

    /* Four quarters, each a question the model has to answer before an
       investment committee will look at it: is it sized, is it funded,
       is it fully funded, and can it carry its own debt. */
    const sized   = total > 0 && st.capexSector === sec.id;
    const stacked = funded > 0;
    const closed  = total > 0 && gap === 0;
    const serviceable = debt === 0 ? rev > 0 : (dscr !== null && dscr >= cov);
    const pct = [sized, stacked, closed, serviceable].filter(Boolean).length * 25;

    let next;
    if (!sized) next = "Set the capital lines for your sector.";
    else if (!stacked) next = "Enter the funding sources to build the capital stack.";
    else if (!closed) next = `Close the ${fmtMoney(gap)} funding gap.`;
    else if (debt > 0 && !ds) next = "Set an interest rate and repayment term so debt service can be computed.";
    else if (!rev) next = "Add a steady-state revenue assumption to test debt service.";
    else if (dscr !== null && dscr < cov) next = `Base-case DSCR is ${dscr.toFixed(2)}× against a ${cov.toFixed(2)}× floor — reduce leverage or revisit the revenue case.`;
    else next = "Capital model coheres. Pressure-test the revenue assumption.";

    return Object.assign(base, {
      started: true, pct,
      rag: gap > 0 || (dscr !== null && dscr < 1) ? "red"
         : pct === 100 ? "green" : "amber",
      headline: `${fmtMoney(total)} capital requirement`,
      next,
      capital: { total, capex, wc, funded, gap, dscr, cov },
      facts: [
        { k: "Sector", v: sec.short },
        { k: "Funding gap", v: gap > 0 ? fmtMoney(gap) : "None" },
        { k: "Base-case DSCR", v: dscr === null ? "—" : fmtRatio(dscr) }
      ]
    });
  },

  /* ---- 3. Corporate Structure Designer ---- */
  structure(prof, src) {
    src = src || this.liveSource();
    const st = src.get("jk_structure_v3");
    const arch = JKV.structures.find(s => s.id === st.arch);
    const secId = st.sector || prof.sector;
    const sec = JKV.sector(secId);
    const base = { id: "structure", name: "Corporate Structure Designer", icon: "🏛️",
                   href: "corporate-structure.html", sector: secId };
    if (!arch) return Object.assign(base, { started: false, pct: 0, rag: "idle",
      headline: "Not started", next: "Choose an archetype and model the ownership chain.", facts: [] });

    const parties = lookThrough(st.holders || {});
    const entries = Object.entries(parties).map(([k, v]) => ({ n: k, total: v.direct + v.indirect, local: v.local }));
    const grand = entries.reduce((a, e) => a + e.total, 0);
    const localPct = entries.filter(e => e.local).reduce((a, e) => a + e.total, 0);
    const chainOk = Math.abs(grand - 100) <= 1;

    const list = JKV.structureChecks.filter(c => c.sectors.includes("*") || c.sectors.includes(secId));
    const done = list.filter(c => (st.checks || {})[c.id]).length;
    const pct = Math.round(30 * (chainOk ? 1 : 0) + 70 * (list.length ? done / list.length : 0));

    // The ownership-and-control test applies to the air-service licence,
    // so it is an AOC exposure — not a universal one.
    const controlRisk = secId === "aoc" && chainOk && localPct < 50;

    let next;
    if (!chainOk) next = `Chain resolves to ${grand.toFixed(1)}% — fix the tier holdings before reading anything else.`;
    else if (controlRisk) next = `Local effective interest is ${localPct.toFixed(1)}% — resolve the ownership-and-control position before incorporating.`;
    else if (done < list.length) next = `${list.length - done} of ${list.length} governance checks unaddressed.`;
    else next = "Structure and governance checks complete. Take counsel on the instruments.";

    return Object.assign(base, {
      started: true, pct,
      rag: !chainOk || controlRisk ? "red" : done === list.length ? "green" : "amber",
      headline: arch.name,
      next,
      facts: [
        { k: "Entities in chain", v: String(arch.tiers.length) },
        { k: "Local effective interest", v: chainOk ? localPct.toFixed(1) + "%" : "—" },
        { k: "Governance checks", v: `${done}/${list.length}` }
      ]
    });
  },

  /* ---- 4. Organogram & Postholder Planner ---- */
  organogram(prof, src) {
    src = src || this.liveSource();
    const st = src.get("jk_organogram_v3");
    const sec = JKV.sector(st.sector || prof.sector);
    const base = { id: "organogram", name: "Organogram & Postholder Planner", icon: "👥",
                   href: "organogram-planner.html", sector: sec ? sec.id : null };
    if (!sec) return Object.assign(base, { started: false, pct: 0, rag: "idle",
      headline: "Not started", next: "Name the posts the Authority must accept.", facts: [] });

    const people = st.people || {};
    const posts = sec.postholders.filter(p => p.kcaa);
    let named = 0, deputised = 0, spof = 0;
    sec.postholders.forEach((p, i) => {
      if (!p.kcaa) return;
      const rec = people[`${sec.id}|${i}`] || {};
      const hasN = !!String(rec.n || "").trim(), hasD = !!String(rec.dep || "").trim();
      if (hasN) named++;
      if (hasD) deputised++;
      if (hasN && !hasD) spof++;
    });
    // Mirrors the planner's own meter exactly: a post is ready when it is
    // named, and documented deputy cover counts half again.
    const denom = posts.length * 1.5;
    const pct = denom ? Math.round(((named + deputised * 0.5) / denom) * 100) : 0;

    return Object.assign(base, {
      started: named > 0 || deputised > 0,
      pct, named, deputised, spof, postsTotal: posts.length,
      rag: named === 0 ? "idle" : named < posts.length ? "red" : spof > 0 ? "amber" : "green",
      headline: `${named} of ${posts.length} accepted posts named`,
      next: named < posts.length
        ? `${posts.length - named} accepted post${posts.length - named > 1 ? "s remain" : " remains"} vacant — certification does not proceed on a vacant post.`
        : spof > 0
          ? `${spof} named post${spof > 1 ? "s have" : " has"} no documented deputy.`
          : "Every accepted post named and covered. Prepare the acceptance submissions.",
      facts: [
        { k: "Sector", v: sec.short },
        { k: "Deputies named", v: `${deputised}/${posts.length}` },
        { k: "Posts without cover", v: String(spof) }
      ]
    });
  },

  /* ---- 5. Revenue Model Builder ---- */
  revenue(prof, src) {
    src = src || this.liveSource();
    /* Revenue Builder stores under its own key — read it from the live
       localStorage rather than through the generic src.get(), because the
       key does not follow the jk_*_v3 pattern used by all other tools. */
    let st = {};
    try { st = JSON.parse(localStorage.getItem("jk_revenue_v1")) || {}; } catch {}
    const base = { id: "revenue", name: "Revenue Model Builder", icon: "💰",
                   href: "revenue-builder.html", sector: null };
    const touched = Array.isArray(st.segments) && st.segments.length > 0;
    if (!touched) return Object.assign(base, { started: false, pct: 0, rag: "idle",
      headline: "Not started", next: "Add revenue segments to test whether the fleet can service its capital.", facts: [] });

    /* Compute year-1 revenue from the saved segments without re-importing
       the full Revenue Builder module — use the same arithmetic but
       inlined here so venture-file.js stays self-contained. */
    let yr1Rev = 0, yr1Doc = 0;
    (st.segments || []).forEach(seg => {
      yr1Rev += (seg.rate || 0) * (seg.hours || 0);
      yr1Doc  += (seg.doc  || 0) * (seg.hours || 0);
    });
    const yr1Contrib = yr1Rev - yr1Doc;
    const tenYrContrib = yr1Contrib * 10; // simplified: no growth assumed here

    /* If the Revenue Builder wrote a CST summary to the profile, use it
       for the capital recovery test. */
    const profile = this.read(this.PROFILE_KEY);
    const revSaved = profile.revenue || {};
    const capRecovery = revSaved.capRecovery || 0;
    const ratio = capRecovery > 0 ? (revSaved.tenYrContrib || tenYrContrib) / capRecovery : null;

    const rag = ratio === null ? (yr1Rev > 0 ? "amber" : "idle")
              : ratio >= 0.8 ? "green" : ratio >= 0.5 ? "amber" : "red";
    const pct = Math.min(100, touched ? (yr1Rev > 0 ? (ratio !== null ? Math.round(ratio * 100) : 50) : 10) : 0);

    let next;
    if (!touched) next = "Add revenue segments to test capital serviceability.";
    else if (ratio !== null && ratio < 0.5) next = `Fleet covers ${(ratio * 100).toFixed(0)}% of capital recovery requirement — ${(1 / ratio).toFixed(1)}× shortfall. Review fleet size or capital structure.`;
    else if (ratio !== null && ratio < 0.8) next = `Fleet covers ${(ratio * 100).toFixed(0)}% of capital recovery. Contracted anchor demand or a lease structure is recommended.`;
    else if (ratio !== null) next = "Fleet can service its capital at projected utilisation.";
    else next = "Save to Venture File from the Revenue Builder to run the capital service test.";

    return Object.assign(base, {
      started: true, pct, rag,
      headline: yr1Rev > 0 ? `${fmtMoney(yr1Rev)}/year revenue, ${st.segments.length} segment${st.segments.length !== 1 ? "s" : ""}` : "Segments added — set rates and hours",
      next,
      facts: [
        { k: "Yr 1 revenue",    v: fmtMoney(yr1Rev) },
        { k: "Yr 1 contribution", v: fmtMoney(yr1Contrib) },
        { k: "Capital coverage", v: ratio !== null ? `${(ratio * 100).toFixed(0)}%` : "—" }
      ]
    });
  },

  /* ---- the operating-track scorecard, if the visitor has one ---- */
  scorecard() {
    const answers = (typeof loadAnswers === "function") ? loadAnswers() : {};
    const filled = JK.domains.some(d => (answers[d.id] || []).some(v => Number.isInteger(v)));
    if (!filled) return null;
    const s = computeScores(answers);
    /* How much of it was actually answered. computeScores divides each
       domain by the questions ANSWERED, not the questions asked, so a
       domain with one good answer reads 100% and carries its full
       weight. That is a reasonable rule for a finished scorecard and a
       misleading one for a partial, which is why results.html refuses
       to render a report until all forty are in. Consumers of this
       summary need the same ability to refuse. */
    const total = JK.domains.reduce((n, d) => n + d.questions.length, 0);
    const answered = JK.domains.reduce(
      (n, d) => n + (answers[d.id] || []).filter(v => Number.isInteger(v)).length, 0);
    return {
      index: s.index,
      answeredAll: s.answeredAll,
      answered,
      total,
      verdict: indexVerdict(s.index)
    };
  },

  /* ---------- the whole picture ---------- */
  modules(prof, src) {
    prof = prof || this.profile();
    src = src || this.liveSource();
    return [this.certnav(prof, src), this.venture(prof, src),
            this.organogram(prof, src), this.structure(prof, src),
            this.revenue(prof, src)];
  },

  /* Weighted composite. Untouched modules count as zero rather than
     being excluded: a venture with a perfect certification plan and no
     capital model is not 100% ready, and averaging over "what has been
     started" would tell it that it is. */
  readiness(mods) {
    const w = this.WEIGHTS;
    let sum = 0, wsum = 0;
    mods.forEach(m => { const k = w[m.id] || 0; sum += m.pct * k; wsum += k; });
    const idx = wsum ? Math.round(sum / wsum) : 0;
    const band =
      idx < 25 ? { t: "Concept", d: "The venture exists on paper. Establish the regulatory pathway and size the capital before committing to a date." } :
      idx < 50 ? { t: "In formation", d: "Real work is under way, but the gaps are still structural. Close the critical-path items before the Schedule of Events is agreed." } :
      idx < 75 ? { t: "Advancing", d: "The shape of a fundable, certifiable venture. What remains is evidence — named people, closed findings, committed capital." } :
      idx < 95 ? { t: "Submission-ready", d: "Approaching a defensible application. Complete the residual items and prepare for document evaluation." } :
                 { t: "Application complete", d: "Every module answered. The remaining risk is execution against the Schedule of Events, not preparation." };
    return { index: idx, band };
  },

  /* ---------- critical-path schedule ----------
     Back-schedules the five phases from a target certificate date using
     the sector's indicative lead band. Two lines are drawn: the
     optimistic band (everything lands first time) and the realistic one.
     The realistic start date is the number that matters, because it is
     usually already in the past. */
  timeline(prof, mods) {
    const sec = JKV.sector(prof.sector);
    if (!sec || !prof.target) return null;
    const target = new Date(prof.target + "T00:00:00");
    if (isNaN(target.getTime())) return null;

    const [lo, hi] = sec.leadMonths;
    const shift = (d, months) => {
      const x = new Date(d.getTime());
      const day = x.getDate();
      x.setDate(1);
      x.setMonth(x.getMonth() + months);
      // clamp to the last valid day of the landing month rather than
      // rolling into the next one (31 Jan − 1 month must not be 3 March)
      x.setDate(Math.min(day, new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate()));
      return x;
    };
    const startLo = shift(target, -lo);
    const startHi = shift(target, -hi);

    // walk the phases forward from the realistic start
    let cursor = new Date(startHi.getTime());
    let acc = 0;
    const cert = mods.find(m => m.id === "certnav");
    const activePhase = cert && cert.phase ? cert.phase.id : (cert && cert.started ? "cert" : "pre");
    const phases = JKV.phaseSpine.map(p => {
      const months = hi * (this.PHASE_SHARE[p.id] || 0.2);
      acc += months;
      const from = new Date(cursor.getTime());
      const to = shift(startHi, Math.round(acc));
      cursor = new Date(to.getTime());
      return { id: p.id, n: p.n, t: p.t, from, to, months,
               share: (this.PHASE_SHARE[p.id] || 0.2) * 100,
               active: p.id === activePhase };
    });

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthsToTarget = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());
    return {
      target, startLo, startHi, lo, hi, phases,
      monthsToTarget,
      late: startHi < today,
      tight: startHi >= today && startLo < today,
      slipMonths: startHi < today ? (today.getFullYear() - startHi.getFullYear()) * 12 + (today.getMonth() - startHi.getMonth()) : 0
    };
  },

  /* ============================================================
     SCENARIOS

     Every tool holds exactly one model, so answering "what if we lease
     three instead of two" meant destroying the answer you already had.
     A scenario is a named, timestamped copy of the whole workspace —
     every store, plus the profile — that can be compared against the
     live one and restored over it.

     Because the readers take a source, a saved scenario is summarised
     by the same code that summarises the live workspace. There is no
     second scoring path to drift from the first.
     ============================================================ */

  scenarios() {
    const raw = this.read(this.SCEN_KEY);
    const list = Array.isArray(raw.list) ? raw.list : [];
    // newest first, and defensive about anything hand-edited or imported
    return list.filter(s => s && s.id && s.stores)
               .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  },

  writeScenarios(list) {
    try {
      localStorage.setItem(this.SCEN_KEY, JSON.stringify({ list }));
      return { ok: true };
    } catch (e) {
      // A full quota is the one failure a visitor can actually act on,
      // so it is reported rather than swallowed like the other writes.
      return { ok: false, error: "There is no room left in this browser's storage. Delete a scenario and try again." };
    }
  },

  /* Capture the live workspace. The scenario store is deliberately
     excluded from what gets captured — a scenario containing every
     previous scenario would double in size on each save until the
     quota died. */
  captureStores() {
    const stores = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!this.KEY_RE.test(k) || k === this.SCEN_KEY) continue;
        try { stores[k] = JSON.parse(localStorage.getItem(k)); } catch { /* skip non-JSON flags */ }
      }
    } catch {}
    return stores;
  },

  saveScenario(name, nowIso) {
    const list = this.scenarios();
    if (list.length >= this.MAX_SCENARIOS) {
      return { ok: false, error: `You can keep ${this.MAX_SCENARIOS} scenarios. Delete one to save another.` };
    }
    const clean = String(name || "").trim().slice(0, 60) || "Untitled scenario";
    const scn = {
      // Date.now() alone collided when two saves landed in the same
      // millisecond during testing; the suffix makes the id unique.
      id: "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name: clean,
      savedAt: nowIso || new Date().toISOString(),
      profile: this.profile(),
      stores: this.captureStores()
    };
    const res = this.writeScenarios([scn].concat(list));
    return res.ok ? { ok: true, scenario: scn } : res;
  },

  deleteScenario(id) {
    return this.writeScenarios(this.scenarios().filter(s => s.id !== id));
  },

  renameScenario(id, name) {
    const list = this.scenarios().map(s =>
      s.id === id ? Object.assign({}, s, { name: String(name || "").trim().slice(0, 60) || s.name }) : s);
    return this.writeScenarios(list);
  },

  /* Restoring overwrites the live workspace, which is destructive — so
     the caller is expected to confirm, and the scenario store itself is
     never touched, meaning the scenario you restored from survives and
     you can still get back. */
  restoreScenario(id) {
    const scn = this.scenarios().find(s => s.id === id);
    if (!scn) return { ok: false, error: "That scenario no longer exists." };
    let written = 0, failed = 0, notCleared = 0;
    try {
      // clear the current workspace first, or stores present now but
      // absent from the scenario would survive and blend the two
      const stale = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (this.KEY_RE.test(k) && k !== this.SCEN_KEY) stale.push(k);
      }
      /* A key that refuses to clear is worse than one that refuses to
         write: the old value survives and blends into the restored
         scenario, so the workspace ends up as neither. Counted, and
         reported below, rather than left to be discovered in the
         numbers. */
      stale.forEach(k => { if (!reportingWrite(() => localStorage.removeItem(k))) notCleared++; });
      Object.keys(scn.stores || {}).forEach(k => {
        if (!this.KEY_RE.test(k) || k === this.SCEN_KEY) return;
        if (reportingWrite(() => localStorage.setItem(k, JSON.stringify(scn.stores[k])))) written++;
        else failed++;
      });
    } catch { return { ok: false, error: "Could not write to this browser's storage." }; }
    if (failed || notCleared) {
      return { ok: false, written, scenario: scn,
        error: `Only ${written} of ${written + failed} parts of that scenario could be restored` +
               (notCleared ? ", and some of the previous workspace could not be cleared" : "") +
               ". The workspace is now a mix of the two — reload and try again, or clear this browser's storage for the site." };
    }
    return { ok: true, written, scenario: scn };
  },

  /* An ISO date is a storage format, not a reading format — "2028-04-01"
     sitting in a column beside "USD 6.66M" reads as machine output. */
  fmtTarget(iso) {
    if (!iso) return "—";
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  },

  /* One row of comparable figures, from a source. Used for both the
     live workspace and every saved scenario, so the columns are
     guaranteed to mean the same thing. */
  summarise(prof, src) {
    const mods = this.modules(prof, src);
    const r = this.readiness(mods);
    const ven = mods.find(m => m.id === "venture");
    const org = mods.find(m => m.id === "organogram");
    const str = mods.find(m => m.id === "structure");
    const cert = mods.find(m => m.id === "certnav");
    const rev = mods.find(m => m.id === "revenue");
    const gate = cert.facts.find(f => f.k === "Gate items closed");
    const local = str.facts.find(f => f.k === "Local effective interest");
    const checks = str.facts.find(f => f.k === "Governance checks");
    const revCoverage = rev && rev.facts.find(f => f.k === "Capital coverage");
    return {
      profile: prof, modules: mods, readiness: r,
      rows: {
        index:    { label: "Launch Readiness Index", v: String(r.index), rag: r.index >= 75 ? "green" : r.index >= 45 ? "amber" : "red" },
        band:     { label: "Band", v: r.band.t },
        sector:   { label: "Sector", v: (JKV.sector(prof.sector) || {}).short || "—" },
        target:   { label: "Target certificate date", v: this.fmtTarget(prof.target) },
        certnav:  { label: "Certification", v: cert.started ? cert.pct + "%" : "—" },
        gate:     { label: "Gate items closed", v: gate ? gate.v : "—" },
        capital:  { label: "Capital requirement", v: ven.capital ? fmtMoney(ven.capital.total) : "—" },
        gap:      { label: "Funding gap", v: ven.capital ? (ven.capital.gap > 0 ? fmtMoney(ven.capital.gap) : "None") : "—",
                    rag: ven.capital ? (ven.capital.gap > 0 ? "red" : "green") : null },
        dscr:     { label: "Base-case DSCR", v: ven.capital && ven.capital.dscr !== null ? fmtRatio(ven.capital.dscr) : "—",
                    rag: ven.capital && ven.capital.dscr !== null
                         ? (ven.capital.dscr >= ven.capital.cov ? "green" : ven.capital.dscr >= 1 ? "amber" : "red") : null },
        posts:    { label: "Accepted posts named", v: org.postsTotal ? `${org.named}/${org.postsTotal}` : "—" },
        spof:     { label: "Posts without cover", v: org.postsTotal ? String(org.spof) : "—",
                    rag: org.postsTotal ? (org.spof === 0 ? "green" : "amber") : null },
        arch:     { label: "Structure", v: str.started ? str.headline : "—" },
        local:    { label: "Local effective interest", v: local ? local.v : "—" },
        checks:   { label: "Governance checks", v: checks ? checks.v : "—" },
        revenue:  { label: "Revenue readiness", v: rev && rev.started ? rev.headline : "—",
                    rag: rev ? rev.rag : null },
        revcov:   { label: "Capital coverage", v: revCoverage ? revCoverage.v : "—",
                    rag: (revCoverage && revCoverage.v !== "—") ? (parseFloat(revCoverage.v) >= 80 ? "green" : parseFloat(revCoverage.v) >= 50 ? "amber" : "red") : null }
      }
    };
  },

  /* ============================================================
     WORKSPACE PORTABILITY
     The site has no account, which is the point — but "no account"
     must not mean "one cleared browser from losing months of work",
     and a venture is a team sport. Export writes the whole workspace
     to a file the visitor saves; import reads one back. Neither
     touches the network.
     ============================================================ */

  exportObject() {
    const stores = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!this.KEY_RE.test(k)) continue;
        const raw = localStorage.getItem(k);
        // Keep the file readable: store parsed JSON where the value is
        // JSON, and the raw string where it is a plain flag.
        try { stores[k] = JSON.parse(raw); } catch { stores[k] = raw; }
      }
    } catch {}
    const prof = this.profile();
    return {
      _type: "jk-venture-file",
      _version: 1,
      _note: "JK & Associates venture workspace. Contains only what you typed into the tools on this device.",
      exportedAt: new Date().toISOString(),
      profile: prof,
      stores
    };
  },

  filename() {
    const prof = this.profile();
    const slug = (prof.name || "venture").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "venture";
    return `jk-${slug}-${new Date().toISOString().slice(0, 10)}.json`;
  },

  download() {
    const blob = new Blob([JSON.stringify(this.exportObject(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = this.filename();
    document.body.appendChild(a); a.click(); a.remove();
    // Revoking immediately can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  },

  /* Import is the one place untrusted data enters the workspace, so it
     is validated rather than trusted: the envelope must be ours, every
     key must match the platform's own namespace, and every value must
     be plain JSON data. Anything else is skipped and counted, so the
     visitor is told what was ignored instead of silently losing it. */
  importObject(obj) {
    if (!obj || obj._type !== "jk-venture-file") {
      return { ok: false, error: "That file is not a JK venture workspace." };
    }
    const stores = obj.stores;
    if (!stores || typeof stores !== "object" || Array.isArray(stores)) {
      return { ok: false, error: "The file has no workspace data in it." };
    }
    let written = 0, skipped = 0;
    Object.keys(stores).forEach(k => {
      if (!this.KEY_RE.test(k)) { skipped++; return; }
      const v = stores[k];
      const t = typeof v;
      if (v === null || (t !== "object" && t !== "string" && t !== "number" && t !== "boolean")) { skipped++; return; }
      try {
        localStorage.setItem(k, t === "string" ? v : JSON.stringify(v));
        written++;
      } catch { skipped++; }
    });
    if (!written) return { ok: false, error: "Nothing in that file could be restored." };
    return { ok: true, written, skipped };
  }
};

if (typeof window !== "undefined") window.JKW = JKW;
if (typeof module !== "undefined" && module.exports) module.exports = { JKW };
