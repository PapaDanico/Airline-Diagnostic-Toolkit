/* Implementation and programme management — the discipline the platform
   modelled everywhere except in how the work actually gets done.

   Every other instrument here answers a question about the venture:
   what it costs, who must be accepted, what the certificate is worth.
   None of them answered the question a client asks immediately after:
   how is this run, by whom, and how would we know early that it is
   going wrong.

   The governing idea, and the reason a generic project plan fails in
   this sector: the milestones belong to the Authority, not to the
   applicant. A plan built on target dates reports green until the week
   a gate fails to open, then moves to red with no warning and no
   recovery time. A plan built on gate criteria — what must be true for
   the next gate to open — reports the truth continuously, because
   progress is measured by evidence assembled rather than time elapsed.

   Hence: manage by gate, not by date. Everything below follows from
   that one sentence. */

const JKI = {

  /* ---- workstreams --------------------------------------------------
     Six, because these are the six that have to run concurrently. Run
     in series a certification programme takes roughly twice as long,
     and the commonest cause of that is an organisation treating people
     and commercial as things to start once the regulatory work is
     "far enough along". They are never far enough along. */
  workstreams: [
    { id: "reg", n: "Regulatory & certification", owner: "Accountable Manager", cadence: "Weekly",
      d: "Notifications, manuals, programme approvals, demonstration and the certificate itself.",
      dep: "Held by the Authority throughout — the only workstream whose pace you do not set.",
      lead: true },
    { id: "people", n: "Organisation & people", owner: "Accountable Manager", cadence: "Weekly",
      d: "The accepted posts, their deputies, crew and engineers.",
      dep: "Recruitment lead time for senior postholders routinely exceeds the gate they are needed for.",
      lead: true },
    { id: "fleet", n: "Fleet", owner: "Board", cadence: "Fortnightly",
      d: "Own-or-lease decision, pre-buy inspections, delivery, registration and insurance.",
      dep: "Capital structure decision; and aircraft cannot be operated commercially before the Ops Specs cover them." },
    { id: "commercial", n: "Commercial", owner: "Commercial lead", cadence: "Fortnightly",
      d: "Demand, contracted revenue, retainers, distribution and pricing.",
      dep: "Started late in most ventures, which is why so many certificate holders launch with no contracted revenue." },
    { id: "finance", n: "Finance & treasury", owner: "Board", cadence: "Monthly, weekly at gates",
      d: "Funding stack, draw schedule, covenant headroom and the cash curve against the gates.",
      dep: "Capital structure; and the draw schedule should follow the gates rather than the calendar." },
    { id: "ops", n: "Operational readiness", owner: "Head of Flight Operations", cadence: "Fortnightly",
      d: "Bases, ground handling, OCC, systems, spares and the things a proving flight actually needs.",
      dep: "Manual approval — you demonstrate what the manuals describe, so the manuals come first." }
  ],

  /* ---- stage gates ----------------------------------------------------
     Capital release points. The rule the platform now states plainly:
     capital committed ahead of its gate is capital at risk, and the
     commonest failure in a first venture is paying deposits against a
     scope the Authority has not yet accepted. */
  gates: [
    { id: "g1", n: "G1 — Proceed", phase: "pre",
      evidence: [
        "Business model and revenue basis stated in one sentence",
        "Ownership and effective-control position modelled and passing",
        "Pre-application meeting held and scope agreed with the Authority",
        "Schedule of Events agreed and jointly owned"
      ],
      release: "Advisory and diligence only",
      fail: "Withdraw at the cost of the diligence alone — the cheapest exit available." },
    { id: "g2", n: "G2 — Commit the organisation", phase: "apply",
      evidence: [
        "All accepted posts identified with credentials the Authority will accept",
        "Formal application accepted in writing",
        "Funding stack committed, not merely indicated",
        "Manual development resourced and under way"
      ],
      release: "Organisation, systems and manual development",
      fail: "A rejection here returns you to pre-application and burns months of credibility." },
    { id: "g3", n: "G3 — Commit the fleet", phase: "doc",
      evidence: [
        "Operations Specifications scope confirmed in writing for the intended types",
        "Postholders accepted or formally in process",
        "Manuals submitted and being accepted rather than returned",
        "Insurance terms indicated against the actual fleet and crew"
      ],
      release: "Aircraft deposits and long-lead procurement",
      fail: "The gate most often crossed too early. Deposits paid against an unconfirmed scope are the single largest avoidable exposure in a startup venture." },
    { id: "g4", n: "G4 — Take delivery and demonstrate", phase: "demo",
      evidence: [
        "Operations Specifications issued covering every intended type",
        "All accepted posts in place and accepted",
        "Findings from document evaluation closed, not merely responded to",
        "Proving flight programme scheduled with the Authority"
      ],
      release: "Delivery balances and the launch cost base",
      fail: "Deposits at risk and a deferral cost on every aircraft in the order." },
    { id: "g5", n: "G5 — Enter service", phase: "cert",
      evidence: [
        "Certificate and Operations Specifications in hand",
        "Air service licence issued or varied for the current ownership",
        "First contracted revenue signed",
        "Surveillance plan understood and resourced from day one"
      ],
      release: "Working capital into revenue operations",
      fail: "A certificate with no contracted revenue behind it burns working capital at exactly the rate the model assumed it would earn." }
  ],

  /* ---- leading indicators ---------------------------------------------
     Every one of these is observable weeks before the lagging measure
     it predicts. A programme reporting only percentage-complete is
     reporting the past. */
  indicators: [
    { k: "Gate items closed against the Schedule of Events", freq: "Weekly",
      predicts: "The certification date", trigger: "Two consecutive weeks with no closure" },
    { k: "Accepted posts named and pre-cleared", freq: "Weekly",
      predicts: "Manual approval and demonstration", trigger: "Any senior post unfilled at week eight" },
    { k: "Manual chapters submitted against accepted", freq: "Weekly",
      predicts: "The document evaluation gate", trigger: "Acceptance rate below 60%" },
    { k: "Findings raised against findings closed", freq: "Weekly",
      predicts: "Demonstration and inspection", trigger: "Open findings rising three weeks running" },
    { k: "Cash drawn against gates passed", freq: "Monthly",
      predicts: "Capital at risk", trigger: "Any draw ahead of its gate" },
    { k: "Contracted revenue signed", freq: "Monthly",
      predicts: "Whether the business case survives launch", trigger: "No anchor contract by G4" }
  ],

  /* ---- contingency ------------------------------------------------------
     Pre-agreed responses, because the value of a contingency plan is
     entirely in having decided before the pressure arrives. */
  contingencies: [
    { when: "The Authority treats a variation as a fresh certification",
      then: "Hold G3 and G4 so fleet capital is not committed against a certificate that cannot carry it; reopen price with any vendor; and test whether existing approvals can carry interim revenue while the wider scope is certified." },
    { when: "A senior postholder nominee is rejected",
      then: "Treat it as a schedule event, not an HR one. The post reverts to open, the gate it serves reverts with it, and the recruitment clock restarts at its full length." },
    { when: "Document evaluation returns manuals repeatedly",
      then: "Stop submitting. A rising return rate means the manuals describe an operation the organisation cannot yet demonstrate, and further submissions consume the Authority's goodwill as well as your own time." },
    { when: "Funding slips behind the draw schedule",
      then: "Re-sequence to the gates rather than slowing every workstream equally. Regulatory and people work are cheap relative to fleet, and they are the two that cannot be compressed later." },
    { when: "First revenue is later than the model assumed",
      then: "Working capital is the binding constraint, not profit. Model the runway from the certificate date rather than from launch, and hold the difference in reserve before it is needed." }
  ]
};

if (typeof window !== "undefined") window.JKI = JKI;
