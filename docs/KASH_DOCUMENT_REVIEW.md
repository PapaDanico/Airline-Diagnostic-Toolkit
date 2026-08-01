# Review — KASH Corporate Structure & Organogram briefs

**Reviewed:** `KASH-CORP-STRUCT-001 v3.0` (Corporate Structure Brief) and
`KASH-HR-ORG-001 v9.0` (Organogram, HR Strategy & Job Descriptions)
**Reviewer:** JK & Associates platform build, v3.0
**Date:** 2026-08-01

---

## 1. Overall assessment

Both documents are of a standard well above what normally reaches a board in this sector. The
corporate structure brief correctly separates the lender interface from the holding vehicle,
anticipates the dual-role conflict before the lender raises it, and prices offshore substance as a
running cost rather than a one-off. The organogram brief resolves the founder-concentration problem
with an evidence-backed three-way leadership split and — unusually — cites the guidance it relies on.

They were used as the design reference for two new platform tools (V3 Corporate Structure Designer,
V4 Organogram & Postholder Planner). The look-through cascade in V3 was validated against the KASH
cap table and **reproduces it exactly**:

| Party | Direct at OpCo | Indirect via chain | Total effective | Brief states |
|---|---|---|---|---|
| Founder (Singo Trust) | 20.00% | 41.63% | **61.63%** | 61.625% ✓ |
| Investor vehicle (Plena) | — | 27.75% | **27.75%** | 27.750% ✓ |
| Lender (MCB) | — | 5.62% | **5.62%** | 5.625% ✓ |
| Management | 5.00% | — | **5.00%** | 5.000% ✓ |
| | | | **100.00%** | ✓ |

---

## 2. Finding — a regulatory citation error

**This is the one item that should be corrected before the documents go further.**

`KASH-CORP-STRUCT-001` states, in the OpCo tier and again in the jurisdiction rationale:

> "KCAA ATO certification parallel track (**L.N. 42 — ATO Regs 2025**)"

**L.N. 42 of 2026 is not the ATO regulations.** Verified against the Kenya Law gazette record:

| Legal Notice | Instrument |
|---|---|
| **L.N. 42/2026** | Civil Aviation (**Air Operator Certification and Administration**) Regulations, 2025 |
| L.N. 50/2026 | Civil Aviation (Personnel Licensing) Regulations, 2025 |
| L.N. 40/2026 | Civil Aviation (Unmanned Aircraft Systems) Regulations, 2025 |
| L.N. 20/2026 | Civil Aviation (Approved Maintenance Organization) Regulations, 2025 |
| L.N. 102/2026 | Civil Aviation (Aerodromes Design and Operations) Regulations, 2025 |

L.N. 42 governs **air operator** certification — an AOC, not an ATO. KASH is a training organisation;
citing the AOC regulations as its certification basis is a category error that a KCAA reviewer, a
lender's counsel or a DFI diligence team would notice.

Two further points on the same theme:

1. **The ATO Regulations 2025 may not be gazetted at all.** KCAA has listed the Civil Aviation
   (Approved Training Organisations) Regulations, 2025 among revised regulations *awaiting*
   publication in the Kenya Gazette. If that remains the position, KASH's ATO certification proceeds
   under the **extant** ATO regulations and `AC-ATO 001C`, not under a 2025 instrument. The brief and
   the organogram both plan against "ATO Regs 2025" as though it were in force. **Confirm the current
   instrument with KCAA in writing before the compliance matrix is finalised** — it determines the
   entire Phase 2 submission.

2. **The L.N. 50 references in the organogram are correct.** TRI/TRE examiner services and
   solo/skill-test sign-off are Personnel Licensing matters, and L.N. 50/2026 is indeed the Personnel
   Licensing Regulations 2025. No change needed there.

3. **L.N. 32 (SMS Regulations 2025)** could not be confirmed from the public gazette record. Treat it
   as unverified until checked. ICAO Annex 19 and Doc 9859 remain the substantive standard regardless.

**Naming convention worth adopting.** Kenya's 2025 regulations were gazetted through 2026, so an
instrument titled "…Regulations, **2025**" carries a **2026** Legal Notice number. Citing both —
"Civil Aviation (Air Operator Certification and Administration) Regulations, 2025 (L.N. 42/2026)" —
removes the ambiguity that produced this error. The platform's citation registry does exactly this,
and flags anything it cannot confirm with a visible `?` chip rather than asserting it.

---

## 3. Observations on the corporate structure brief

These are not errors; they are places where the brief's own logic points somewhere it does not go.

**a. The `new debt > USD 2M` minority veto.** The brief already flags that this could catch Phase 1B
financing and recommends carve-outs. Worth going further: the carve-out should be drafted into the
HoldCo SHA as a **schedule**, not left as a negotiating position. A veto held by a nominee for three
undisclosed principals is a practical block on the growth plan the structure exists to enable, and it
is far cheaper to carve out before signature than to renegotiate under time pressure at the round.

