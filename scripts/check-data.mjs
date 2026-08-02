/* Data-integrity check for the JK & Associates platform data models.
   Run by CI and locally: `node scripts/check-data.mjs`.

   Covers two models:
     1. data.js          — the operating-carrier Health Scorecard
     2. data-ventures.js — the greenfield sectors, KCAA certification
                           pathways, capital models and citations
     3. data-glossary.js — the term corpus behind /glossary.html

   The venture checks matter more than they look: a broken citation key
   renders an empty chip, and a sector missing a phase renders an empty
   gate — both fail silently in the browser. */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const load = (file, name) => {
  const src = readFileSync(new URL(`../assets/js/${file}`, import.meta.url), "utf8");
  return new Function(`${src}; return ${name};`)();
};

const JK  = load("data.js", "JK");
const JKV = load("data-ventures.js", "JKV");
const JKG = load("data-glossary.js", "JKG");

let failures = 0;
const fail = (m) => { console.error("FAIL: " + m); failures++; process.exitCode = 1; };

/* ---------- 1. scorecard model ---------- */
if (!Array.isArray(JK.domains) || JK.domains.length !== 8)
  fail(`expected 8 domains, got ${JK.domains?.length}`);

let weight = 0, questions = 0;
for (const d of JK.domains) {
  weight += d.weight;
  questions += d.questions.length;
  if (d.questions.length !== 5) fail(`${d.id}: ${d.questions.length} questions (expected 5)`);
  d.questions.forEach((q, i) => {
    if (!Array.isArray(q.o) || q.o.length !== 5) fail(`${d.id} q${i}: option count ${q.o?.length} (expected 5)`);
  });
}
if (weight !== 100) fail(`domain weights sum to ${weight} (expected 100)`);
if (questions !== 40) fail(`total questions ${questions} (expected 40)`);

/* ---------- 1b. benchmark provenance ----------

   A domain benchmark is the only thing on the results page that tells an
   operator whether 62% is good. That makes it a claim about the industry,
   and a claim about the industry needs to say who made it and when.

   Two different problems, handled two different ways:

   Structure is a failure. A benchmark with no source, or a source with no
   date, is a sentence the reader cannot check — it reads as authority
   without being accountable to anything. That must not reach the browser,
   so it stops the build.

   Age is a warning. Aviation benchmarks are annual: AFRAA publishes each
   Q4, IATA each mid-year. A figure two cycles old is not wrong, it is
   superseded — and fixing it means going and reading the newer report,
   which is research, not a code change. Failing CI for it would only
   block work unrelated to the stale number. So it is reported loudly and
   left for someone to act on.

   The unattributed sources ("Industry planning target", "Industry range")
   are the same category of problem one step further along: they have no
   date because there is no publication to date them to. They are named
   here rather than quietly deleted, because a benchmark an operator has
   been reading for months should not vanish without someone deciding it
   should. */
const BENCHMARK_MAX_AGE_DAYS = 730; // two annual publication cycles
const UNATTRIBUTED = /^Industry (planning target|range)$/;
{
  const before = failures;
  let dated = 0;
  const stale = [], undatable = [];
  for (const d of JK.domains) {
    if (!d.benchmark) continue;
    if (!d.benchmarkSrc) { fail(`${d.id}: benchmark with no source`); continue; }
    if (!("benchmarkAsOf" in d)) {
      fail(`${d.id}: benchmark source "${d.benchmarkSrc}" carries no benchmarkAsOf — set a date, or null if it names no publication`);
      continue;
    }
    if (d.benchmarkAsOf === null) {
      if (!UNATTRIBUTED.test(d.benchmarkSrc)) {
        fail(`${d.id}: source "${d.benchmarkSrc}" names a publication but has no date`);
      } else {
        undatable.push(d.id);
      }
      continue;
    }
    const age = Math.floor((Date.now() - new Date(d.benchmarkAsOf).getTime()) / 86400000);
    if (Number.isNaN(age)) { fail(`${d.id}: unreadable benchmarkAsOf "${d.benchmarkAsOf}"`); continue; }
    if (age < 0) { fail(`${d.id}: benchmarkAsOf "${d.benchmarkAsOf}" is in the future`); continue; }
    dated += 1;
    if (age > BENCHMARK_MAX_AGE_DAYS) stale.push(`${d.id} (${d.benchmarkSrc}, ${age}d)`);
  }
  if (failures === before) {
    console.log(`benchmarks OK — ${dated} dated to a named publication, ${undatable.length} unattributed`);
    if (undatable.length)
      console.log(`         note: ${undatable.length} benchmark(s) cite no publication and cannot be dated: ${undatable.join(", ")}`);
    if (stale.length)
      console.log(`         WARN: ${stale.length} benchmark(s) older than ${BENCHMARK_MAX_AGE_DAYS} days — a newer edition has been published: ${stale.join(", ")}`);
  }
}

