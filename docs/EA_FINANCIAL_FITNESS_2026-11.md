# Financial fitness for an air service licence in East Africa

**Prepared** 27 November 2026 · Research note behind the Venture Builder's
licence financial-fitness test.

## Question

For Kenya, Tanzania, Uganda, Rwanda and Ethiopia, what does each regulator's
own text require an applicant for an air service licence (the economic
licence, not the safety AOC) to prove about its finances? Which of those
requirements can be computed from a business plan, and where do the five
differ?

## Method

The note reads each jurisdiction's licensing instrument and its
financial-fitness provision. Every requirement goes into one schema:

- what must be shown;
- the time horizon;
- the measure;
- whether revenue may be counted;
- the discretion left to the authority;
- the citation.

Each requirement is then classed as **computable** (a figure follows from
the plan's revenue, margin, capital and debt), **evidential** (a document
must be produced) or **discretionary** (the authority decides, with no
stated test).

Sources are the instruments themselves, in regulator-hosted or gazette
copies, read on 27 November 2026. A secondary summary was used only to find
a provision, never as its text.

## Findings

| | Costs covered without revenue | Obligations met over | Other financial requirements | Instrument |
|---|---|---|---|---|
| **Kenya** | 3 months | 24 months | Two-year business plan; Fourth Schedule data; evidence of start-up funds (KCAA circulars AC-ATD003, AC-ATD08) | Civil Aviation (Licensing of Air Services) Regulations, 2018, L.N. 167/2018, reg. 19 |
| **Tanzania** | 6 months | 12 months | Feasibility study and first-year business plan (reg. 8(2)); five-year projections (First Schedule) | Civil Aviation (Licensing of Air Services) Regulations, 2006, G.N. 81/2006, reg. 8 |
| **Uganda** | 6 months | 24 months | Evidence of ability to finance operations up to USD 0.5m (domestic), 1m (regional) or 2m (international); a performance bond (amount not published) | UCAA guidelines CAA/05/ASLA/59 (2014), under S.I. 2001 No. 72 (reg. 11(2)(f) "financial resources") |
| **Rwanda** | 3 months | 24 months | Small carriers (aircraft under 10 t MTOW or fewer than 20 seats) are tested instead on net capital of at least RWF 50m; a guarantee or security (amount unstated); audited annual accounts | RCAR Part 37, 37.085 |
| **Ethiopia** | none set | none set | "Fitness and qualifications of the applicant", undefined; liability insurance (Art. 63(1)) | Civil Aviation Proclamation No. 616/2008, Art. 62(1) |

**Convergence.** Kenya, Tanzania, Uganda and Rwanda all use the same
two-limb test: obligations met over a horizon, and a block of fixed and
operating costs covered without relying on revenue. The wording closely resembles the European Union's operating-licence
test (Regulation 1008/2008, Art. 5); that text was not read for this note.

**Divergence.** The figures differ, and the difference is material:

- Tanzania and Uganda ask for **six months** of costs covered, twice Kenya's
  and Rwanda's three. For the same plan the working capital the regulator
  expects doubles.
- Tanzania's obligations horizon is **12 months**, not 24.
- Uganda adds published financing thresholds by scope of service.
- Rwanda adds a capital test for small carriers.

**Ethiopia** sets no quantified test. The Proclamation leaves fitness to the
Authority's judgement; the ECAA's directives and forms could not be reached.

**Reference frame.** None of these sets a test a business plan could compute:

- *Yamoussoukro Decision*, Art. 6.9. It has no financial-capacity
  criterion and relies on the national licence.
- *AFCAC's 2024 model economic regulations*. They ask for "proof of
  adequate financial capability", which is discretionary, and the model
  text is not binding.
- *EAC Treaty*, Art. 92. It places duties on States, not applicants.
- *CASSOA*. Its mandate is safety and security only.
- *ICAO guidance* (Docs 9587 and 9626). It could not be retrieved and is
  recorded as a gap.

## What the platform does with this

The Venture Builder's licence test now asks for the jurisdiction. For the
four with a numeric test it computes the cost cover against the plan's
working capital, using that State's months. It states the State's
obligations horizon and its additional requirements, and cites the
provision. For Ethiopia it says there is no quantified test and computes
nothing. It does not borrow another State's figure.

The rules live in one table in `assets/js/page/tools-venture-builder.js`
(`ASL_RULES`), and the end-to-end suite checks each jurisdiction's figure.

## Limits

- **Kenya.** No amendment to the 2018 Regulations since gazettal was
  found, but the 2022 consolidation and the 2024 draft replacement could
  not be checked.
- **Tanzania.** Reg. 8 sits in the Part on internal services; how it is
  applied to an international licence is to be confirmed with the TCAA.
  The provision of Cap. 80 that keeps the 2006 Regulations in force was
  not read.
- **Uganda.** The figures are in guidelines, not the Regulations.
  Revised draft regulations reported in 2026 were not found.
- **Rwanda.** The copy read sits in RCAA's archived folder but is linked
  from its live service page. No change to 37.085 in 2024 was found.
- **Ethiopia.** The English column was read; the Amharic text prevails.
  ECAA directives were unreachable.
- **ICAO.** Docs 9587 and 9626 were blocked at retrieval.
- **Status of this note.** It is a planning aid, not legal advice. Confirm
  the current text with the regulator before an application.

## Sources

Read 27 November 2026. Copies are held with the research working files.

- Kenya: Civil Aviation (Licensing of Air Services) Regulations, 2018 (L.N. 167/2018), KCAA-hosted gazette print; KCAA circulars AC-ATD003 (2023) and AC-ATD08 (2025).
- Tanzania: Civil Aviation (Licensing of Air Services) Regulations, 2006 (G.N. 81/2006), TCAA-hosted; TCAA Air Service Licence guidance page and application form.
- Uganda: Civil Aviation (Licensing of Air Services) Regulations, 2001 (S.I. 2001 No. 72); UCAA guidelines CAA/05/ASLA/59 (June 2014) and the 2007 edition; Civil Aviation Authority Act, Cap. 354.
- Rwanda: Rwanda Civil Aviation Regulations Part 37 (Ministerial Order 01/CAB.M/019 of 2019, compiled with RSR/01/2024), RCAA-hosted; RCAA form P37-001; Law 20/2018 and its 2024 amendment.
- Ethiopia: Civil Aviation Proclamation No. 616/2008 (gazette print, unofficial host) and Amendment Proclamation No. 1179/2020.
- Yamoussoukro Decision (1999), AU-hosted; AFCAC model economic regulations (2024); EAC Treaty, Art. 92; CASSOA mandate page.
