/* ============================================================
   DN CONSULTANCY — Scorecard page logic (A1)
   Renders 8 domains × 5 questions, persists to localStorage,
   tracks progress, routes to results.
   ============================================================ */

(function () {
  const answers = loadAnswers();
  const host = document.getElementById("domains");
  const total = DN.domains.reduce((a, d) => a + d.questions.length, 0);

  DN.domains.forEach((d, di) => {
    if (!answers[d.id]) answers[d.id] = [];
    const block = document.createElement("section");
    block.className = "domain";
    block.innerHTML = `
      <header>
        <span class="dn-name">${di + 1}. ${d.name}</span>
        <span class="dn-w">weight ${d.weight}%</span>
      </header>
      <div class="qbody"></div>`;
    const body = block.querySelector(".qbody");

    d.questions.forEach((q, qi) => {
      const wrap = document.createElement("div");
      wrap.className = "q";
      const opts = q.o.map((label, oi) => {
        const checked = answers[d.id][qi] === oi;
        return `<label class="opt ${checked ? "sel" : ""}">
          <input type="radio" name="${d.id}_${qi}" value="${oi}" ${checked ? "checked" : ""}>
          <span>${label}</span></label>`;
      }).join("");
      wrap.innerHTML = `<div class="qtext"><b>Q${qi + 1}</b>${q.t}</div><div class="opts">${opts}</div>`;
      body.appendChild(wrap);

      wrap.querySelectorAll("input").forEach(inp => {
        inp.addEventListener("change", () => {
          answers[d.id][qi] = parseInt(inp.value, 10);
          wrap.querySelectorAll(".opt").forEach(o => o.classList.remove("sel"));
          inp.closest(".opt").classList.add("sel");
          saveAnswers(answers);
          updateProgress();
        });
      });
    });
    host.appendChild(block);
  });

  function answeredCount() {
    return DN.domains.reduce((a, d) =>
      a + (answers[d.id] || []).filter(v => Number.isInteger(v)).length, 0);
  }

  function updateProgress() {
    const n = answeredCount();
    const pct = Math.round((n / total) * 100);
    document.querySelector(".progress-bar > i").style.width = pct + "%";
    document.getElementById("progress-label").textContent =
      `${n} of ${total} answered (${pct}%)`;
    const btn = document.getElementById("see-results");
    btn.disabled = n < total;
    btn.classList.toggle("btn-ghost", n < total);
    btn.classList.toggle("btn-gold", n >= total);
    btn.textContent = n < total ? `Answer all to see your report (${total - n} left)` : "See my strategic report →";
  }

  document.getElementById("see-results").addEventListener("click", () => {
    if (answeredCount() < total) return;
    const p = new URLSearchParams(location.search).get("partner");
    location.href = "results.html" + (p ? "?partner=" + encodeURIComponent(p) : "");
  });

  document.getElementById("reset").addEventListener("click", () => {
    if (!confirm("Clear all your answers on this device?")) return;
    clearAnswers();
    location.reload();
  });

  updateProgress();
})();
