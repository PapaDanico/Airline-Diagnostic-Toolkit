# Diagnostic charter

**Version 1 · applies to Kanda Logistics Advisory and JK & Associates**

Two platforms, two regulators, two audiences, one practice. They share a
scoring instrument and a set of promises about it. They also differ in
places, and the differences are decisions rather than drift.

This document exists because the second sentence is unprovable by
inspection. Someone comparing the two scorecards finds that one refuses
to score a half-finished questionnaire and the other renormalises and
prints a confidence figure, and has no way to tell whether that is
considered or accidental. Written down, it is considered.

An identical copy of this file lives in both repositories.

---

## The shared rules

Both products follow these. A change to any of them is a change to both.

**1. Answers score 0–4.** Every question, every domain, both platforms.
An option carries an explicit score; nothing is inferred from position
in the list.

**2. Domain weights sum to exactly 100.** Checked in the build, not by
eye. Where weights are adjusted for the respondent, the adjusted set
sums to 100 too, and the apportionment is largest-remainder so no single
domain silently absorbs the rounding.

**3. Never report precision the instrument does not have.** This is the
rule the two products implement differently, and the deviations section
below says how. What is common is the prohibition: neither may present a
partial assessment as though it were complete.

**4. Every figure carries its date.** Benchmarks, market evidence,
regulatory status. A number without a date is a number nobody can judge.

**5. Staleness is measured against the publisher's own cycle.** An
annual survey at thirteen months has missed one edition; a quarterly
observatory at thirteen months has missed four. A flat threshold calls
those the same thing and they are not.

**6. Regulatory status is computed from today's date, never stored.** A
hardcoded status is how a product asks whether you are ready for an
obligation that lapsed eight months ago.

**7. Nothing the user types is transmitted.** Enforced by a content
security policy, not promised in a notice. The honest corollary is
stated on both sites: nothing can be recovered for them either.

**8. A refused storage write is reported to the user.** Reads that fail
return the empty default silently — that is a supported first-visit
experience. Writes that fail lose work, and the person must be told
while they can still act on it.

**9. Exports are stamped at the moment they are produced**, with the
register state that produced them. A PDF handed to a lender in November
states November.

**10. Counts about the product are computed, not typed.** Tool counts,
instrument counts, corridor counts, question counts. Anything a
marketing page asserts about the platform is derived from the same
registry the platform runs on, and the build fails if it is written by
hand.

**11. A check that stops checking must fail.** Every guard carries an
explicit branch for "the thing I examine is no longer here". Silence
from a guard whose subject has been deleted is indistinguishable from
success, which is worse than having no guard.

---

## Deviations, and why

Each product states its own. These are the checkable claims — each repo
guards its own entries against its own code, so a deviation cannot be
quietly abandoned or quietly adopted.

### Kanda: partial answers renormalise, and confidence falls

A corridor diagnostic is run at a border post, on a phone, by someone
who may not have all 32 answers and still needs a usable read. So the
index renormalises across the domains actually scored, and a confidence
figure falls instead of the score. An unanswered domain scored 0 at full
weight would be a made-up number.

*Guarded by:* `scripts/smoke.mjs` — a partial answer set produces an
index with confidence below 100.

### Kanda: questions can be marked not applicable

An operator with no bonded warehouse is not handed a middling mark for
something they do not do; the option removes the question from the base
entirely.

*Guarded by:* `scripts/smoke.mjs` — an N/A answer reduces the domain's
denominator rather than scoring zero.

### Kanda: weights calibrate to operator type

Four types — integrated, shipper, transporter, clearing agent. A shipper
who owns no trucks should not carry 14% on Fleet & transport. Deltas are
small by design so two operators' indices stay comparable.

*Guarded by:* `scripts/smoke.mjs` — every calibrated set sums to 100,
and calibration must NOT move the index when every domain scores the
same.

### JK: partial answers are refused outright

An airline health scorecard is read in a boardroom by a lender. A
part-answered scorecard flatters whoever filled the easy domains first,
so no index is shown until all 40 questions are in — the diagnostic page
and the venture dashboard both refuse, in the same terms.

This is the opposite remedy to Kanda's for the same problem, and it is
right for the same reason Kanda's is right: the use context differs. A
lender's boardroom will not tolerate a caveated number; a border post
cannot wait for a complete one.

*Guarded by:* `tests/e2e.mjs` — a partial answer set renders the empty
state, not a report.

### JK: weights calibrate to fleet type and operating model

Two axes rather than Kanda's one, because both are properties of the
carrier that no single calculation reveals. Kanda deliberately has no
mode axis: mode is already a per-run input there, and folding it into
the weights would let one variable move the answer twice.

*Guarded by:* `tests/audit.mjs` — the adjusted set sums to 100.

---

## What is deliberately not shared

**The scoring engines themselves.** They are about forty lines each.
Merging them would couple two products serving different regulators for
almost no saving, and the coupling is the expensive part: a change
correct for one becomes a regression in the other.

**Question counts.** 40 across 8 domains for an airline; 32 across 8 for
a corridor operator. They measure different things and the counts follow
the subject matter, not a house style.

**The storage stacks.** IndexedDB with a localStorage config layer on
one, localStorage alone on the other. That follows what each stores, not
a preference. Rule 8 above is the shared part — the policy, not the
implementation.

---

## Changing this document

A deviation added here without a guard is a comment, not a commitment.
Add the check in the same change, and watch it fail before trusting it —
see `docs/VERIFICATION.md` for the seven ways a guard in these
repositories has passed while the thing it guarded was broken.
