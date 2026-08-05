/* Extracted verbatim from regulations.html so the site can carry a real
   script-src. Behaviour is unchanged: the tag sits where the inline
   block sat, with no defer or async, so execution order is identical.
   Edit here, not in the HTML. */

(function () {
  applyPartner(); mountChrome();
  const $ = id => document.getElementById(id);

  /* Which sectors cite each key. Derived from the sector definitions
     rather than restated, so the index cannot drift from the tool. */
  const boundBy = {};
  JKV.sectors.forEach(s => {
    const keys = new Set(s.cites || []);
    JKV.phaseSpine.forEach(p => (s.items[p.id] || []).forEach(it => (it.c || []).forEach(k => keys.add(k))));
    keys.forEach(k => { (boundBy[k] = boundBy[k] || []).push(s); });
  });

  /* Statutes and regulations carry legal force; circulars and ICAO
     material carry the working detail. Ordering by that distinction is
     the difference between a reference and a list. */
  const LAW = new Set(["act", "aoc", "amo", "pel", "uas", "aerodrome", "ats", "aerialwk", "genav",
                       "rota", "instr", "dgr", "ais", "airsvc", "ato", "sms", "gh"]);
  const entries = Object.keys(JKV.cites).map(k => ({ k, c: JKV.cites[k], law: LAW.has(k), secs: boundBy[k] || [] }));
  const rank = e => {
    if (!e.law) return 3;
    // gazetted instruments before unconfirmed ones, statute first of all
    if (e.k === "act") return 0;
    return e.c.s === "verified" ? 1 : 2;
  };
  entries.sort((a, b) => rank(a) - rank(b) || a.c.ref.localeCompare(b.c.ref, "en", { numeric: true }));

  const verified = entries.filter(e => e.c.s === "verified").length;
  $("t-count").textContent = entries.length;
  $("t-verified").textContent = verified;
  $("t-unconfirmed").textContent = entries.length - verified;

  /* ---------- filters ---------- */
  let active = "all";
  const filters = [{ id: "all", label: "All instruments" }].concat(
    JKV.sectors.map(s => ({ id: s.id, label: `${s.icon} ${s.short}` })));
  $("filters").innerHTML = filters.map(f =>
    `<button type="button" class="seg" data-f="${f.id}" aria-pressed="${f.id === "all"}">${escapeHtml(f.label)}</button>`).join("");
  $("filters").querySelectorAll(".seg").forEach(b => b.addEventListener("click", () => {
    active = b.dataset.f;
    $("filters").querySelectorAll(".seg").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.f === active)));
    renderTable();
  }));

  function renderTable() {
    const rows = entries.filter(e => active === "all" || e.secs.some(s => s.id === active));
    $("reg-body").innerHTML = rows.length ? rows.map(e => {
      const ref = e.c.url
        ? `<a href="${escapeHtml(e.c.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(e.c.ref)}</a>`
        : escapeHtml(e.c.ref);
      // The long form doubles as the caveat on unconfirmed entries, so it
      // is shown in full rather than truncated to a tooltip.
      return `<tr>
        <td class="ref-cell">${ref}</td>
        <td>${escapeHtml(e.c.long)}</td>
        <td><span class="st ${e.c.s === "verified" ? "st-ok" : "st-un"}">${e.c.s === "verified" ? "Verified" : "Unconfirmed"}</span></td>
        <td class="sec-cell">${e.secs.length === JKV.sectors.length ? "All six sectors"
          : e.secs.length ? e.secs.map(s => escapeHtml(s.short)).join(" · ") : "General"}</td>
      </tr>`;
    }).join("") : `<tr><td colspan="4" class="muted">No indexed instrument is mapped to that sector.</td></tr>`;
  }
  renderTable();

  $("verified-on").textContent =
    `Verified against the gazette record on ${new Date(JKV.CITE_META.verifiedOn).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}. ` +
    JKV.CITE_META.note;

  /* ---------- unconfirmed detail ---------- */
  $("unconfirmed").innerHTML = entries.filter(e => e.c.s !== "verified").map(e => `
    <div class="note warn" style="max-width:860px">
      <b>${escapeHtml(e.c.ref)}</b>${escapeHtml(e.c.long)}
      ${e.c.url ? ` <a href="${escapeHtml(e.c.url)}" target="_blank" rel="noopener noreferrer">Source →</a>` : ""}
    </div>`).join("");

  /* ---------- by sector ---------- */
  $("sec-map").innerHTML = JKV.sectors.map(s => `
    <article class="card card-flat">
      <h3><span aria-hidden="true">${s.icon}</span> ${escapeHtml(s.name)}</h3>
      <p class="muted" style="font-size:.86rem;margin:.2rem 0 0">${escapeHtml(s.regLine)}</p>
      <div class="cites">${citeChips(s.cites)}</div>
      <p style="margin:1rem 0 0"><a href="tools/certification-navigator.html?sector=${encodeURIComponent(s.id)}" data-keep-partner>Open the pathway →</a></p>
    </article>`).join("");
  keepPartnerParam($("sec-map"), activePartnerKey());

  /* ---------- sources ---------- */
  $("src-list").innerHTML = JKV.CITE_META.sources.map(s =>
    `<li><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.label)}</a></li>`).join("");

  /* ---------- edition identity, citation and download ---------- */
  const edition = corpusEdition(JKV.cites, JKV.CITE_META);
  $("edition-label").textContent = edition.label;
  $("edition-strip").hidden = false;

  /* An embedded copy must say whose corpus it is and link home. A
     partner carrying the index under their own chrome is the point of
     embedding; an unattributed one is a different thing entirely. */
  if (isEmbedded()) {
    const home = location.origin + location.pathname;
    $("embed-attrib").innerHTML =
      `<b>Kenya Aviation Regulatory Index</b> \u2014 ${escapeHtml(edition.label)}. ` +
      `Maintained by JK &amp; Associates and verified against the Kenya Law gazette record. ` +
      `<a href="${escapeHtml(home)}" target="_blank" rel="noopener noreferrer">View the full index \u2192</a>`;
  }

  $("edition-cite").addEventListener("click", async () => {
    const btn = $("edition-cite");
    const text = corpusCitation(edition, location.origin + location.pathname);
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = "\u2713 Citation copied";
    } catch {
      /* Clipboard is unavailable on insecure origins and older mobile
         browsers. Show the citation rather than report a failure — the
         text exists either way and the reader can select it. */
      const box = document.createElement("textarea");
      box.readOnly = true; box.value = text; box.rows = 3;
      box.style.cssText = "width:100%;margin-top:.5rem;font-size:.78rem";
      btn.after(box); box.focus(); box.select();
      btn.textContent = "Select and copy";
      return;
    }
    setTimeout(() => { btn.textContent = "Copy citation"; }, 2200);
  });

  $("edition-download").addEventListener("click", () => {
    /* CSV, not JSON: this is read by people, in a spreadsheet, beside a
       compliance matrix they are already keeping. The edition line is
       the first row so a file that has been renamed, forwarded or
       printed still says which corpus it is. */
    const esc = v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
    const rows = [
      ["JK & Associates — Kenya Aviation Regulatory Index"],
      ["Edition", `${edition.year}.${edition.seq}`, "Digest", edition.digest],
      ["Instruments", edition.count, "Unconfirmed", edition.unconfirmed],
      ["Verified against the Kenya Law gazette record on", edition.verifiedOn],
      ["Source", location.origin + location.pathname],
      [],
      ["Key", "Status", "Reference", "Instrument", "URL"]
    ];
    for (const k of Object.keys(JKV.cites).sort()) {
      const c = JKV.cites[k];
      rows.push([k, c.s, c.ref, c.long, c.url || ""]);
    }
    const csv = rows.map(r => r.map(esc).join(",")).join("\r\n");
    // BOM so Excel opens the em-dashes and £/§ in instrument titles as
    // UTF-8 rather than mojibake.
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `jk-regulatory-index-${edition.year}.${edition.seq}-${edition.digest}.csv`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  });

  $("cta-mail").href = toolMailto("Regulatory", "Certification pathway",
    "I would like to discuss the regulatory pathway for a venture in Kenya.\n\n");
})();
