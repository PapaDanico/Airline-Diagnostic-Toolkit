/* Extracted verbatim from tools/data-request.html so the site can carry a real
   script-src. Behaviour is unchanged: the tag sits where the inline
   block sat, with no defer or async, so execution order is identical.
   Edit here, not in the HTML. */

(function() {
  const allCheckboxes = document.querySelectorAll('.dr-item input[type="checkbox"]');
  function updateProgress() {
    const checked = Array.from(allCheckboxes).filter(c => c.checked).length;
    const total = allCheckboxes.length;
    const pct = Math.round((checked / total) * 100);
    document.getElementById('collected-count').textContent = checked;
    document.getElementById('progress-pct').textContent = pct + '%';
    reportingWrite(() => localStorage.setItem('dn_data_request_progress', JSON.stringify(Array.from(allCheckboxes).map(c => c.checked))));
  }
  allCheckboxes.forEach(checkbox => { checkbox.addEventListener('change', updateProgress); });
  let saved = null;
  try { saved = localStorage.getItem('dn_data_request_progress'); } catch {}
  if (saved) {
    try {
      const checked = JSON.parse(saved);
      allCheckboxes.forEach((c, i) => { c.checked = checked[i] || false; });
      updateProgress();
    } catch {}
  }
})();

/* The page told the reader to "download and email this checklist" and
   then gave them nowhere to download it from — an instruction with no
   control behind it, which is a worse defect than a missing feature
   because it reads as the reader's mistake.

   Two ways out, because the two uses differ. Print is for the version
   that goes into a pack; the CSV is for the one that gets mailed to
   ops, finance and planning with a deadline against each line, which
   is what step one of the instructions actually describes. Both carry
   the ticks already saved in the browser. */
(function () {
  mountPrintHead("Data Request Checklist",
    "Baseline diagnostic data pack — collection status");

  const rows = () => [...document.querySelectorAll(".dr-item")].map((li) => {
    const box = li.querySelector('input[type="checkbox"]');
    const strong = li.querySelector("strong");
    /* The PRIORITY chip lives inside <strong>; lift it out rather than
       letting it run into the item name in the exported cell. */
    const priority = strong?.querySelector(".dr-priority");
    const name = strong ? strong.textContent.replace(priority?.textContent || "", "").trim() : "";
    return {
      /* h2 OR h3: the groups are .dr-section > h3 and the first version
         looked only for h2. It produced a clean, complete-looking CSV
         with the Section column blank on all 28 rows — the one column
         that makes the export sortable by the team it gets mailed to. */
      section: li.closest("section")?.querySelector("h2, h3")?.textContent.trim() || "",
      item: name,
      detail: li.querySelector(".hint")?.textContent.trim() || "",
      priority: priority ? "PRIORITY" : "",
      collected: box?.checked ? "yes" : "no"
    };
  });

  const cell = (s) => `"${String(s).replace(/"/g, '""')}"`;

  document.getElementById("dr-csv").addEventListener("click", () => {
    const data = rows();
    const csv = [["Section", "Item", "Detail", "Priority", "Collected", "Owner", "Due"]]
      .concat(data.map((r) => [r.section, r.item, r.detail, r.priority, r.collected, "", ""]))
      .map((r) => r.map(cell).join(",")).join("\r\n");

    /* Owner and Due ship empty on purpose. The instruction is to send
       this out with a 48-hour deadline against each line, and a column
       that already exists gets filled in; one the recipient has to add
       does not. */
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `JK-data-request-checklist-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  document.getElementById("print").addEventListener("click", () => window.print());
})();
