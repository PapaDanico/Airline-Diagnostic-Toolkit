/* ============================================================
   DN CONSULTANCY — Results page logic
   Strategic gap report: health index, domain gap table, radar,
   "Next Steps: From Diagnosis to Solution" prescriber, and the
   DN-Engagement-Key-gated Toolboxes B/C/D.
   ============================================================ */

(function () {
  /* ---- share-link ingestion: ?s=<base64-encoded answers> ---- */
  const _sp = new URLSearchParams(location.search).get("s");
  const _decoded = _sp ? decodeSharedAnswers(_sp) : null;
  const isShared = Boolean(_decoded);
  const answers = _decoded || loadAnswers();
  const s = computeScores(answers);
  const empty = document.getElementById("empty");
  const report = document.getElementById("report");

  if (!s.answeredAll) { empty.style.display = "block"; report.style.display = "none"; return; }
  empty.style.display = "none"; report.style.display = "block";

  const partnerQS = (() => { const p = new URLSearchParams(location.search).get("partner");
    return p ? "?partner=" + encodeURIComponent(p) : ""; })();

  /* ---- shareable URL (preserves existing params, adds ?s=) ---- */
  const shareURL = (() => {
    const p = new URLSearchParams(location.search);
    p.set("s", encodeAnswers(answers));
    return location.origin + location.pathname + "?" + p.toString();
  })();

  /* ---- shared-report banner (shown when opened via a share link) ---- */
  if (isShared) {
    const sb = document.getElementById("shared-banner");
    if (sb) {
      sb.style.display = "flex";
      sb.querySelector("a").href = "diagnostic.html" + partnerQS;
    }
    const ec = document.getElementById("email-capture-section");
    if (ec) ec.style.display = "none";
  }

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
    const bench = d.benchmark
      ? `<div class="bench"><b>Industry:</b> ${d.benchmark} <span class="src">— ${d.benchmarkSrc}</span></div>` : "";
    tr.innerHTML = `
      <td><strong>${d.name}</strong><br><span class="muted" style="font-size:.82rem">${d.blurb}</span>${bench}</td>
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
    const cask = d.caskLink ? `<div class="dn-tool"><a href="tools/cask-calculator.html${partnerQS}">→ Check your unit cost with our free CASK Benchmarking Calculator</a></div>` : "";
    const canvas = d.canvasLink ? `<div class="dn-tool"><a href="tools/operating-model-canvas.html${partnerQS}">→ Map the whole business with our free Operating Model Canvas</a></div>` : "";
    const std = d.standard ? `<div class="std">Aligns to recognised standard: <strong>${d.standard}</strong></div>` : "";
    div.innerHTML = `
      <h4>${d.name} — ${d.pct}% <span class="rag rag-${d.rag}" style="font-size:.8rem"><span class="dot"></span>${DN.ragLabel(d.pct)}</span></h4>
      <div class="cat">${d.rxCategory}</div>
      ${std}
      <div class="dn-tool">DN diagnostic that goes deeper: ${d.dnTool}</div>
      ${cask}
      ${canvas}
      ${fuel}`;
    rxHost.appendChild(div);
  });

  /* ---- smart tool recommendations based on top 3 gaps ---- */
  const topGaps = sorted.slice(0, 3);
  const relevantTools = new Set();
  topGaps.forEach(d => {
    /* matchAll over the whole string: secondary refs after ";" don't carry
       the "DN " prefix, so the old /^DN\s+([A-Z]\d)/ anchor missed them */
    if (d.dnTool) {
      for (const m of d.dnTool.matchAll(/\b([A-Z]\d)\b/g)) relevantTools.add(m[1]);
    }
  });
  if (relevantTools.size > 0) {
    const recHost = document.createElement("div");
    recHost.className = "dn-rec-panel";
    recHost.style.cssText = "margin-bottom:2rem;padding:1.4rem;background:var(--dn-steel-lt);border-radius:var(--radius);border-left:4px solid var(--accent)";
    recHost.innerHTML = `<p class="eyebrow" style="margin-top:0">Quick wins for your top gaps</p>
      <p style="margin:0.5rem 0;font-weight:600">Based on your ${topGaps.map(d => d.name).join(", ")} scores, these tools will give you quick insights:</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-top:1rem" id="rec-tools"></div>`;
    /* insert before the toolboxes <section>, not inside its .wrap */
    const toolboxSection = document.querySelector(".locked-grid").closest("section");
    toolboxSection.parentElement.insertBefore(recHost, toolboxSection);
    const recToolsHost = document.getElementById("rec-tools");
    DN.toolboxes.forEach(tb => {
      tb.tools.forEach(t => {
        if (relevantTools.has(t.ref)) {
          const c = document.createElement("div");
          c.style.cssText = "padding:0.8rem;background:var(--dn-white);border-radius:var(--radius-sm);font-size:0.85rem";
          c.innerHTML = `<div style="font-weight:700;color:var(--accent);margin-bottom:0.3rem">${t.ref}</div><div style="color:var(--dn-dark);line-height:1.4">${t.n}</div>`;
          recToolsHost.appendChild(c);
        }
      });
    });
  }

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
    const toolLinks = {
      "A1": "diagnostic.html",
      "A2": "tools/cask-calculator.html",
      "A3": "tools/data-request.html",
      "A4": "tools/operating-model-canvas.html",
      "B5": "#", // locked, no direct link
      "C5": "tools/training-tna.html"
    };
    DN.toolboxes.forEach(tb => {
      tb.tools.forEach(t => {
        const c = document.createElement(toolLinks[t.ref] ? "a" : "div");
        c.className = "toolcard" + (tb.locked ? " locked" : " unlocked");
        c.dataset.box = tb.box;
        if (toolLinks[t.ref]) {
          c.href = toolLinks[t.ref] + partnerQS;
          c.style.textDecoration = "none";
          c.style.color = "inherit";
        }
        c.innerHTML = `<span class="lockicon">${tb.locked ? "&#128274;" : "&#10003;"}</span>
          <span class="ref">Toolbox ${tb.box} · ${t.ref}</span>
          <h4>${t.n}</h4><p>${t.d}</p>`;
        host.appendChild(c);
      });
    });
  }

  /* ---- print-only report date ---- */
  const pd = document.getElementById("print-date");
  if (pd) pd.textContent = new Date().toLocaleDateString("en-GB",
    { day: "numeric", month: "long", year: "numeric" });

  /* ---- actions ---- */
  document.getElementById("retake").addEventListener("click", () => {
    if (confirm("Clear your answers and start over?")) {
      clearAnswers();
      location.href = "diagnostic.html" + partnerQS;
    }
  });
  document.getElementById("print").addEventListener("click", () => {
    window.print();
  });

  /* export data */
  const exportBtn = document.createElement("button");
  exportBtn.className = "btn btn-ghost";
  exportBtn.textContent = "↓ Export data";
  exportBtn.addEventListener("click", () => {
    const now = new Date();
    const exp = { scorecard: answers, index: s.index, domains: s.domains.map(d => ({name: d.name, score: d.pct, rag: d.rag})), timestamp: now.toISOString() };
    const blob = new Blob([JSON.stringify(exp, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dn-scorecard-${now.toISOString().split("T")[0]}.json`;
    /* append to DOM so Firefox/mobile WebViews honour the click;
       defer revoke so the browser has time to read the blob */
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  });
  const actionParent = document.getElementById("print") && document.getElementById("print").parentElement;
  if (actionParent) {
    actionParent.appendChild(exportBtn);
  }

  /* ---- share bar: WhatsApp · LinkedIn · copy link ---- */
  const shareBar = document.getElementById("share-bar");
  if (shareBar) {
    const shareMsg = `I just ran the Airline Health Scorecard — health index ${s.index}/100. Top gaps: ${sorted.slice(0, 2).map(d => `${d.name} (${d.pct}%)`).join(", ")}. Full report:`;

    const waA = document.createElement("a");
    waA.className = "share-btn share-btn-wa";
    waA.textContent = "Share via WhatsApp";
    waA.href = "https://wa.me/?text=" + encodeURIComponent(shareMsg + " " + shareURL);
    waA.target = "_blank"; waA.rel = "noopener";

    const liA = document.createElement("a");
    liA.className = "share-btn share-btn-li";
    liA.textContent = "Share on LinkedIn";
    liA.href = "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(shareURL);
    liA.target = "_blank"; liA.rel = "noopener";

    const copyBtn = document.createElement("button");
    copyBtn.className = "share-btn share-btn-copy";
    copyBtn.textContent = "Copy link";
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(shareURL);
        copyBtn.textContent = "✓ Copied";
      } catch {
        copyBtn.textContent = shareURL.slice(0, 40) + "…";
      }
      setTimeout(() => { copyBtn.textContent = "Copy link"; }, 2200);
    });

    shareBar.appendChild(waA);
    shareBar.appendChild(liA);
    shareBar.appendChild(copyBtn);
  }

  /* ---- email capture (Netlify Forms via fetch) ---- */
  if (sessionStorage.getItem("dn_report_sent") === "1") {
    const ec = document.getElementById("email-capture-section");
    if (ec) ec.style.display = "none";
  }
  const captureForm = document.getElementById("capture-form");
  if (captureForm) {
    captureForm.addEventListener("submit", async e => {
      e.preventDefault();
      const emailEl = document.getElementById("capture-email");
      const airlineEl = document.getElementById("capture-airline");
      const msg = document.getElementById("capture-msg");
      const submitBtn = captureForm.querySelector("button[type='submit']");
      const email = emailEl.value.trim();
      if (!email) { emailEl.focus(); return; }
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";
      try {
        const body = new URLSearchParams({
          "form-name": "scorecard-report",
          "bot-field": "",
          email,
          airline: airlineEl.value.trim(),
          health_index: String(s.index),
          top_gaps: sorted.slice(0, 3).map(d => `${d.name} (${d.pct}%)`).join(", "),
          share_url: shareURL
        });
        const resp = await fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString()
        });
        if (!resp.ok) throw new Error(resp.status);
        msg.textContent = "✓ Sent — check your inbox in a moment.";
        msg.style.color = "var(--dn-green)";
        submitBtn.textContent = "✓ Sent";
        sessionStorage.setItem("dn_report_sent", "1");
      } catch {
        msg.innerHTML = `Could not send — email us at <a href="mailto:${DN.brand.email}">${DN.brand.email}</a>`;
        msg.style.color = "var(--dn-red)";
        submitBtn.disabled = false;
        submitBtn.textContent = "Send my report →";
      }
    });
  }

  /* ---- book-a-call: mailto pre-filled + copy-link ---- */
  const bookEmailBtn = document.getElementById("book-email-btn");
  if (bookEmailBtn) {
    const gapSummary = sorted.slice(0, 3).map(d => `${d.name} (${d.pct}%)`).join(", ");
    bookEmailBtn.href = `mailto:${DN.brand.email}` +
      `?subject=${encodeURIComponent("DN Engagement — following my health scorecard")}` +
      `&body=${encodeURIComponent(
        `Hello,\n\nI have just completed the Airline Health Scorecard.\n\n` +
        `Health Index: ${s.index}/100\nTop gaps: ${gapSummary}\n\n` +
        `I would like to discuss how a DN engagement could help us close these gaps.\n\n` +
        `Full report: ${shareURL}`
      )}`;
  }
  const bookCopyBtn = document.getElementById("book-copy-btn");
  if (bookCopyBtn) {
    bookCopyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(shareURL);
        bookCopyBtn.textContent = "✓ Link copied";
      } catch {
        bookCopyBtn.textContent = "Copy failed";
      }
      setTimeout(() => { bookCopyBtn.textContent = "Copy report link"; }, 2200);
    });
  }
})();

/* ---- radar drawing ----
   Canvas is wider than tall so the long domain labels on the left/right
   axes get a gutter and never clip against the viewBox edge. Geometry is
   derived from the radius so the plot stays balanced, and labels longer
   than a threshold wrap onto two lines via <tspan>. */
function drawRadar(svg, domains) {
  const ns = "http://www.w3.org/2000/svg";
  const n = domains.length;
  const r = 120;                 // radar radius
  const labelGap = 16;           // distance from outer ring to label anchor
  const gutterX = 96, gutterY = 40; // room for wrapped side / top-bottom labels
  const W = r * 2 + gutterX * 2;
  const H = r * 2 + gutterY * 2;
  const cx = W / 2, cy = H / 2;
  const pt = (i, rad) => {
    const a = (Math.PI * 2 * i / n) - Math.PI / 2;
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  };
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
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
    line.setAttribute("x1", cx); line.setAttribute("y1", cy); line.setAttribute("x2", x); line.setAttribute("y2", y);
    line.setAttribute("stroke", "#D6E4F0"); svg.appendChild(line);

    const [lx, ly] = pt(i, r + labelGap);
    const anchor = lx < cx - 5 ? "end" : lx > cx + 5 ? "start" : "middle";
    const lines = wrapLabel(d.name, 16);
    const tx = document.createElementNS(ns, "text");
    tx.setAttribute("x", lx);
    tx.setAttribute("y", ly - (lines.length - 1) * 5.5); // vertically centre the block
    tx.setAttribute("text-anchor", anchor);
    tx.setAttribute("dominant-baseline", "middle");
    tx.setAttribute("font-size", "10"); tx.setAttribute("font-family", "DM Sans, sans-serif"); tx.setAttribute("fill", "#6B7280");
    lines.forEach((ln, j) => {
      const ts = document.createElementNS(ns, "tspan");
      ts.setAttribute("x", lx); if (j) ts.setAttribute("dy", "11");
      ts.textContent = ln;
      tx.appendChild(ts);
    });
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

/* Split a label into <=2 balanced lines if it exceeds maxChars, breaking
   on the space nearest the middle so neither line runs long. */
function wrapLabel(name, maxChars) {
  if (name.length <= maxChars) return [name];
  const words = name.split(" ");
  if (words.length < 2) return [name];
  const mid = name.length / 2;
  let best = 0, bestDist = Infinity, len = 0;
  for (let i = 0; i < words.length - 1; i++) {
    len += words[i].length + 1;
    const dist = Math.abs(len - mid);
    if (dist < bestDist) { bestDist = dist; best = i; }
  }
  return [words.slice(0, best + 1).join(" "), words.slice(best + 1).join(" ")];
}

/* ---- share-link encode / decode ----
   Serialises the 40 answers (0-4 per question, 'x' if unanswered) into a
   compact base64 string so results can be shared via URL (?s=...). */
function encodeAnswers(answers) {
  return btoa(DN.domains.map(d =>
    d.questions.map((_, qi) => {
      const v = (answers[d.id] || [])[qi];
      return Number.isInteger(v) ? String(v) : "x";
    }).join("")
  ).join(""));
}

function decodeSharedAnswers(encoded) {
  try {
    const str = atob(encoded);
    const expected = DN.domains.reduce((n, d) => n + d.questions.length, 0);
    if (str.length !== expected) return null;
    let pos = 0;
    const out = {};
    for (const d of DN.domains) {
      out[d.id] = d.questions.map(() => {
        const c = str[pos++];
        return c === "x" ? undefined : parseInt(c, 10);
      });
    }
    return out;
  } catch { return null; }
}
