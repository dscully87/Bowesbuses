/* =========================================================
   Bowe's Mini Bus Service — admin panel
   Runs entirely in the browser on demo data (see data.js).
   Swap BowesStore for real API calls when the backend lands.
   ========================================================= */
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function fmtDate(iso) {
    return new Date(iso + "T12:00:00").toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" });
  }

  /* ================= login gate (demo only) ================= */

  const gate = $("#login-gate");
  const shell = $("#admin-shell");

  function showAdmin() {
    gate.hidden = true;
    shell.hidden = false;
    renderAll();
  }

  if (sessionStorage.getItem("bowes_admin_demo") === "1") {
    showAdmin();
  }

  $("#login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    sessionStorage.setItem("bowes_admin_demo", "1");
    showAdmin();
  });

  $("#logout").addEventListener("click", function () {
    sessionStorage.removeItem("bowes_admin_demo");
    location.reload();
  });

  $("#reset-demo").addEventListener("click", function () {
    if (confirm("Reset all demo data back to the starting examples?")) {
      BowesStore.reset();
      renderAll();
    }
  });

  /* ================= tabs ================= */

  const TITLES = {
    dashboard: "Dashboard", bookings: "Bookings",
    diary: "Availability Diary", fleet: "Fleet", drivers: "Drivers"
  };

  $$(".sidebar nav button").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".sidebar nav button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      $$(".panel").forEach(p => p.classList.remove("active"));
      $("#panel-" + btn.dataset.panel).classList.add("active");
      $("#panel-title").textContent = TITLES[btn.dataset.panel];
    });
  });

  $("#today-label").textContent = new Date().toLocaleDateString("en-IE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  /* ================= render everything ================= */

  function renderAll() {
    const data = BowesStore.get();
    renderStats(data);
    renderWeeklyChart(data);
    renderStatusBreakdown(data);
    renderUpcoming(data);
    renderPending(data);
    renderAllBookings(data);
    renderDiary(data);
    renderFleet(data);
    renderDrivers(data);
  }

  /* ---------- dashboard: stat tiles ---------- */

  function renderStats(data) {
    const today = BowesStore.todayISO();
    const monthPrefix = today.slice(0, 7);
    const pending = data.bookings.filter(b => b.status === "pending").length;
    const upcoming = data.bookings.filter(b => b.status === "confirmed" && b.date >= today).length;
    const thisMonth = data.bookings.filter(b => b.createdAt && b.createdAt.slice(0, 7) === monthPrefix).length;
    const freeToday = BowesStore.busesAvailableOn(data, today).length;
    const activeFleet = data.fleet.filter(b => b.status === "active").length;

    $("#stat-tiles").innerHTML = `
      <div class="stat attn">
        <div class="label">⏳ Pending review</div>
        <div class="value">${pending}</div>
        <div class="delta">awaiting a decision</div>
      </div>
      <div class="stat">
        <div class="label">✅ Confirmed upcoming</div>
        <div class="value">${upcoming}</div>
        <div class="delta">trips on the books</div>
      </div>
      <div class="stat">
        <div class="label">📥 Requests this month</div>
        <div class="value">${thisMonth}</div>
        <div class="delta">all statuses</div>
      </div>
      <div class="stat">
        <div class="label">🚌 Buses free today</div>
        <div class="value">${freeToday}<span style="font-size:1rem;color:var(--ink-soft);"> / ${activeFleet}</span></div>
        <div class="delta">of active fleet</div>
      </div>`;
  }

  /* ---------- dashboard: weekly bar chart (SVG, single hue) ---------- */

  function renderWeeklyChart(data) {
    const WEEKS = 8;
    const now = new Date();
    const buckets = [];
    for (let i = WEEKS - 1; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(start.getDate() - start.getDay() + 1 - i * 7); // Monday of week
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      buckets.push({
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
        label: start.toLocaleDateString("en-IE", { day: "numeric", month: "short" }),
        count: 0
      });
    }
    data.bookings.forEach(b => {
      const c = b.createdAt || b.date;
      const bucket = buckets.find(w => c >= w.start && c <= w.end);
      if (bucket) bucket.count++;
    });

    const W = 640, H = 220, padL = 34, padB = 28, padT = 14;
    const max = Math.max(3, ...buckets.map(b => b.count));
    const innerW = W - padL - 10, innerH = H - padT - padB;
    const bw = Math.min(48, innerW / buckets.length * 0.6);
    const step = innerW / buckets.length;

    let bars = "", labels = "", grid = "";
    const ticks = max <= 5 ? max : 5;
    for (let t = 0; t <= ticks; t++) {
      const v = Math.round(max * t / ticks);
      const y = padT + innerH - innerH * t / ticks;
      grid += `<line x1="${padL}" y1="${y}" x2="${W - 10}" y2="${y}"></line>`;
      labels += `<text x="${padL - 8}" y="${y + 4}" text-anchor="end">${v}</text>`;
    }

    buckets.forEach((b, i) => {
      const h = innerH * b.count / max;
      const x = padL + step * i + (step - bw) / 2;
      const y = padT + innerH - h;
      const r = Math.min(4, h); // rounded top only, anchored to baseline
      if (b.count > 0) {
        bars += `<path class="bar" data-tip="Week of ${b.label}: ${b.count} booking${b.count === 1 ? "" : "s"}"
          d="M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + bw - r},${y} Q${x + bw},${y} ${x + bw},${y + r} L${x + bw},${y + h} Z"></path>`;
        bars += `<text class="chart-value" x="${x + bw / 2}" y="${y - 5}" text-anchor="middle">${b.count}</text>`;
      }
      labels += `<text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle">${b.label}</text>`;
    });

    $("#weekly-chart").innerHTML =
      `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Bar chart of booking requests per week for the last 8 weeks">
        <g class="chart-grid">${grid}</g>
        <g>${bars}</g>
        <g class="chart-axis">${labels}</g>
      </svg>`;

    attachTooltips($("#weekly-chart"));
  }

  function attachTooltips(root) {
    let tip = null;
    root.addEventListener("mousemove", e => {
      const t = e.target.closest("[data-tip]");
      if (!t) { if (tip) { tip.remove(); tip = null; } return; }
      if (!tip) { tip = document.createElement("div"); tip.className = "chart-tooltip"; document.body.appendChild(tip); }
      tip.textContent = t.dataset.tip;
      tip.style.left = e.clientX + "px";
      tip.style.top = e.clientY + "px";
    });
    root.addEventListener("mouseleave", () => { if (tip) { tip.remove(); tip = null; } });
  }

  /* ---------- dashboard: status breakdown ---------- */

  function renderStatusBreakdown(data) {
    const order = ["pending", "confirmed", "completed", "declined"];
    const labels = { pending: "⏳ Pending", confirmed: "✅ Confirmed", completed: "🏁 Completed", declined: "✖ Declined" };
    const total = data.bookings.length || 1;
    $("#status-breakdown").innerHTML = order.map(st => {
      const n = data.bookings.filter(b => b.status === st).length;
      return `<div class="status-row">
        <span>${labels[st]}</span>
        <div class="track"><div class="fill" style="width:${(n / total * 100).toFixed(1)}%"></div></div>
        <span class="n">${n}</span>
      </div>`;
    }).join("");
  }

  /* ---------- dashboard: next 7 days ---------- */

  function renderUpcoming(data) {
    const today = BowesStore.todayISO();
    const limit = BowesStore.todayISO(7);
    const rows = data.bookings
      .filter(b => b.date >= today && b.date <= limit && (b.status === "confirmed" || b.status === "pending"))
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    $("#upcoming-rows").innerHTML = rows.length ? rows.map(b => `
      <tr>
        <td>${fmtDate(b.date)}<div class="small">${esc(b.time)}</div></td>
        <td>${esc(b.name)}</td>
        <td>${esc(b.pickup)} → ${esc(b.destination)}</td>
        <td>${b.passengers}</td>
        <td>${busName(data, b.busId)}</td>
        <td>${driverName(data, b.driverId)}</td>
        <td><span class="badge ${b.status}">${b.status}</span></td>
      </tr>`).join("")
      : `<tr><td colspan="7" class="empty">No trips in the next 7 days.</td></tr>`;
  }

  function busName(data, id) {
    const b = data.fleet.find(x => x.id === id);
    return b ? esc(b.name) : "<span class='small'>—</span>";
  }
  function driverName(data, id) {
    const d = data.drivers.find(x => x.id === id);
    return d ? esc(d.name) : "<span class='small'>—</span>";
  }

  /* ---------- bookings: pending review ---------- */

  function renderPending(data) {
    const pending = data.bookings
      .filter(b => b.status === "pending")
      .sort((a, b) => a.date.localeCompare(b.date));

    $("#pending-rows").innerHTML = pending.length ? pending.map(b => {
      const buses = BowesStore.busesAvailableOn(data, b.date, b.passengers);
      const drivers = BowesStore.driversAvailableOn(data, b.date);
      return `<tr data-id="${b.id}">
        <td>${fmtDate(b.createdAt || b.date)}</td>
        <td>${esc(b.name)}<div class="small">${esc(b.phone)}${b.email ? " · " + esc(b.email) : ""}</div></td>
        <td>${fmtDate(b.date)} ${esc(b.time)}<div class="small">${esc(b.pickup)} → ${esc(b.destination)}</div>
            ${b.notes ? `<div class="small">📝 ${esc(b.notes)}</div>` : ""}</td>
        <td>${b.passengers}</td>
        <td>
          <select class="inline-assign assign-bus">
            <option value="">— select bus —</option>
            ${buses.map(x => `<option value="${x.id}">${esc(x.name)} (${x.seats})</option>`).join("")}
          </select>
          ${buses.length === 0 ? `<div class="small">⚠ no suitable bus free</div>` : ""}
        </td>
        <td>
          <select class="inline-assign assign-driver">
            <option value="">— select driver —</option>
            ${drivers.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join("")}
          </select>
          ${drivers.length === 0 ? `<div class="small">⚠ no driver free</div>` : ""}
        </td>
        <td>
          <button class="btn btn-approve btn-sm act-approve">Approve</button>
          <button class="btn btn-decline btn-sm act-decline">Decline</button>
        </td>
      </tr>`;
    }).join("")
    : `<tr><td colspan="7" class="empty">🎉 Nothing waiting for review.</td></tr>`;
  }

  $("#pending-rows").addEventListener("click", function (e) {
    const row = e.target.closest("tr[data-id]");
    if (!row) return;
    const id = row.dataset.id;

    if (e.target.classList.contains("act-approve")) {
      const busId = row.querySelector(".assign-bus").value;
      const driverId = row.querySelector(".assign-driver").value;
      if (!busId || !driverId) {
        alert("Assign both a bus and a driver before approving — only free ones are listed.");
        return;
      }
      BowesStore.updateBooking(id, { status: "confirmed", busId, driverId });
      renderAll();
    } else if (e.target.classList.contains("act-decline")) {
      if (confirm("Decline this booking request?")) {
        BowesStore.updateBooking(id, { status: "declined" });
        renderAll();
      }
    }
  });

  /* ---------- bookings: all ---------- */

  function renderAllBookings(data) {
    const rows = data.bookings.slice().sort((a, b) => b.date.localeCompare(a.date));
    $("#all-booking-rows").innerHTML = rows.length ? rows.map(b => `
      <tr data-id="${b.id}">
        <td>${fmtDate(b.date)}<div class="small">${esc(b.time)}</div></td>
        <td>${esc(b.name)}</td>
        <td>${esc(b.pickup)} → ${esc(b.destination)}</td>
        <td>${b.passengers}</td>
        <td>${busName(data, b.busId)}</td>
        <td>${driverName(data, b.driverId)}</td>
        <td><span class="badge ${b.status}">${b.status}</span></td>
        <td>${b.status === "confirmed"
          ? `<button class="btn btn-ghost btn-sm act-complete">Mark completed</button>
             <button class="btn btn-decline btn-sm act-cancel">Cancel</button>` : ""}</td>
      </tr>`).join("")
      : `<tr><td colspan="8" class="empty">No bookings yet.</td></tr>`;
  }

  $("#all-booking-rows").addEventListener("click", function (e) {
    const row = e.target.closest("tr[data-id]");
    if (!row) return;
    if (e.target.classList.contains("act-complete")) {
      BowesStore.updateBooking(row.dataset.id, { status: "completed" });
      renderAll();
    } else if (e.target.classList.contains("act-cancel")) {
      if (confirm("Cancel this confirmed booking? The bus and driver become free again.")) {
        BowesStore.updateBooking(row.dataset.id, { status: "declined" });
        renderAll();
      }
    }
  });

  /* ---------- diary ---------- */

  function renderDiary(data) {
    const DAYS = 14;
    const today = BowesStore.todayISO();
    const dates = [];
    for (let i = 0; i < DAYS; i++) dates.push(BowesStore.todayISO(i));

    let head = "<tr><th class='bus-col'>Bus</th>" + dates.map(d => {
      const dt = new Date(d + "T12:00:00");
      return `<th class="${d === today ? "today" : ""}">${dt.toLocaleDateString("en-IE", { weekday: "short" })}<br>${dt.getDate()}/${dt.getMonth() + 1}</th>`;
    }).join("") + "</tr>";

    let body = data.fleet.map(bus => {
      const cells = dates.map(d => {
        if (bus.status === "maintenance") return `<td class="maint" title="${esc(bus.name)} in maintenance">🔧</td>`;
        const bk = data.bookings.find(b => b.status === "confirmed" && b.date === d && b.busId === bus.id);
        return bk
          ? `<td class="booked" title="${esc(bk.name)}: ${esc(bk.pickup)} → ${esc(bk.destination)}">●</td>`
          : `<td class="free">✓</td>`;
      }).join("");
      return `<tr><th class="bus-col">${esc(bus.name)}<div class="small" style="font-weight:400;">${bus.seats} seats · ${esc(bus.reg)}</div></th>${cells}</tr>`;
    }).join("");

    $("#diary-table").innerHTML = `<table class="diary"><thead>${head}</thead><tbody>${body}</tbody></table>`;
  }

  /* ---------- fleet ---------- */

  function renderFleet(data) {
    $("#fleet-rows").innerHTML = data.fleet.map(bus => `
      <tr data-id="${bus.id}">
        <td><strong>${esc(bus.name)}</strong></td>
        <td>${esc(bus.reg)}</td>
        <td>${esc(bus.type)}</td>
        <td>${bus.seats}</td>
        <td><span class="badge ${bus.status}">${bus.status}</span></td>
        <td class="small">${esc(bus.notes)}</td>
        <td>
          <button class="btn btn-ghost btn-sm act-toggle">${bus.status === "active" ? "→ Maintenance" : "→ Active"}</button>
        </td>
      </tr>`).join("");
  }

  $("#fleet-rows").addEventListener("click", function (e) {
    const row = e.target.closest("tr[data-id]");
    if (!row || !e.target.classList.contains("act-toggle")) return;
    const data = BowesStore.get();
    const bus = data.fleet.find(b => b.id === row.dataset.id);
    BowesStore.updateBus(bus.id, { status: bus.status === "active" ? "maintenance" : "active" });
    renderAll();
  });

  $("#add-bus-form").addEventListener("submit", function (e) {
    e.preventDefault();
    BowesStore.addBus({
      name: $("#bus-name").value.trim(),
      reg: $("#bus-reg").value.trim(),
      type: $("#bus-type").value,
      seats: parseInt($("#bus-seats").value, 10)
    });
    this.reset();
    $("#bus-seats").value = 16;
    renderAll();
  });

  /* ---------- drivers ---------- */

  function renderDrivers(data) {
    const today = BowesStore.todayISO();
    $("#driver-rows").innerHTML = data.drivers.map(d => {
      const upcoming = data.bookings
        .filter(b => b.status === "confirmed" && b.driverId === d.id && b.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date));
      return `<tr data-id="${d.id}">
        <td><strong>${esc(d.name)}</strong></td>
        <td>${esc(d.phone)}</td>
        <td>${esc(d.licence)}</td>
        <td>${WEEKDAYS.map(day => `
          <label style="display:inline-flex;align-items:center;gap:0.2rem;margin-right:0.5rem;font-size:0.8rem;white-space:nowrap;">
            <input type="checkbox" class="dayoff" value="${day}" ${d.daysOff.includes(day) ? "checked" : ""}>${day.slice(0, 3)}
          </label>`).join("")}</td>
        <td>${upcoming.length ? upcoming.map(b =>
          `<div class="small">${fmtDate(b.date)} — ${esc(b.name)} (${busName(data, b.busId)})</div>`).join("")
          : "<span class='small'>none</span>"}</td>
      </tr>`;
    }).join("");
  }

  $("#driver-rows").addEventListener("change", function (e) {
    if (!e.target.classList.contains("dayoff")) return;
    const row = e.target.closest("tr[data-id]");
    const daysOff = $$(".dayoff:checked", row).map(cb => cb.value);
    BowesStore.updateDriver(row.dataset.id, { daysOff });
    renderAll();
  });

  $("#add-driver-form").addEventListener("submit", function (e) {
    e.preventDefault();
    BowesStore.addDriver({
      name: $("#drv-name").value.trim(),
      phone: $("#drv-phone").value.trim(),
      licence: $("#drv-licence").value
    });
    this.reset();
    renderAll();
  });

})();
