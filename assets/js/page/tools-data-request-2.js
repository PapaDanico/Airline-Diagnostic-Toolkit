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

  /* ---- answer-first opening page for the printed pack ----

     A collection checklist printed as a percentage is a progress bar on
     paper. What the person chasing it needs is which lines are still
     out, and the two facts that decide whether the diagnostic can
     start: whether the priority items have landed, and whether any one
     section has returned nothing at all.

     A section at zero is a different problem from the same number of
     ticks missing across five sections. It usually means one team never
     received the request, and it is invisible in a completion figure
     that averages every section together. */
  function summarise() {
    const data = rows();
    if (!data.length) return mountPrintSummary(null);

    const outstanding = data.filter((r) => r.collected === "no");
    const priorityOut = outstanding.filter((r) => r.priority);
    const collected = data.length - outstanding.length;
    const pct = Math.round((collected / data.length) * 100);

    const sections = [...new Set(data.map((r) => r.section))].filter(Boolean);
    const silent = sections.filter((s) =>
      data.filter((r) => r.section === s).every((r) => r.collected === "no"));

    const f = [];

    if (priorityOut.length) f.push({ sev: "stop",
      h: `${priorityOut.length} priority item${priorityOut.length > 1 ? "s" : ""} still outstanding`,
      d: `${priorityOut.slice(0, 3).map((r) => r.item).join("; ")}${priorityOut.length > 3 ? `; and ${priorityOut.length - 3} more` : ""}. These are the lines the baseline is built from — the diagnostic can begin without the rest and cannot begin without these.` });

    if (silent.length) f.push({ sev: "warn",
      h: `${silent.length} section${silent.length > 1 ? "s have" : " has"} returned nothing at all`,
      d: `${silent.join("; ")}. A section at zero usually means the request never reached the team that owns it rather than that the team is slow — worth a call before the next chase.` });

    if (outstanding.length && !priorityOut.length) f.push({ sev: "warn",
      h: `${outstanding.length} of ${data.length} items outstanding`,
      d: `Every priority line is in, so the baseline can be built. The remainder deepen it: ${outstanding.slice(0, 3).map((r) => r.item).join("; ")}${outstanding.length > 3 ? `; and ${outstanding.length - 3} more` : ""}.` });

    if (!outstanding.length) f.push({ sev: "ok", h: `All ${data.length} items collected`,
      d: `The data pack is complete across ${sections.length} sections. Nothing in the baseline is now waiting on the operator.` });

    mountPrintSummary({
      title: "Baseline diagnostic data pack",
      verdict: `${collected} of ${data.length} items collected (${pct}%)` +
        (priorityOut.length
          ? ` — ${priorityOut.length} priority line${priorityOut.length > 1 ? "s" : ""} still out`
          : outstanding.length ? " — every priority line in" : " — complete"),
      findings: f,
      basis: `Collection status as ticked on this device, across ${sections.length} sections and ${data.length} items. Priority lines are those the baseline analysis cannot be built without. Export the CSV to send this out with an owner and a deadline against each line.`
    });
  }

  /* Wired here rather than into the progress counter in the IIFE above:
     that one owns the saved ticks and this one owns the deliverable, and
     reaching across between them is how one ends up silently unwired. */
  document.querySelectorAll('.dr-item input[type="checkbox"]')
    .forEach((c) => c.addEventListener("change", summarise));
  summarise();

  document.getElementById("print").addEventListener("click", () => window.print());
  wireToolEnquiryForm("dr-enquiry", "48-Hour Data Request");
})();
