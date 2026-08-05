/* Extracted verbatim from tutorial.html so the site can carry a real
   script-src. Behaviour is unchanged: the tag sits where the inline
   block sat, with no defer or async, so execution order is identical.
   Edit here, not in the HTML. */

(function () {
  applyPartner(); mountChrome();
  document.getElementById("cta-mail").href = toolMailto("Tutorial", "Venture enquiry",
    "I worked through the tutorial and would like to discuss my venture.\n\n");
})();