**b. The FX exposure is understated as a "structural consequence".** Equipment priced in EUR, a
facility drawn in USD, and revenue largely in KES/USD is a three-way exposure across a multi-year
tenor. The brief's mitigants (forwards at milestone payments, USD-revenue pricing policy, CFO
treasury policy) are right, but two of the three depend on a CFO who is a *condition precedent* —
i.e. not in post when the first exposure crystallises at ALSIM drawdown. Either bring the treasury
policy forward as a board-approved document ahead of the CFO hire, or fix the EUR leg with forwards
at term-sheet stage.

**c. Sub-loan-as-equity.** The brief correctly identifies that this should sit in an intercreditor
deed rather than a side letter. That recommendation deserves to be elevated from "best practice
enhancement E2" to a **condition of the facility**, because the DSCR headroom the whole model relies
on evaporates if the treatment is disputed. The covenant table shows the conservative case at 1.11×
against a 1.20× floor — there is no room to lose the sub-loan's equity treatment.

**d. Substance budget.** USD 25–40K/entity/year for two Mauritius entities is consistent with market
and is correctly budgeted from incorporation rather than retrofitted. The platform's V3 tool uses
USD 32.5K as its mid-point, which lands inside the brief's band.

---

## 4. Observations on the organogram brief

**a. The three-way leadership split is well-founded and well-evidenced.** Separating CEO, Accountable
Manager and CFI/HT, with the AM's direct-CEO-access and funding-allocation guarantee made structural
via the ExCo cadence, is the correct reading of the guidance cited. The brief's instinct that
accumulating every designation in the founder is neither required nor preferred is right.

**b. Founder regulatory indispensability is correctly identified as leverage — and should also be
logged as a risk.** The brief frames non-transferable Accountable Manager status as the founder's
primary non-monetary BATNA. It is simultaneously the venture's largest single-point-of-failure: a
change-of-AM event triggers KCAA re-approval of the ATO. Both framings are true and both belong in
the risk register. The recommended board resolution codifying the AM's statutory authority (safety
decisions not overridable by commercial vote) addresses the governance half; the **AM deputy
arrangement** addresses the continuity half and is currently the weaker of the two.

**c. Deputy CFI/HT at Y2 M9 is late relative to the stated risk.** The brief itself notes the business
plan mandates two qualified CFIs from launch with the deputy pre-approved and named in the Ops
Manual. A Y2 M9 appointment date does not deliver that. Either the launch establishment carries the
deputy from M1, or the "eliminates single-point-of-failure" claim should be softened to reflect that
the gap persists for roughly two years.

**d. Executive Equity Incentive naming and tax treatment.** The brief's correction here is sound — a
direct founder-to-executive share transfer is not an option scheme and the charge point differs
accordingly. Worth confirming the PAYE valuation basis with the tax adviser in writing, because the
brief's own text flags that the handover's earlier treatment was wrong; the corrected position should
not rest on the same informal footing.

---

## 5. What was carried into the platform

| Brief feature | Platform implementation |
|---|---|
| Three-tier HoldCo/SPV/OpCo architecture | V3 structure archetype `threetier`, with `simple` and `holdco` alternatives |
| Look-through effective interest cascade | V3 chain walker (path-based cycle guard; direct + indirect paths summed) |
| Local stake as WHT/licensing hedge | V3 governance check `local` |
| Substance from day one | V3 governance check `substance` + per-entity annual cost |
| Treaty not relied upon | V3 governance check `dta` |
| Lender-as-shareholder conflict framework | V3 governance check `dual` |
| Intercreditor deed vs side letter | V3 governance check `inter` |
| Three-way FX exposure | V3 governance check `fx` |
| AM non-transferability as governance leverage | V3 governance check `am` |
| Equity incentive naming/tax | V3 governance check `esop` |
| Minority veto vs growth plan | V3 governance check `veto` |
| DSCR covenant sensitivity | V2 Venture Builder — four scenarios against a settable floor |
| Postholder set + deputy requirement | V4 postholder map with single-point-of-failure detection |
| Headcount ramp 30 → 78 FTE | V4 ATO sector ramp (launch 30, Y3 52, Y5 78) |
| Phased CAPEX with deferred tranche | V2 capital lines split fixed CAPEX vs working capital |

---

## 6. Recommended actions

| # | Action | Priority |
|---|---|---|
| 1 | Correct "L.N. 42 — ATO Regs 2025" in `KASH-CORP-STRUCT-001`; L.N. 42/2026 is the AOC regulations | **High** |
| 2 | Obtain written confirmation from KCAA of the ATO instrument currently in force | **High** |
| 3 | Verify the SMS Regulations 2025 Legal Notice number before further citation | Medium |
| 4 | Adopt the dual-citation convention ("…Regulations, 2025 (L.N. xx/2026)") across all KASH documents | Medium |
| 5 | Draft the Phase 1B / refinancing carve-out into the HoldCo SHA as a schedule | Medium |
| 6 | Bring the FX treasury policy forward ahead of the CFO condition precedent | Medium |
| 7 | Elevate the intercreditor deed from enhancement to facility condition | Medium |
| 8 | Reconcile the Deputy CFI/HT appointment date with the launch-from-day-one claim | Medium |

---

*Prepared as part of the JK & Associates platform build. This review is an internal working document,
not legal or regulatory advice. Recommendations 1–4 concern regulatory citation accuracy and should
be checked against the gazette and with KCAA directly before any submission relies on them.*
