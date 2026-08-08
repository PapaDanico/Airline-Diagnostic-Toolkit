/* ============================================================
   Generate the PWA icon suite from the badge master.

   The sister platform derives its icons from a vector path, so every
   size is rendered rather than resampled. This brand has no vector in
   the repository — assets/img/jk-badge.png has existed at 192×192 and
   only 192×192 for the whole of the project's history, and the largest
   true rendering of the mark anywhere is roughly 285px inside
   og-card.png. So the 512s here are RESAMPLED FROM THE 192 MASTER, and
   that is worth stating plainly rather than discovering later:

     - jk-icon-512.png          2.67× from the master
     - jk-icon-512-maskable.png 1.67× from the master

   Both hold up because the mark is smooth gradients and simple shapes
   rather than fine linework, which is what resamples well. When the
   designer's vector arrives, replace the master and re-run this — the
   sizes, padding and backgrounds below do not change.

   Rasterised through Chromium, already a dependency for the test suite,
   so no image library is added for four PNGs.

   Run: cd tests && node build-icons.mjs
   ============================================================ */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MASTER = join(ROOT, 'assets/img/jk-badge.png');

/* Brand background, matching manifest.json's background_color. A
   maskable icon is composited by the OS onto its own shape, so it must
   be opaque edge to edge — a transparent maskable icon gets whatever
   the launcher decides to put behind it. */
const BRAND_BG = '#FAF7F2';

/* Maskable icons are cropped to the launcher's shape, and the safe zone
   is the centre 80%. 320 of 512 is 62.5%, which sits inside that with
   room for a circle mask, and happens to be the gentler upscale. */
const MASKABLE_MARK = 320;

const OUTPUTS = [
  { file: 'jk-icon-512.png', mark: 512, bg: null,
    note: 'purpose "any" — transparent, like the 192 master' },
  { file: 'jk-icon-512-maskable.png', mark: MASKABLE_MARK, bg: BRAND_BG,
    note: 'purpose "maskable" — opaque, mark inside the safe zone' }
];

if (!existsSync(MASTER)) {
  console.error(`✗ master not found: ${MASTER}`);
  process.exit(1);
}
const b64 = readFileSync(MASTER).toString('base64');

const CANDIDATE_EXECS = [
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium'
];
const execPath = CANDIDATE_EXECS.find((p) => existsSync(p));
const browser = await chromium.launch(execPath ? { executablePath: execPath } : {});
const page = await (await browser.newContext()).newPage();
await page.setContent('<body></body>');

const rendered = await page.evaluate(
  async ({ b64, outputs }) => {
    const img = new Image();
    await new Promise((r, j) => { img.onload = r; img.onerror = j; img.src = 'data:image/png;base64,' + b64; });
    if (img.naturalWidth !== img.naturalHeight) throw new Error(`master is not square: ${img.naturalWidth}×${img.naturalHeight}`);
    return outputs.map(({ file, mark, bg }) => {
      const c = document.createElement('canvas');
      c.width = c.height = 512;
      const x = c.getContext('2d');
      /* The whole reason these are acceptable at all. Nearest-neighbour
         on a 2.67× upscale of a gradient would band visibly. */
      x.imageSmoothingEnabled = true;
      x.imageSmoothingQuality = 'high';
      if (bg) { x.fillStyle = bg; x.fillRect(0, 0, 512, 512); }
      const offset = (512 - mark) / 2;
      x.drawImage(img, offset, offset, mark, mark);
      return { file, data: c.toDataURL('image/png'), source: `${img.naturalWidth}px` };
    });
  },
  { b64, outputs: OUTPUTS.map(({ file, mark, bg }) => ({ file, mark, bg })) }
);

for (const { file, data, source } of rendered) {
  const buf = Buffer.from(data.split(',')[1], 'base64');
  writeFileSync(join(ROOT, 'assets/img', file), buf);
  const spec = OUTPUTS.find((o) => o.file === file);
  console.log(`  ✓ ${file}  512×512  mark ${spec.mark}px from a ${source} master  (${(buf.length / 1024).toFixed(0)} kB)`);
  console.log(`      ${spec.note}`);
}

await browser.close();
console.log('\nIcons written. Replace jk-badge.png with a vector-rendered master and re-run to drop the resampling.');
