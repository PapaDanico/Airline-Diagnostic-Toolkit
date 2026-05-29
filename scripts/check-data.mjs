/* Data-integrity check for the Airline Health Scorecard model.
   Run by CI and locally: `node scripts/check-data.mjs`. */
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../assets/js/data.js", import.meta.url), "utf8");
// data.js is a plain script that defines `const DN = {...}` and guards a
// window assignment; evaluate it in a function scope and return DN.
const DN = new Function(`${src}; return DN;`)();

const fail = (m) => { console.error("FAIL: " + m); process.exitCode = 1; };

if (!Array.isArray(DN.domains) || DN.domains.length !== 8)
  fail(`expected 8 domains, got ${DN.domains?.length}`);

let weight = 0, questions = 0;
for (const d of DN.domains) {
  weight += d.weight;
  questions += d.questions.length;
  if (d.questions.length !== 5) fail(`${d.id}: ${d.questions.length} questions (expected 5)`);
  d.questions.forEach((q, i) => {
    if (!Array.isArray(q.o) || q.o.length !== 5) fail(`${d.id} q${i}: option count ${q.o?.length} (expected 5)`);
  });
}
if (weight !== 100) fail(`domain weights sum to ${weight} (expected 100)`);
if (questions !== 40) fail(`total questions ${questions} (expected 40)`);

if (!process.exitCode) console.log("data OK — 8 domains, weights = 100, 40 questions, all scales 5-point");
