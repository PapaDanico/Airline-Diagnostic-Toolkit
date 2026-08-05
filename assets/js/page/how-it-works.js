/* Extracted verbatim from how-it-works.html so the site can carry a real
   script-src. Behaviour is unchanged: the tag sits where the inline
   block sat, with no defer or async, so execution order is identical.
   Edit here, not in the HTML. */

applyPartner(); mountChrome();
const ph = document.getElementById("phases");
JK.phases.forEach(p => ph.insertAdjacentHTML("beforeend",
  `<div class="phase"><span class="days">${p.days}</span><h4>${p.t}</h4><p>${p.d}</p></div>`));
wireToolEnquiryForm("brief-enquiry", "How It Works — Engagement Brief");
