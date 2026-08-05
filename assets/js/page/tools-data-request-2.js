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
    try { localStorage.setItem('dn_data_request_progress', JSON.stringify(Array.from(allCheckboxes).map(c => c.checked))); } catch {}
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
