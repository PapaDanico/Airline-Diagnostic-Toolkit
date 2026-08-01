/* Data-integrity check for the JK & Associates platform data models.
   Run by CI and locally: `node scripts/check-data.mjs`.

   Covers two models:
     1. data.js          — the operating-carrier Health Scorecard
     2. data-ventures.js — the greenfield sectors, KCAA certification
                           pathways, capital models and citations

   The venture checks matter more than they look: a broken citation key
   renders an empty chip, and a sector missing a phase renders an empty
   gate — both fail silently in the browser. */
import { readFileSync } from "node:fs";

const load = (file, name) => {
  const src = readFileSync(new URL(`../assets/js/${file}`, import.meta.url), "utf8");
  return new Function(`${src}; return ${name};`)();
};

const JK  = load("data.js", "JK");
const JKV = load("data-ventures.js", "JKV");

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

/* ---------- report ---------- */
if (!failures) {
  const totalItems = JKV.sectors.reduce((n, s) => n + JKV.totalItems(s), 0);
  const unconfirmed = Object.entries(JKV.cites).filter(([, c]) => c.s !== "verified").map(([k]) => k);
  console.log(`data OK — scorecard: 8 domains, weights = 100, 40 questions, all scales 5-point`);
  console.log(`         ventures: ${JKV.sectors.length} sectors, 5 phases, ${totalItems} checklist items, ` +
              `${Object.keys(JKV.cites).length} citations`);
  if (unconfirmed.length) {
    console.log(`         note: ${unconfirmed.length} citation(s) flagged unconfirmed and rendered with a "?" chip: ${unconfirmed.join(", ")}`);
  }
}