/* brand strings must not carry the retired identity */
const brandBlob = JSON.stringify(JK.brand);
if (/DN Consultancy/.test(brandBlob)) fail("brand block still references the retired DN Consultancy identity");
if (!JK.brand.name || !JK.brand.email) fail("brand block missing name or email");

/* ---------- 2. venture model ---------- */
if (!Array.isArray(JKV.phaseSpine) || JKV.phaseSpine.length !== 5)
  fail(`expected 5 certification phases, got ${JKV.phaseSpine?.length}`);

if (!Array.isArray(JKV.sectors) || JKV.sectors.length < 5)
  fail(`expected at least 5 sectors, got ${JKV.sectors?.length}`);

const seenSectorIds = new Set();
for (const s of JKV.sectors) {
  if (seenSectorIds.has(s.id)) fail(`duplicate sector id "${s.id}"`);
  seenSectorIds.add(s.id);

  for (const key of ["name", "short", "blurb", "regLine"]) {
    if (!s[key]) fail(`${s.id}: missing "${key}"`);
  }

  // every phase must carry at least one item, or the gate renders empty
  for (const p of JKV.phaseSpine) {
    const items = s.items?.[p.id];
    if (!Array.isArray(items) || items.length === 0) {
      fail(`${s.id}: phase "${p.id}" has no items`);
      continue;
    }
    items.forEach((it, i) => {
      if (!it.t) fail(`${s.id}/${p.id}[${i}]: missing title`);
      if (!it.d) fail(`${s.id}/${p.id}[${i}]: missing detail`);
      for (const key of (it.c || [])) {
        if (!JKV.cites[key]) fail(`${s.id}/${p.id}[${i}]: unknown citation key "${key}"`);
      }
    });
    // each phase should have at least one critical-path item, else the
    // readiness meter cannot distinguish a gate from a nice-to-have
    if (!items.some(i => i.crit)) fail(`${s.id}: phase "${p.id}" has no critical-path item`);
  }

  // postholders
  if (!Array.isArray(s.postholders) || !s.postholders.length) fail(`${s.id}: no postholders defined`);
  if (!s.postholders.some(p => p.kcaa)) fail(`${s.id}: no regulator-accepted postholder flagged`);

  // capital model
  if (!s.capital?.lines?.length) fail(`${s.id}: no capital lines`);
  for (const l of (s.capital?.lines || [])) {
    if (!(l.lo >= 0) || !(l.hi >= 0)) fail(`${s.id}: capital line "${l.k}" has non-numeric bounds`);
    if (l.hi < l.lo) fail(`${s.id}: capital line "${l.k}" has hi < lo`);
    if (!["capex", "wc"].includes(l.cat)) fail(`${s.id}: capital line "${l.k}" has unknown cat "${l.cat}"`);
  }

  // sector-level citations must resolve
  for (const key of (s.cites || [])) {
    if (!JKV.cites[key]) fail(`${s.id}: unknown sector citation key "${key}"`);
  }

  // lead time
  if (!Array.isArray(s.leadMonths) || s.leadMonths.length !== 2 || s.leadMonths[1] < s.leadMonths[0])
    fail(`${s.id}: leadMonths must be [lo, hi] with hi >= lo`);

  // headcount ramp must exist and increase
  const hc = JKV.headcount?.[s.id];
  if (!hc) fail(`${s.id}: no headcount ramp`);
  else if (!(hc.launch <= hc.y3 && hc.y3 <= hc.y5)) fail(`${s.id}: headcount ramp is not monotonic`);
}

