/* ============================================================
   Render the downloadable documents from their HTML sources.

   The Fuel Tender Specification shipped as DN_Fuel_Tender_Spec.pdf,
   with "DN Fuel Tender Specification" in its PDF Title metadata, on a
   site that is JK & Associates on every page, in the logo, in the
   manifest and in the README. DN is the pre-rebrand brand.

   Its source, assets/docs/fuel-tender-spec-source.html, was correct —
   <title>JK Fuel Tender Specification</title>, one JK mention, no DN.
   Both files were committed in the same change, after the rebrand. The
   source was updated; the binary beside it was carried over and never
   re-rendered.

   That is the failure this script removes. A checked-in binary has no
   way to disagree visibly with the source it came from: nothing diffs
   it, nothing renders it in review, and it is the one artefact a
   prospect receives by name after handing over their work email.

   Rendered through Chromium, already a test dependency, using the same
   engine the site's own print path uses.

   Run: cd tests && node build-docs.mjs
   ============================================================ */

import { chromium } from 'playwright';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const DOCS = [
  {
    source: 'assets/docs/fuel-tender-spec-source.html',
    out: 'assets/docs/JK_Fuel_Tender_Spec.pdf',
    /* Sets the PDF's Title metadata, which is what a browser shows in
       its viewer tab and what a file manager indexes. The old file had
       "DN" here, where nobody would look. */
    title: 'JK Fuel Tender Specification'
  }
];

const CANDIDATE_EXECS = [
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium'
];
const execPath = CANDIDATE_EXECS.find((p) => existsSync(p));
const browser = await chromium.launch(execPath ? { executablePath: execPath } : {});

let failed = 0;
for (const doc of DOCS) {
  const src = join(ROOT, doc.source);
  if (!existsSync(src)) {
    console.error(`  ✗ source missing: ${doc.source}`);
    failed++;
    continue;
  }
  const page = await (await browser.newContext()).newPage();
  /* file:// so the render needs no server, and so a document that
     silently depends on a network asset fails here rather than
     rendering blank for whoever downloads it. */
  await page.goto(pathToFileURL(src).href, { waitUntil: 'networkidle' });
  /* Chromium writes <title> into the PDF's Title metadata. */
  await page.evaluate((t) => { document.title = t; }, doc.title);
  await page.pdf({
    path: join(ROOT, doc.out),
    format: 'A4',
    printBackground: true,
    margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' }
  });
  await page.close();
  const kb = (statSync(join(ROOT, doc.out)).size / 1024).toFixed(0);
  console.log(`  ✓ ${doc.out}  (${kb} kB)  title "${doc.title}"`);
}

await browser.close();
if (failed) process.exit(1);
console.log('\nDocuments rendered from source. Edit the HTML, re-run, commit both.');
