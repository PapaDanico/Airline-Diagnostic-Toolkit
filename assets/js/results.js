/* ============================================================
   DN CONSULTANCY — Results page logic
   Strategic gap report: health index, domain gap table, radar,
   "Next Steps: From Diagnosis to Solution" prescriber, and the
   DN-Engagement-Key-gated Toolboxes B/C/D.
   ============================================================ */

(function () {
  const answers = loadAnswers();
  const s = computeScores(answers);
  const empty = document.getElementById("empty");
  const report = document.getElementById("report");

  if (!s.answeredAll) { empty.style.display = "block"; report.style.display = "none"; return; }
  empty.style.display = "none"; report.style.display = "block";

  const partnerQS = (() => { const p = new URLSearchParams(location.search).get("partner");
    return p ? "?partner=" + encodeURIComponent(p) : ""; })();

  /* ---- health index ring ---- */
  const v = indexVerdict(s.index);
  const ring = document.getElementById("index-ring");
  ring.style.setProperty("--p", s.index);
  ring.style.setProperty("--ring-color",
    s.index < 45 ? "var(--dn-red)" : s.index < 65 ? "var(--dn-amber)" : "var(--dn-gold)");
  document.getElementById("index-val").textContent = s.index;
  document.getElementById("index-band").textContent = v.band;
  document.getElementById("index-band").style.color = v.color;
  document.getElementById("index-text").textContent = v.text;

  /* ---- gap table (sorted weakest-first to read like a findings page) ---- */
  const sorted = [...s.domains].sort((a, b) => a.pct - b.pct);
  const tbody = document.getElementById("gap-body");
  sorted.forEach(d => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${d.name}</strong><br><span class="muted" style="font-size:.82rem">${d.blurb}</span></td>
      <td>${d.weight}%</td>
      <td class="barcell"><div class="bar"><i class="fill-${d.rag}" style="width:${d.pct}%"></i></div></td>
      <td><strong>${d.pct}%</strong></td>
      <td><span class="rag rag-${d.rag}"><span class="dot"></span>${DN.ragLabel(d.pct)}</span></td>`;
    tbody.appendChild(tr);
  });

  /* ---- radar chart (lightweight inline SVG, no library) ---- */
  drawRadar(document.getElementById("radar"), s.domains);

  /* ---- prescriber: lowest-scoring domains first ---- */
  const rxHost = document.getElementById("rx");
  const weak = sorted.filter(d => d.pct < 65);
  const list = (weak.length ? weak : sorted.slice(0, 3));
  list.forEach(d => {
    const div = document.createElement("div");
    div.className = "rx";
    const fuel = d.fuelLink ? `<div class="dn-tool"><a href="tools/fuel-optimizer.html${partnerQS}">→ Get a quick estimate with our free Fuel Contract Optimizer Lite</a></div>` : "";
    div.innerHTML = `
      <h4>${d.name} — ${d.pct}% <span class="rag rag-${d.rag}" style="font-size:.8rem"><span class="dot"></span>${DN.ragLabel(d.pct)}</span></h4>
      <div class="cat">${d.rxCategory}</div>
      <div class="dn-tool">DN diagnostic that goes deeper: ${d.dnTool}</div>
      ${fuel}`;
    rxHost.appendChild(div);
  });

  /* ---- locked Toolboxes B/C/D (DN Engagement Key gate) ---- */
  renderToolboxes();
  const unlocked = sessionStorage.getItem("dn_unlocked") === "1";
  if (unlocked) setUnlocked(true);

  document.getElementById("key-apply").addEventListener("click", () => {
    const val = document.getElementById("key-input").value.trim();
    const msg = document.getElementById("key-msg");
    if (val.toUpperCase() === DN.engagementKey) {
      sessionStorage.setItem("dn_unlocked", "1"); setUnlocked(true);
      msg.textContent = "Unlocked — full toolbox previews enabled."; msg.className = "keymsg rag-green";
    } else {
      msg.innerHTML = `Invalid key. <a href="mailto:${DN.brand.email}?subject=DN%20Engagement%20Key%20request">Request your DN Engagement Key →</a>`;
      msg.className = "keymsg rag-amber";
    }
  });

  function setUnlocked(on) {
    document.querySelectorAll(".toolcard").forEach(c => {
      if (c.dataset.box === "A") return;
      c.classList.toggle("unlocked", on);
      c.querySelector(".lockicon").innerHTML = on ? "&#10003;" : "&#128274;";
    });
  }

  function renderToolboxes() {
    const host = document.getElementById("toolboxes");
    DN.toolboxes.forEach(tb => {
      tb.tools.forEach(t => {
        const c = document.createElement("div");
        c.className = "toolcard" + (tb.locked ? " locked" : " unlocked");
        c.dataset.box = tb.box;
        c.innerHTML = `<span class="lockicon">${tb.locked ? "&#128274;" : "&#10003;"}</span>
          <span class="ref">Toolbox ${tb.box} · ${t.ref}</span>
          <h4>${t.n}</h4><p>${t.d}</p>`;
        host.appendChild(c);
      });
    });
  }

  /* ---- actions ---- */
  document.getElementById("retake").addEventListener("click", () =>
    location.href = "diagnostic.html" + partnerQS);
  document.getElementById("print").addEventListener("click", () => window.print());
})();

/* ---- radar drawing ---- */
function drawRadar(svg, domains) {
  const size = 360, c = size / 2, r = c - 54, n = domains.length;
  const ns = "http://www.w3.org/2000/svg";
  const pt = (i, rad) => {
    const a = (Math.PI * 2 * i / n) - Math.PI / 2;
    return [c + rad * Math.cos(a), c + rad * Math.sin(a)];
  };
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  // rings
  [0.25, 0.5, 0.75, 1].forEach(f => {
    const poly = document.createElementNS(ns, "polygon");
    poly.setAttribute("points", domains.map((_, i) => pt(i, r * f).join(",")).join(" "));
    poly.setAttribute("fill", "none"); poly.setAttribute("stroke", "#D6E4F0"); poly.setAttribute("stroke-width", "1");
    svg.appendChild(poly);
  });
  // axes + labels
  domains.forEach((d, i) => {
    const [x, y] = pt(i, r);
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", c); line.setAttribute("y1", c); line.setAttribute("x2", x); line.setAttribute("y2", y);
    line.setAttribute("stroke", "#D6E4F0"); svg.appendChild(line);
    const [lx, ly] = pt(i, r + 22);
    const tx = document.createElementNS(ns, "text");
    tx.setAttribute("x", lx); tx.setAttribute("y", ly);
    tx.setAttribute("text-anchor", lx < c - 5 ? "end" : lx > c + 5 ? "start" : "middle");
    tx.setAttribute("dominant-baseline", "middle");
    tx.setAttribute("font-size", "9.5"); tx.setAttribute("font-family", "DM Sans, sans-serif"); tx.setAttribute("fill", "#6B7280");
    tx.textContent = d.name.replace(" & ", " &​");
    svg.appendChild(tx);
  });
  // data polygon
  const poly = document.createElementNS(ns, "polygon");
  poly.setAttribute("points", domains.map((d, i) => pt(i, r * d.pct / 100).join(",")).join(" "));
  poly.setAttribute("fill", "rgba(74,127,165,.28)"); poly.setAttribute("stroke", "#4A7FA5"); poly.setAttribute("stroke-width", "2");
  svg.appendChild(poly);
  domains.forEach((d, i) => {
    const [x, y] = pt(i, r * d.pct / 100);
    const dot = document.createElementNS(ns, "circle");
    dot.setAttribute("cx", x); dot.setAttribute("cy", y); dot.setAttribute("r", "3.2");
    dot.setAttribute("fill", d.pct < 45 ? "#C0392B" : d.pct < 65 ? "#D4AC0D" : "#1E8449");
    svg.appendChild(dot);
  });
}