/* every citation must carry a status and a reference */
for (const [k, c] of Object.entries(JKV.cites)) {
  if (!["verified", "unconfirmed"].includes(c.s)) fail(`citation "${k}": status must be verified|unconfirmed, got "${c.s}"`);
  if (!c.ref || !c.long) fail(`citation "${k}": missing ref or long form`);
}

/* structures */
if (!JKV.structures?.length) fail("no corporate structure templates");
for (const st of (JKV.structures || [])) {
  if (!st.tiers?.length) fail(`structure "${st.id}": no tiers`);
}

/* ---------- 3. glossary ----------
   A "see also" pointing at a term that does not exist renders as a dead
   chip, and a term filed under an unknown category disappears from the
   page entirely — both fail silently in the browser, which is exactly
   the class of defect this script exists to catch. */
const gCats = new Set((JKG.cats || []).map(c => c.id));
if (!JKG.terms?.length) fail("glossary: no terms");
const seen = new Set();
for (const t of (JKG.terms || [])) {
  if (!t.t) { fail("glossary: a term has no name"); continue; }
  if (seen.has(t.t)) fail(`glossary "${t.t}": duplicate term`);
  seen.add(t.t);
  if (!gCats.has(t.cat)) fail(`glossary "${t.t}": unknown category "${t.cat}"`);
  if (!t.d || t.d.length < 40) fail(`glossary "${t.t}": definition missing or too thin`);
  if (t.cite && !JKV.cites[t.cite]) fail(`glossary "${t.t}": citation key "${t.cite}" does not resolve`);
}
for (const t of (JKG.terms || [])) {
  for (const ref of (t.see || [])) {
    if (!seen.has(ref)) fail(`glossary "${t.t}": see-also "${ref}" is not a term`);
  }
}
for (const c of (JKG.cats || [])) {
  if (!JKG.terms.some(t => t.cat === c.id)) fail(`glossary category "${c.id}": no terms filed under it`);
}

/* The committed glossary markup must match the data model — see
   scripts/build-glossary.mjs for why the page is pre-rendered at all.

   This delegates to that script rather than re-implementing a weaker
   version of its comparison. A term-count check would have missed the
   failure that actually happened: a citation chip embedded in the
   generated HTML went stale when the citation registry changed, and the
   count never moved. Running the real generator in --check mode is the
   only comparison that catches content drift, and putting it here means
   the one command anyone runs before pushing catches it. */
{
  const r = spawnSync(process.execPath,
    [fileURLToPath(new URL("build-glossary.mjs", import.meta.url)), "--check"],
    { encoding: "utf8" });
  if (r.status !== 0) {
    fail("glossary.html is out of date with the data model — run: node scripts/build-glossary.mjs");
    if (r.stderr) process.stderr.write(r.stderr);
  }
}

/* ---------- report ---------- */
if (!failures) {
  const totalItems = JKV.sectors.reduce((n, s) => n + JKV.totalItems(s), 0);
  const unconfirmed = Object.entries(JKV.cites).filter(([, c]) => c.s !== "verified").map(([k]) => k);
  console.log(`data OK — scorecard: 8 domains, weights = 100, 40 questions, all scales 5-point`);
  console.log(`         ventures: ${JKV.sectors.length} sectors, 5 phases, ${totalItems} checklist items, ` +
              `${Object.keys(JKV.cites).length} citations`);
  console.log(`         glossary: ${JKG.terms.length} terms across ${JKG.cats.length} categories, all cross-references resolve`);
  if (unconfirmed.length) {
    console.log(`         note: ${unconfirmed.length} citation(s) flagged unconfirmed and rendered with a "?" chip: ${unconfirmed.join(", ")}`);
  }
}
