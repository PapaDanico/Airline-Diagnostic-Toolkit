/* Extracted verbatim from faq.html so the site can carry a real
   script-src. Behaviour is unchanged: the tag sits where the inline
   block sat, with no defer or async, so execution order is identical.
   Edit here, not in the HTML. */

(function () {
  applyPartner(); mountChrome();
  const $ = id => document.getElementById(id);

  /* The questions and answers are authored directly in the markup above,
     not rendered from a JS array. They were built from an array once and
     that cost 0.41 of cumulative layout shift on every load — four times
     the threshold Google calls "good" — because the entire body of the
     page arrived after first paint. It also meant any crawler that does
     not execute JavaScript saw an empty FAQ, on the one page whose whole
     purpose is being found. Static markup fixes both, and the script
     below only wires behaviour to it. */

  const panels = [...document.querySelectorAll(".qa .a")];
  document.querySelectorAll(".qa h3 button").forEach(btn => {
    const panel = document.getElementById(btn.getAttribute("aria-controls"));
    btn.addEventListener("click", () => {
      const open = panel.hidden;
      panel.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
    });
  });

  const setAll = open => panels.forEach(p => {
    p.hidden = !open;
    document.getElementById(p.getAttribute("aria-labelledby")).setAttribute("aria-expanded", String(open));
  });
  $("expand-all").addEventListener("click", () => setAll(true));
  $("collapse-all").addEventListener("click", () => setAll(false));
  $("print").addEventListener("click", () => window.print());

  /* A deep link to a collapsed answer would land on a closed accordion
     and read as a dead anchor, so open it and scroll it into view. */
  function openFromHash() {
    const h = location.hash.replace("#", "");
    if (!h) return;
    const panel = document.getElementById("a-" + h) || document.getElementById(h);
    if (!panel) return;
    if (panel.classList.contains("a")) {
      panel.hidden = false;
      document.getElementById(panel.getAttribute("aria-labelledby")).setAttribute("aria-expanded", "true");
    }
    requestAnimationFrame(() => panel.scrollIntoView({ block: "center" }));
  }
  window.addEventListener("hashchange", openFromHash);
  openFromHash();

  $("cta-mail").href = toolMailto("FAQ", "Question about a venture",
    "My question is:\n\n");

  /* Structured data, read back off the rendered DOM. Deriving it from
     the page itself rather than from a parallel source means the markup
     cannot describe an answer the page does not carry. */
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [...document.querySelectorAll(".qa")].map(qa => ({
      "@type": "Question",
      name: qa.querySelector("h3 button").textContent.trim(),
      acceptedAnswer: { "@type": "Answer",
        text: qa.querySelector(".a").textContent.replace(/\s+/g, " ").trim() }
    }))
  };
  const el = document.createElement("script");
  el.type = "application/ld+json";
  el.textContent = JSON.stringify(ld);
  document.head.appendChild(el);
})();
