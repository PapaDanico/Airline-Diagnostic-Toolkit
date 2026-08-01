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
     next, because certification burns cash on a fixed clock. */
  WEIGHTS: { certnav: 40, venture: 25, organogram: 20, structure: 15 },

  /* ---------- raw store access (never throws) ---------- */
  read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; }
  },
  exists(key) {
    try { return localStorage.getItem(key) !== null; } catch { return false; }
  },

  /* ---------- the venture profile ---------- */
  profile() {
    const p = this.read(this.PROFILE_KEY);
    return { name: p.name || "", sector: p.sector || "aoc", target: p.target || "", updated: p.updated || "" };
  },
  saveProfile(patch) {
    const next = Object.assign(this.profile(), patch, { updated: new Date().toISOString() });
    try { localStorage.setItem(this.PROFILE_KEY, JSON.stringify(next)); } catch {}
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
  certnav(prof) {
    const st = this.read("jk_certnav_v3");
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
  venture(prof) {
    const st = this.read("jk_venture_v3");
    const sec = JKV.sector(st.sector || prof.sector);
    const base = { id: "venture", name: "Greenfield Venture Builder", icon: "📊",
                   href: "venture-builder.html", sector: sec ? sec.id : null };
    const touched = this.exists("jk_venture_v3") && !!st.capex;
    if (!sec || !touched) return Object.assign(base, { started: false, pct: 0, rag: "idle",
      headline: "Not started", next: "Size the capital requirement and test the funding stack.", facts: [] });

    const n = k => { const v = parseFloat(st[k]); return isFinite(v) ? v : 0; };
    let capex = 0, wc = 0;
    sec.capital.lines.forEach((l, i) => {
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
  structure(prof) {
    const st = this.read("jk_structure_v3");
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
  organogram(prof) {
    const st = this.read("jk_organogram_v3");
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

  /* ---- the operating-track scorecard, if the visitor has one ---- */
  scorecard() {
    const answers = (typeof loadAnswers === "function") ? loadAnswers() : {};
    const filled = JK.domains.some(d => (answers[d.id] || []).some(v => Number.isInteger(v)));
    if (!filled) return null;
    const s = computeScores(answers);
    return { index: s.index, answeredAll: s.answeredAll, verdict: indexVerdict(s.index) };
  },

  /* ---------- the whole picture ---------- */
  modules(prof) {
    prof = prof || this.profile();
    return [this.certnav(prof), this.venture(prof), this.organogram(prof), this.structure(prof)];
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
