/* Extracted verbatim from partners.html so the site can carry a real
   script-src. Behaviour is unchanged: the tag sits where the inline
   block sat, with no defer or async, so execution order is identical.
   Edit here, not in the HTML. */

applyPartner(); mountChrome();
document.querySelector("[data-partner-mailto]").href =
  `mailto:${JK.brand.email}?subject=${encodeURIComponent("Partner programme — Airline Health Scorecard")}` +
  `&body=${encodeURIComponent("Hello JK,\n\nWe'd like to explore distributing the Airline Health Scorecard to our clients.\n\nOrganisation:\nWhat we provide to airlines:\nApprox. number of airline clients:\n\nRegards,")}`;
