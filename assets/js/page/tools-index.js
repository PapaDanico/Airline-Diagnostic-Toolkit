/* Extracted verbatim from tools/index.html so the site can carry a real
   script-src. Behaviour is unchanged: the tag sits where the inline
   block sat, with no defer or async, so execution order is identical.
   Edit here, not in the HTML. */

applyPartner(); mountChrome();

/* The count comes from the registry the menu is built from, so it cannot
   drift when a tool is added: the page said "Twelve" with eighteen live. */
const TOOL_TOTAL = TOOL_MENU.reduce((n, g) => n + g.items.length, 0);
document.querySelectorAll("[data-tool-count]").forEach(el => { el.textContent = TOOL_TOTAL; });

/* Filter chips. Static buttons, built once in the markup; a click only
   toggles `hidden` on cards and on a whole track when nothing in it matches,
   so nothing is rebuilt under the visitor's cursor. */
(function () {
  const bar = document.getElementById("tool-filter");
  if (!bar) return;
  const cards = [...document.querySelectorAll(".toolcard2")];
  const secs = [...document.querySelectorAll(".toolsec")];
  const out = document.getElementById("tool-filter-count");
  function apply(key) {
    cards.forEach(c => {
      const hit = key === "all" || c.dataset.track === key || (key === "review" && c.dataset.use === "review");
      c.hidden = !hit;
    });
    secs.forEach(s => { s.hidden = !s.querySelector(".toolcard2:not([hidden])"); });
    bar.querySelectorAll(".chip").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.filter === key)));
    const n = cards.filter(c => !c.hidden && c.dataset.track !== "reference").length;
    out.textContent = n + (n === 1 ? " tool" : " tools");
  }
  bar.addEventListener("click", e => { const b = e.target.closest(".chip"); if (b) apply(b.dataset.filter); });
  apply("all");
})();
