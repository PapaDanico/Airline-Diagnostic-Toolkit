/* What each suite actually verified, written down where something other
   than a scrolling terminal can read it.

   The suites have always printed their numbers — 553 assertions, 1386
   focusable elements, 25 routes under the policy — and those numbers
   have always died in CI stdout. That is the wrong place for them. This
   project's whole claim is that its figures are checked, and the check
   is the least visible thing about it.

   ── The one rule this file exists to enforce ──

   A record can only be written by a suite that ran. Nothing here can be
   filled in by hand, and a suite that fails writes passed:false rather
   than staying silent, so a red run cannot be mistaken for an absent
   one. The collector then refuses to publish unless every expected
   suite is present and passing.

   That matters more than the convenience. A page saying "553 checks,
   re-run on every deploy" is a claim, and this codebase has spent a
   week finding claims that quietly stopped being true. This one is
   built so it cannot: the published figure is derived from the run, and
   CI fails if the committed file and the run disagree. */

import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), ".verification");

/**
 * @param {string} suite    stable id — must match EXPECTED in the collector
 * @param {object} facts    { passed, headline, ...counts }
 *   passed   — false on any failure; the collector will not publish a red run
 *   headline — one plain sentence a reader outside the repo can understand
 */
export function record(suite, facts) {
  try {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(join(DIR, `${suite}.json`), JSON.stringify({ suite, ...facts }, null, 2) + "\n");
  } catch (err) {
    /* Never fail a suite because its bookkeeping failed. A missing
       record makes the collector refuse to publish, which is the safe
       direction — the check still ran and still reported. */
    console.error(`      (verification record for ${suite} not written: ${err.message})`);
  }
}
