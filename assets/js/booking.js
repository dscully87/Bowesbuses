/* Bowe's Mini Bus Service - step-through booking wizard
   One question at a time with a progress bar. Checks live
   availability from the fleet diary and submits a booking
   with status "pending" for admin review. */
(function () {
  "use strict";

  const form = document.getElementById("booking-form");
  if (!form || !window.BowesStore) return;

  const steps = Array.from(form.querySelectorAll(".wizard-step"));
  const backBtn = document.getElementById("wz-back");
  const nextBtn = document.getElementById("wz-next");
  const submitBtn = document.getElementById("wz-submit");
  const reviewHint = document.getElementById("wz-review-hint");

  const progressLabel = document.getElementById("wp-label");
  const progressPct = document.getElementById("wp-pct");
  const progressBar = document.getElementById("wp-bar");
  const progressFill = document.getElementById("wp-fill");

  const dateInput = document.getElementById("bk-date");
  const paxInput = document.getElementById("bk-passengers");
  const destInput = document.getElementById("bk-destination");
  const returnInput = document.getElementById("bk-return");
  const destCommons = document.getElementById("destination-commons");
  const availPanel = document.getElementById("availability-panel");
  const availList = document.getElementById("availability-list");
  const errorBox = document.getElementById("booking-error");
  const successBox = document.getElementById("booking-success");
  const refSpan = document.getElementById("booking-ref");
  const recapBox = document.getElementById("trip-recap");
  const recapList = document.getElementById("trip-recap-list");

  let current = 0;

  // can't book in the past
  dateInput.min = BowesStore.todayISO();

  /* ---------- progress bar ---------- */

  function setProgress(pct, label) {
    progressFill.style.width = pct + "%";
    progressBar.setAttribute("aria-valuenow", String(pct));
    progressPct.textContent = pct + "%";
    progressLabel.textContent = label;
  }

  function progressFor(stepIndex) {
    // share of steps completed; 100% is reserved for the submitted state
    return Math.round((stepIndex / steps.length) * 100);
  }

  /* ---------- step navigation ---------- */

  function showStep(index, skipFocus) {
    current = index;
    steps.forEach((step, i) => step.classList.toggle("is-active", i === index));

    const last = index === steps.length - 1;
    backBtn.hidden = index === 0;
    nextBtn.hidden = last;
    submitBtn.hidden = !last;
    reviewHint.hidden = !last;
    errorBox.hidden = true;

    const title = steps[index].getAttribute("data-step-title");
    setProgress(progressFor(index), "Step " + (index + 1) + " of " + steps.length + ": " + title);

    if (steps[index].contains(availPanel)) refreshAvailability();
    if (last) buildRecap();

    if (!skipFocus) {
      const firstField = steps[index].querySelector("input, textarea, select");
      if (firstField) firstField.focus({ preventScroll: true });
    }
  }

  function fieldLabel(field) {
    const label = form.querySelector('label[for="' + field.id + '"]');
    return label ? label.textContent.replace("*", "").trim().toLowerCase() : "this field";
  }

  // a message that names the field and says how to fix it
  function messageFor(field) {
    const v = field.validity;
    if (v.valueMissing) return "Please add your " + fieldLabel(field) + ".";
    if (field.id === "bk-date" && v.rangeUnderflow) return "That date has passed. Pick today or a later date.";
    if (field.id === "bk-passengers" && v.rangeOverflow)
      return "We can take up to 60 passengers per booking. For a bigger group, call us and we'll split it across buses.";
    if (field.id === "bk-passengers" && (v.rangeUnderflow || v.badInput)) return "Enter how many passengers are travelling (at least 1).";
    if (field.id === "bk-email" && v.typeMismatch) return "That email address doesn't look right. Check it, or leave it blank and we'll phone you.";
    return "Check your " + fieldLabel(field) + ": " + field.validationMessage;
  }

  function validateStep(index) {
    const fields = Array.from(steps[index].querySelectorAll("input, textarea, select"));
    fields.forEach((f) => f.removeAttribute("aria-invalid"));
    for (const field of fields) {
      if (!field.checkValidity()) {
        errorBox.textContent = messageFor(field);
        errorBox.hidden = false;
        field.setAttribute("aria-invalid", "true");
        field.setAttribute("aria-describedby", "booking-error");
        field.focus();
        return false;
      }
    }
    errorBox.hidden = true;
    return true;
  }

  // clear the error state as soon as the field is fixed
  form.addEventListener("input", (e) => {
    if (e.target.getAttribute("aria-invalid") === "true" && e.target.checkValidity()) {
      e.target.removeAttribute("aria-invalid");
      errorBox.hidden = true;
    }
  });

  backBtn.addEventListener("click", () => showStep(current - 1));
  nextBtn.addEventListener("click", () => {
    if (validateStep(current)) showStep(current + 1);
  });

  // Enter moves you forward instead of submitting early
  form.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && current < steps.length - 1) {
      e.preventDefault();
      nextBtn.click();
    }
  });

  /* ---------- popular destinations (step 1) ---------- */

  if (destCommons) {
    destCommons.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip-btn");
      if (!chip) return;
      destInput.value = chip.getAttribute("data-dest");
      // fire input so the chip highlight and any error state update
      destInput.dispatchEvent(new Event("input", { bubbles: true }));
      destInput.focus({ preventScroll: true });
    });
    // typing your own destination clears the highlighted chip
    destInput.addEventListener("input", () => {
      destCommons.querySelectorAll(".chip-btn").forEach(c =>
        c.classList.toggle("is-active", c.getAttribute("data-dest") === destInput.value));
    });
  }

  /* ---------- live availability (step 2) ---------- */

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
        ". Submit anyway and we'll see what we can arrange, or try another date.</span>";
    } else {
      availList.innerHTML = buses.map(b =>
        '<span class="avail-pill">' + escapeHtml(b.name) + " · " + b.seats + " seats</span>"
      ).join("");
    }
  }

  dateInput.addEventListener("change", refreshAvailability);
  paxInput.addEventListener("input", refreshAvailability);

  /* ---------- recap (final step) ---------- */

  function buildRecap() {
    const rows = [
      ["Route", form.pickup.value.trim() + " → " + form.destination.value.trim()],
      ["Return journey", returnInput && returnInput.checked ? "Yes" : "No"],
      ["Date", formatDate(form.date.value)],
      ["Pickup time", form.time.value],
      ["Passengers", form.passengers.value]
    ];
    if (form.notes.value.trim()) rows.push(["Notes", form.notes.value.trim()]);
    recapList.innerHTML = rows.map(([k, v]) =>
      "<li><span>" + k + "</span><strong>" + escapeHtml(v) + "</strong></li>"
    ).join("");
    recapBox.hidden = false;
  }

  // "2026-10-14" -> "Wed 14 Oct 2026"
  function formatDate(iso) {
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  }

  /* ---------- submit ---------- */

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    // re-check every step; jump back to the first one with a problem
    for (let i = 0; i < steps.length; i++) {
      const bad = Array.from(steps[i].querySelectorAll("input, textarea, select")).some(f => !f.checkValidity());
      if (bad) {
        if (i !== current) showStep(i, true);
        validateStep(i);
        return;
      }
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
      returnTrip: returnInput ? returnInput.checked : false,
      notes: form.notes.value.trim()
    });

    refSpan.textContent = record.id.toUpperCase();
    form.hidden = true;
    successBox.hidden = false;
    setProgress(100, "All done, request sent");
    successBox.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  showStep(0, true);
})();
