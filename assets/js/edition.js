/* ============================================================
   Edition identity for the regulatory corpus.

   The Regulatory Index has always shown the date it was last checked
   against the gazette record. That answers "is this current" and not
   the question a reader in a meeting actually has, which is "are we
   looking at the same one".

   A date cannot answer that. Two people can both be reading "verified
   1 August 2026" while one of them has a cached page from before four
   citations were added. And a board paper cannot cite a date usefully:
   "as at 1 August 2026" tells a reader when someone looked, not what
   they were looking at.

   An edition can. It is:

     JK-REG 2026.2 (31 instruments) · e7K3

   YEAR.SEQUENCE is human. The instrument count is the sanity check a
   reader can perform without leaving the page. The four-character
   suffix is derived from the corpus content itself, so two pages
   showing the same edition string are showing the same corpus — and
   a page that has drifted announces it, without anyone having to
   remember to bump a number.

   That last property is the whole point, and it is why the suffix is
   computed rather than declared. A hand-maintained version is a
   promise someone has to keep on every edit. A derived one cannot be
   forgotten, and the failure mode of forgetting — two different
   corpora wearing the same name — is exactly the failure a citable
   edition exists to prevent.

   Not a security hash. FNV-1a over a canonical serialisation, in an
   alphabet with no characters that misread aloud. It detects drift and
   accident, not a determined forger, and nothing here should be relied
   on to do more.

   DUPLICATED, DELIBERATELY, AND THE COPY IS NAMED.

   The same construction — FNV-1a with offset 0x811c9dc5 and prime
   0x01000193, the same 32-character alphabet, the same explicit field
   separator — also lives in the sister platform, in src/data/edition.js
   of the Kanda logistics advisory, where it digests corridor cost bands
   instead of a citation registry.

   They are separate repositories with no shared build, so there is
   nowhere honest to put one copy. Extracting a package to share forty
   lines would cost more than it saves and would couple two products
   that otherwise share nothing but a practice.

   What that costs is stated here rather than discovered later: a fix to
   the collision properties of one of these does NOT reach the other.
   If the separator, the alphabet or the hash changes here, the other
   file needs the same edit made by hand, and every published edition
   digest on both platforms changes with it. That is the price of the
   duplication and it is worth paying — but only while somebody knows
   they are paying it.
   ============================================================ */

/* Bumped by hand when the corpus changes in a way a reader should
   notice — instruments added, a status changed, the verification
   re-run. The suffix catches everything else. */
const EDITION_YEAR = 2026;
const EDITION_SEQ = 2;

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/* An explicit separator, not an empty join. Concatenating fields with
   nothing between them lets adjacent values collide: a reference of
   "L.N. 4" followed by "2/2026" serialises identically to "L.N. 42"
   followed by "/2026", and two different corpora would wear the same
   digest. The character is printable and named so it survives review —
   an earlier draft of this file carried a literal 0x1E here, which did
   the right thing invisibly and could not be seen in a diff. */
const FIELD_SEP = "|";

/* Order is fixed by sorting the keys, so a reordering of the source
   object — which changes nothing a reader can see — does not change
   the edition. Only the content does. */
function canonicalCorpus(cites, meta) {
  const keys = Object.keys(cites).sort();
  const body = keys
    .map((k) => {
      const c = cites[k];
      return [k, c.s, c.ref, c.long, c.url || ""].join(FIELD_SEP);
    })
    .join(FIELD_SEP);
  return [meta.verifiedOn, keys.length, body].join(FIELD_SEP);
}

function shortHash(input) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  let out = "";
  for (let i = 0; i < 4; i += 1) out += ALPHABET[(hash >>> (i * 5)) & 31];
  return out;
}

/**
 * @param {object} cites JKV.cites
 * @param {object} meta  JKV.CITE_META
 * @returns {{label: string, year: number, seq: number, count: number,
 *            digest: string, verifiedOn: string, unconfirmed: number}}
 */
function corpusEdition(cites, meta) {
  const keys = Object.keys(cites);
  const unconfirmed = keys.filter((k) => cites[k].s !== "verified").length;
  const digest = shortHash(canonicalCorpus(cites, meta));

  return {
    year: EDITION_YEAR,
    seq: EDITION_SEQ,
    count: keys.length,
    unconfirmed,
    digest,
    verifiedOn: meta.verifiedOn,
    label: `JK-REG ${EDITION_YEAR}.${EDITION_SEQ} (${keys.length} instruments) · ${digest}`
  };
}

/* A citation line someone can paste into a board paper or a
   submission. Names what it is, which edition, and where it came
   from — everything a reader needs to find the same document. */
function corpusCitation(edition, url) {
  const checked = new Date(edition.verifiedOn).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  return (
    `JK & Associates, Kenya Aviation Regulatory Index, ` +
    `edition ${edition.year}.${edition.seq} (${edition.digest}), ` +
    `${edition.count} instruments, verified against the Kenya Law gazette record ` +
    `on ${checked}. Available at ${url}`
  );
}

if (typeof window !== "undefined") {
  Object.assign(window, { corpusEdition, corpusCitation });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { corpusEdition, corpusCitation };
}
