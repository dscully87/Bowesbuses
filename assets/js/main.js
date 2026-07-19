/* Bowe's Mini Bus Service — public site scripts */
(function () {
  "use strict";

  // footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // fleet showcase (home page) — driven by the same data the admin manages,
  // so fleet changes in the admin panel show up here automatically.
  const grid = document.getElementById("fleet-grid");
  if (grid && window.BowesStore) {
    const data = BowesStore.get();
    const activeFleet = data.fleet.filter(b => b.status === "active");
    grid.innerHTML = activeFleet.map(bus => `
      <div class="card fleet-card">
        <div class="photo-placeholder">📷 Photo placeholder<br />(${escapeHtml(bus.name)})</div>
        <div class="body">
          <span class="seats">${bus.seats} seats</span>
          <h3>${escapeHtml(bus.name)}</h3>
          <p>${escapeHtml(bus.type)}${bus.notes ? " — " + escapeHtml(bus.notes) : ""}</p>
        </div>
      </div>
    `).join("");
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
})();
