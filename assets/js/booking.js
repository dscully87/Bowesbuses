/* Bowe's Mini Bus Service — booking page
   Checks live availability from the fleet diary and submits
   a booking with status "pending" for admin review. */
(function () {
  "use strict";

  const form = document.getElementById("booking-form");
  if (!form || !window.BowesStore) return;

  const dateInput = document.getElementById("bk-date");
  const paxInput = document.getElementById("bk-passengers");
  const availPanel = document.getElementById("availability-panel");
  const availList = document.getElementById("availability-list");
  const errorBox = document.getElementById("booking-error");
  const successBox = document.getElementById("booking-success");
  const refSpan = document.getElementById("booking-ref");

  // can't book in the past
  dateInput.min = BowesStore.todayISO();

  function refreshAvailability() {
    const date = dateInput.value;
    const pax = parseInt(paxInput.value, 10) || 0;
    if (!date) { availPanel.hidden = true; return; }

    const buses = BowesStore.busesAvailableOn(BowesStore.get(), date, pax);
    availPanel.hidden = false;

    if (buses.length === 0) {
      availList.innerHTML =
        '<span class="avail-pill none">No suitable bus free on this date' +
        (pax ? " for " + pax + " passengers" : "") +
        " — submit anyway and we'll see what we can arrange, or try another date.</span>";
    } else {
      availList.innerHTML = buses.map(b =>
        '<span class="avail-pill">' + escapeHtml(b.name) + " · " + b.seats + " seats</span>"
      ).join("");
    }
  }

  dateInput.addEventListener("change", refreshAvailability);
  paxInput.addEventListener("input", refreshAvailability);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    errorBox.hidden = true;

    if (!form.checkValidity()) {
      errorBox.textContent = "Please fill in all required fields (marked *).";
      errorBox.hidden = false;
      form.reportValidity();
      return;
    }

    const record = BowesStore.addBooking({
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      passengers: parseInt(form.passengers.value, 10),
      date: form.date.value,
      time: form.time.value,
      pickup: form.pickup.value.trim(),
      destination: form.destination.value.trim(),
      notes: form.notes.value.trim()
    });

    refSpan.textContent = record.id.toUpperCase();
    successBox.hidden = false;
    form.reset();
    availPanel.hidden = true;
    successBox.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
})();
