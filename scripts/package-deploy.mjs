#!/usr/bin/env node
/* Build the deployable artifact for a direct Netlify deploy.
 *
 * Deployment policy is direct-to-Netlify: the artifact is uploaded to
 * Netlify by hand rather than built by Netlify from a git push. That
 * removes the pull request from the path to production, and with it the
 * CI run that used to be the last thing standing between a broken tree
 * and jkassociates.enterprises. Two AI-copilot pull requests were merged
 * with that suite red, and everything they broke reached production.
 *
 * So the gate moves here. This script runs the full suite first and
 * writes no zip unless every suite passes. Refusing to produce the
 * artifact is the point — there is nothing to upload after a failure,
 * so a red tree cannot be deployed by reflex or in a hurry.
 *
 *   node scripts/package-deploy.mjs            # verify, then package
 *   node scripts/package-deploy.mjs --skip-tests   # package only, see below
 *
 * --skip-tests exists for the case where the suite was just run by hand
 * and re-running it costs ten minutes for no new information. It prints
 * a warning and stamps the artifact as unverified. Do not make it the
 * habit; it is the exception that has to be argued for each time.
 */

import { execSync, execFileSync } from "node:child_process";
import { mkdirSync, existsSync, rmSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const skipTests = process.argv.includes("--skip-tests");

const run = (cmd, opts = {}) =>
  execSync(cmd, { cwd: ROOT, stdio: "pipe", encoding: "utf8", ...opts });

function die(msg, detail) {
  console.error(`\n❌  ${msg}`);
  if (detail) console.error(detail.split("\n").slice(-25).join("\n"));
  console.error("\nNo artifact was written.\n");
  process.exit(1);
}

/* ---- 1. The tree must be a known commit -------------------------------
   A zip built from a dirty tree cannot be traced back to anything. If
   production later disagrees with the repository, the only way to find
   out what actually shipped is to have shipped a commit. */
const dirty = run("git status --porcelain").trim();
if (dirty) {
  die("Working tree is not clean — commit or stash first.",
      dirty.split("\n").map(l => `      ${l}`).join("\n"));
}

const sha = run("git rev-parse --short HEAD").trim();
const branch = run("git rev-parse --abbrev-ref HEAD").trim();
const subject = run("git log -1 --pretty=%s").trim();

/* ---- 2. The gate ------------------------------------------------------
   The same suites CI ran, in the same order, plus the manifest check
   that asserts the published verification figures came from this run. */
const SUITES = [
  ["JS syntax", 'find assets/js scripts tests -name node_modules -prune -o \\( -name "*.js" -o -name "*.mjs" \\) -print -exec node --check {} \\;'],
  ["manifest.json", 'node -e "const m=JSON.parse(require(\'fs\').readFileSync(\'manifest.json\',\'utf8\')); if(!Array.isArray(m.icons)||!m.icons.length) throw new Error(\'manifest declares no icons\')"'],
  ["data model", "node scripts/check-data.mjs"],
  ["glossary in sync", "node scripts/build-glossary.mjs --check"],
  ["e2e", "node tests/e2e.mjs"],
  ["audit", "node tests/audit.mjs"],
  ["csp", "node tests/csp.mjs"],
  ["focus", "node tests/focus.mjs"],
  ["offline", "node tests/offline.mjs"],
  ["drive", "node tests/drive.mjs"],
  ["storage", "node tests/storage.mjs"],
  ["verification manifest", "node scripts/build-verification.mjs --check"]
];

if (skipTests) {
  console.log("\n⚠️  --skip-tests: the suite was NOT run. This artifact is unverified.\n");
} else {
  if (!existsSync(join(ROOT, "tests", "node_modules"))) {
    die("Test toolchain is not installed — run `cd tests && npm install` first.");
  }
  console.log(`\nVerifying ${sha} before packaging\n${"─".repeat(52)}`);
  for (const [name, cmd] of SUITES) {
    process.stdout.write(`  ${name.padEnd(24)}`);
    try {
      run(cmd, { shell: "/bin/bash" });
      console.log("PASS");
    } catch (e) {
      console.log("FAIL");
      die(`${name} failed — this tree is not deployable.`,
          (e.stdout || "") + (e.stderr || ""));
    }
  }
  console.log(`${"─".repeat(52)}\n  All suites green.\n`);
}

/* ---- 3. The artifact --------------------------------------------------
   git archive, not a copy of the working directory. The publish root is
   ".", so a directory copy would upload tests/node_modules — 18 MB of
   Playwright — into the public site root. .gitignore already says these
   are never deployed; archiving the commit is what makes that true
   rather than merely stated. */
if (existsSync(DIST)) rmSync(DIST, { recursive: true });
mkdirSync(DIST, { recursive: true });

const zip = join(DIST, `jkassociates-site-${sha}.zip`);
execFileSync("git", ["archive", "--format=zip", "-o", zip, "HEAD"], { cwd: ROOT });

/* unzip's summary line is "<bytes>  <n> files"; take the count, not the
   byte total, which printed as a nonsense file count. */
const files = run(`unzip -l "${zip}"`).trim().split("\n").pop().trim().split(/\s+/).slice(-2).join(" ");
const mb = (statSync(zip).size / 1048576).toFixed(1);

console.log(`✅  dist/jkassociates-site-${sha}.zip  (${mb} MB, ${files})`);
console.log(`    ${branch} @ ${sha} — ${subject}`);
console.log(`
Deploy it:
  Netlify → Deploys → "Deploy manually" drop zone, and drag the zip in.
  https://app.netlify.com/projects/jkconsultancydiagnostictoolkit/deploys

  or:  npx netlify-cli deploy --prod --dir . --site <site-id>
       (from a clean clone, never from a working directory)

Then remember: a manual deploy does not move the default branch. If the
branch this came from is not merged, the next push to it deploys whatever
that branch holds instead, and this artifact is silently replaced.
`);
