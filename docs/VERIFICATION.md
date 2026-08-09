# How checks are verified here

Every guard in `tests/` was added because something was wrong. Several of
them were then found to be guarding nothing, which is worse than not
having added them: a green tick retires the question.

So the rule in this repository is **break it first**. A new check does
not count as working until it has been watched to fail, on the exact
condition it claims to catch, and seen to name the right file and the
right problem.

This document exists because the same handful of mistakes keep producing
checks that pass while the thing they check is broken. They are listed
with the real cases, because the abstract version of each one sounds too
obvious to be worth writing down, and each of these was made anyway.

---

## 1. The check reads a different thing from the product

The benchmark-age check read `JK.domains`. The results page reads the
projection out of `computeScores()`. The check passed while the page
printed *"the next **undefined** edition may be due"*.

**Ask:** does the check read the value the user's screen reads, or an
upstream one that happens to be nearby?

## 2. The check covers one of several copies

The README states the domain count in three places. The first guard read
one. Editing *"8 weighted domains"* to *"9"* passed clean.

The same shape twice more since: the JSON-LD description was a fourth
uncovered copy of the same number (`55 questions across 9 domains`
passed the entire suite), and the version string is hardcoded in 27 page
footers that nothing kept in step with `data.js`.

**Ask:** how many places state this fact? Guard all of them, and assert
the count, so deleting one is a failure rather than a silent narrowing.

## 3. The check tests for a word, not a reference

The export-promise check searched for the string `PrintButton(`.
Commenting out the import left the call text in place and the check
passed. It now strips comments and requires both the import and the
call.

**Ask:** would this still pass if the code were present but dead?

## 4. The mechanism the test depends on does not work

`tests/storage.mjs` blocked writes with
`Object.defineProperty(window.localStorage, 'setItem', …)`. A `Storage`
object is a legacy platform object with a named-property handler, so
that stores a *value* under the key `"setItem"` and leaves the method
alone. `defineProperty` returned normally, nothing threw, every write
succeeded, and the run reported a clean block while blocking nothing.

The test also had a self-report flag — the blocker set
`window.__blockFailed` if it caught an error — and the flag said all was
well, because nothing had thrown.

**Ask:** does the test prove its own setup worked *by observing the
effect*, not by trusting a flag the setup set about itself? The probe is
now: call `setItem`, demand an exception, and check its `name`.

## 5. The subject was never actually driven

Three times, a Kanda tool was driven with empty or uniform inputs, hit
its own validation ("Cannot assemble yet — enter a total funding
requirement greater than zero"), never computed, never saved — and the
absence of a save notice was nearly reported as "the failure is silent".

An earlier sweep produced roughly 100 false positives the same way,
including a commit-button pattern that never matched the button's actual
label.

**Ask:** did the interaction reach the state the assertion is about?
Assert that first — `scripts/storage.mjs` requires a result was computed
before it concludes anything about saving, and its control asserts a
record really reached IndexedDB.

## 6. `getClientRects().length > 0` is not "appears in the output"

Print export was checked by emulating print media on the live page. The
real export builds a separate document: `printToPDF` injects a
stylesheet, prepends a header and preamble, sets `data-printing`, and
calls `window.print()`. Four findings were reported against the wrong
artefact. The export itself was fine.

**Ask:** is the thing under test the artefact the user receives, or a
convenient stand-in?

## 7. `git checkout` reverts your fix along with your breakage

Twice. Once reverting a fix to `common.js` during a negative test; once
reverting *uncommitted* new JSON-LD while break-testing the guard for
it, so three of four cases ran against files with no JSON-LD at all and
all three "passed".

**Ask:** is the baseline committed before you start breaking things?

## 8. The check saw a real change, but not the one it was looking for

`tests/focus.mjs` reported *"1325 focusable elements, all with a visible
indicator at 3:1"* while the Training TNA's competency selects had no
focus indicator at all.

The rule was `.cur-select:focus { outline: 2px solid var(--dn-steel);
border-color: var(--dn-steel) }`, and `--dn-steel` was defined nowhere.
Both declarations were dropped: the outline reverted to `none`, and
`border-color` reverted to `currentColor` — black. The check compares
the resting border to the focused border, found `#cbd5e1` → black, and
scored that at 21:1.

So the measurement was correct. A colour did change on focus, and it did
have contrast. It was the accidental by-product of a broken declaration
rather than any indicator anyone drew, and nothing in a before/after
colour comparison can tell those apart.

What closed it was not a stricter focus check. It was
`tests/audit.mjs` refusing to let a `var()` reference resolve to
nothing, one layer earlier — the defect was never really about focus.

**Ask:** could this check be satisfied by an accident? If the assertion
is "something changed", name what should have changed.

## 9. The measurement was taken before the thing finished happening

The first pass of the keyboard walk read `getComputedStyle` immediately
after each `Tab`. `.cur-select` carries `transition: all 0.15s`, so a
2px ring reads as `solid 0px` for the first frames. Every transitioned
control on the site came back "no focus indicator", and the one that was
genuinely ringless was buried in the false ones.

Distinguishing them took a settle delay and reading the `outline-style`:
mid-transition is `solid 0px`, genuinely absent is `none 0px`, and the
second never becomes visible however long you wait.

**Ask:** is the property being read the settled one, or one still on its
way there?

---

## The two properties every guard needs

**A negative control.** A check that only ever runs against the broken
case will pass just as happily against something that always fires.
`tests/storage.mjs` and `scripts/storage.mjs` run every check twice —
storage blocked and storage working — for exactly this reason. An
earlier attempt at that file could not tell the two runs apart (both
showed "Complete all 40 questions first") so it demonstrated nothing and
was not committed.

**A no-longer-checking case.** If the pattern stops matching, the guard
must fail rather than pass vacuously. Several checks here carry an
explicit branch for it — *"no page carries a data-version fallback any
more — this check has stopped checking anything"*. Without it, deleting
the thing under test is indistinguishable from it being correct.

## Static and behavioural are not substitutes

`tests/storage.mjs` proves the banner appears when a write is refused.
`tests/audit.mjs` fails the build on a bare `catch {}` around
`setItem`. The first covers the paths someone thought to drive; the
second covers the grep. Neither replaces the other, and the cheap one
usually prevents more.

## A guard placed after the thing it guards against is not a guard

`scripts/smoke.mjs` had a branch reporting "no built assets to measure
the README claim against" — placed after a `readdirSync` that throws on
a missing directory. With no `dist/assets` the run threw instead, after
all 108 tests had passed, discarding their results and reporting an
`ENOENT` rather than the problem it had a message ready for.
