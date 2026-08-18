/* AOC acquisition — the data behind buying a certificate rather than earning one.

   The premise the whole tool rests on: an Air Operator Certificate is
   not an asset and cannot be sold. It is issued to a named legal person
   against a named organisation, and it does not travel with a hangar, a
   fleet or a customer list. A buyer who structures the deal as an asset
   purchase acquires aeroplanes and loses the only thing they were
   buying, which is why the structure question comes before the price
   question and not after it.

   What a buyer therefore acquires is the company — and everything else
   the company is. Every band below exists because that inheritance has
   a cost the headline price does not name.

   Bands are JK planning figures for a small East African commercial
   operator, stated as ranges because the honest answer to "what does
   this cost" is a range until diligence closes. They are not
   quotations. Where a figure is a regulatory requirement rather than a
   planning estimate it is cited and says so. */

const JKA = {

  /* ---- routes ------------------------------------------------------
     Two ways to buy an operating business, and only one of them keeps
     the certificate. This is not a preference. */
  routes: [
    {
      id: "share", name: "Share purchase", keepsAoc: true,
      d: "Buy the company that holds the certificate. The certificate never moves, because the legal person holding it never changes — only its ownership does.",
      cost: "You inherit every liability the company carries, disclosed or not: tax arrears, employment claims, litigation, maintenance obligations, lessor positions.",
      c: ["act", "aoc"]
    },
    {
      id: "asset", name: "Asset purchase", keepsAoc: false,
      d: "Buy the aircraft, spares, contracts and people, leaving the old company behind with its liabilities.",
      cost: "The certificate stays with the company you did not buy. You now hold a fleet and no authority to operate it, and you are a greenfield applicant with aeroplanes on the ramp burning parking fees.",
      c: ["act", "aoc"]
    }
  ],

  /* ---- remediation --------------------------------------------------
     What it costs to make an acquired certificate usable. Almost none
     of this appears in a seller's information memorandum, because none
     of it is a liability on the balance sheet — it is the gap between
     a certificate that exists and a certificate that supports the
     operation the buyer intends to run. */
  remediation: [
    { id: "manuals", k: "Manual re-issue and re-approval", lo: 25000, hi: 90000,
      why: "Operations Manual Parts A–D, SMS manual and MEL name the accountable manager, the organisation and the scope. A change of control invalidates the first two and usually the third.",
      c: ["aoc", "sms"] },
    { id: "postholders", k: "Postholder recruitment and re-acceptance", lo: 30000, hi: 120000,
      why: "The Authority accepts postholders as individuals. Sellers' key people frequently leave at completion, and each replacement is a fresh acceptance with its own lead time.",
      c: ["aoc", "pel"] },
    { id: "findings", k: "Open finding close-out", lo: 15000, hi: 150000,
      why: "An operator that is for sale has usually been managing cash, not findings. The backlog transfers with the company and the clock on it does not reset at completion.",
      c: ["aoc"] },
    { id: "records", k: "Technical records reconciliation", lo: 40000, hi: 250000,
      why: "Back-to-birth traceability gaps on life-limited parts are the single most expensive thing diligence finds late. An unprovable component is a scrapped component.",
      c: ["airworth"] },
    { id: "deferred", k: "Deferred maintenance catch-up", lo: 150000, hi: 1200000,
      why: "Checks pushed right ahead of a sale. The buyer funds them in the first year whatever the SPA says, because the aircraft cannot fly otherwise.",
      c: ["airworth"] },
    { id: "insurance", k: "Insurance re-rating on change of control", lo: 20000, hi: 80000,
      why: "Hull and liability cover is written against a named management team and a claims history. Both change at completion, and the renewal quote arrives afterwards.",
      c: [] },
    { id: "wc", k: "Working capital injection", lo: 200000, hi: 900000, cat: "wc",
      why: "An operator being sold is usually being sold because it ran out of runway. The buyer funds the payables that were stretched to keep it flying to completion.",
      c: [] }
  ],

  /* ---- transaction costs -------------------------------------------
     The professional fees a share purchase actually carries. Technical
     diligence is listed separately from financial because buyers
     routinely commission the second and skip the first, then discover
     the records position after signing. */
  dealCosts: [
    { id: "legal", k: "Legal — SPA, warranties, escrow", lo: 40000, hi: 150000,
      why: "A share purchase transfers unknown liabilities, so the warranty and indemnity package is the deal, not paperwork around it." },
    { id: "findd", k: "Financial and tax due diligence", lo: 25000, hi: 90000,
      why: "Tax arrears follow the company. So do the penalties and interest that accrued while nobody was looking." },
    { id: "techdd", k: "Technical and airworthiness due diligence", lo: 30000, hi: 110000,
      why: "The one diligence stream that reads the aircraft records and the finding register. Skipping it is how a buyer funds the records line above at the top of its band." },
    { id: "regdd", k: "Regulatory counsel and filings", lo: 10000, hi: 40000,
      why: "Change-of-control notification, air service licence variation, and the argument for why this is a change of ownership rather than a new applicant." }
  ],

  /* ---- gates ---------------------------------------------------------
     What has to happen with the Authority after the deal is agreed.
     The 14-day notification is a requirement. The elapsed bands are JK
     planning figures — no authority publishes a service level for
     these — and they run concurrently, not in series, which is why the
     tool takes the longest rather than the sum. */
  gates: [
    { id: "notify", k: "Notify the Authority of the change of control", lo: 0.5, hi: 0.5,
      d: "Required within 14 days of the change. A notification made late is a finding on a certificate you now own.",
      req: true, c: ["aoc", "act"] },
    { id: "shareholding", k: "Notify any shareholding change at or above 10%", lo: 0.5, hi: 0.5,
      d: "Separate from the control notification and triggered at a much lower threshold — a minority co-investor in the buying vehicle can trip it on its own.",
      req: true, c: ["aoc"] },
    { id: "keypeople", k: "Notify changes of key personnel", lo: 0.5, hi: 0.5,
      d: "Required within 14 days. Every postholder the buyer replaces is a separate notification.",
      req: true, c: ["aoc", "pel"] },
    { id: "acceptance", k: "Postholder acceptance for each replacement", lo: 1, hi: 3,
      d: "Credential review and an interview with the Authority per postholder. Runs in parallel across postholders but not instantly, and a rejected nominee restarts it.",
      req: false, c: ["aoc", "pel"] },
    { id: "amend", k: "Amend the AOC and Operations Specifications", lo: 1, hi: 2.5,
      d: "The certificate is reissued against the new ownership and any changed scope. Manuals have to be approved before this closes.",
      req: false, c: ["aoc"] },
    { id: "asl", k: "Vary the Air Service Licence for the new ownership", lo: 1.5, hi: 4,
      d: "A separate instrument from the AOC with its own ownership test, and the gate most often missed in deal planning because the AOC gets all the attention.",
      req: false, c: ["airsvc"] }
  ],

  /* ---- diligence red flags -------------------------------------------
     The findings that make a certificate worth less than the company's
     net assets — in the worst cases, worth less than nothing, because
     the buyer funds a remediation programme to reach a position they
     could have certified into from scratch.

     "stop" means renegotiate or walk; "warn" means price it. */
  redFlags: [
    { id: "level1", t: "Open Level 1 findings", sev: "stop",
      d: "A Level 1 is an immediate hazard finding. It suspends or restricts the certificate, and it is the seller's problem only until completion.", c: ["aoc"] },
    { id: "dormant", t: "Certificate dormant — no operations in the recent period", sev: "stop",
      d: "A certificate not exercised is a certificate the Authority may treat as lapsed or requiring re-demonstration. A dormant AOC can be worth nothing at all, and it is the cheapest kind to buy for exactly that reason.", c: ["aoc"] },
    { id: "enforcement", t: "Pending enforcement or a suspension in the last three years", sev: "stop",
      d: "Regulatory history attaches to the organisation, not the shareholder. It shapes surveillance intensity for years and is invisible in financial diligence.", c: ["act"] },
    { id: "leaseconsent", t: "Lessor change-of-control consents not obtained", sev: "stop",
      d: "Almost every aircraft lease makes a change of control an event of default. Without written consents the fleet can be repossessed on the day the deal completes.", c: [] },
    { id: "vacantposts", t: "Accepted postholder positions vacant or lapsed", sev: "warn",
      d: "The organisation the certificate was issued against no longer exists as described. Price the recruitment and the acceptance lead time.", c: ["aoc", "pel"] },
    { id: "opsspecs", t: "Aircraft on the register but off the Operations Specifications", sev: "warn",
      d: "An aircraft not on the Ops Specs cannot be operated commercially under the certificate. Buyers routinely value a fleet the certificate does not actually cover.", c: ["aoc"] },
    { id: "charges", t: "Unpaid navigation, airport or handling charges", sev: "warn",
      d: "These attach to the operator and in some jurisdictions ground the aircraft. They are also a reliable indicator of how the rest of the payables ledger looks.", c: [] },
    { id: "reserves", t: "Maintenance reserves under-funded against the lease", sev: "warn",
      d: "A shortfall against contractual reserve balances is a real liability that sits outside the aircraft's own condition and is settled in cash at redelivery.", c: [] },
    { id: "tax", t: "Tax arrears, penalties or an open assessment", sev: "warn",
      d: "A share purchase inherits the assessment and the interest that ran while it was disputed.", c: [] },
    { id: "employment", t: "Employment liabilities — gratuity, unpaid leave, union agreements", sev: "warn",
      d: "Crew terms and accrued entitlements transfer with the company and are frequently unaccrued in management accounts.", c: [] }
  ]
};

if (typeof window !== "undefined") window.JKA = JKA;
