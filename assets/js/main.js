/* Bowe's Mini Bus Service — public site scripts */
(function () {
  "use strict";

  const prefersReduced =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- footer year ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- sticky header scroll state ---------- */
  const header = document.getElementById("site-header");
  if (header && !header.classList.contains("solid")) {
    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- mobile navigation ---------- */
  const toggle = document.getElementById("nav-toggle");
  const backdrop = document.getElementById("nav-backdrop");
  const nav = document.getElementById("main-nav");

  function closeNav() {
    document.body.classList.remove("nav-open");
    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
    }
  }
  function openNav() {
    document.body.classList.add("nav-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close menu");
  }

  if (toggle) {
    toggle.addEventListener("click", () => {
      document.body.classList.contains("nav-open") ? closeNav() : openNav();
    });
  }
  if (backdrop) backdrop.addEventListener("click", closeNav);
  if (nav) {
    nav.addEventListener("click", (e) => {
      if (e.target.closest("a")) closeNav();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNav();
  });

  /* ---------- scroll reveal ---------- */
  const revealEls = Array.from(document.querySelectorAll("[data-reveal]"));
  if (prefersReduced || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  } else {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- reusable minibus illustration ---------- */
  function busSVG() {
    return (
      '<svg class="bus-illo" viewBox="0 0 260 120" fill="none" aria-hidden="true">' +
      '<ellipse cx="130" cy="108" rx="104" ry="8" fill="rgba(0,0,0,.18)"/>' +
      '<path d="M18 44c0-6 4-10 10-10h150c8 0 14 3 20 9l28 26c3 3 5 7 5 11v10c0 5-4 9-9 9H24c-4 0-7-3-7-7V44Z" fill="#ffffff"/>' +
      '<path d="M18 78h218v10c0 5-4 9-9 9H24c-4 0-6-3-6-7V78Z" fill="#ffd100"/>' +
      '<rect x="30" y="42" width="30" height="22" rx="4" fill="#bcd4f5"/>' +
      '<rect x="66" y="42" width="30" height="22" rx="4" fill="#bcd4f5"/>' +
      '<rect x="102" y="42" width="30" height="22" rx="4" fill="#bcd4f5"/>' +
      '<rect x="138" y="42" width="30" height="22" rx="4" fill="#bcd4f5"/>' +
      '<path d="M178 40h6c6 0 11 2 16 7l14 15h-36V40Z" fill="#bcd4f5"/>' +
      '<rect x="18" y="60" width="218" height="6" fill="#2b3990"/>' +
      '<circle cx="72" cy="97" r="15" fill="#1b2150"/><circle cx="72" cy="97" r="7" fill="#c4cbeb"/>' +
      '<circle cx="192" cy="97" r="15" fill="#1b2150"/><circle cx="192" cy="97" r="7" fill="#c4cbeb"/>' +
      "</svg>"
    );
  }

  /* ---------- fleet showcase (home page) ---------- */
  const grid = document.getElementById("fleet-grid");
  if (grid && window.BowesStore) {
    const data = BowesStore.get();
    const activeFleet = data.fleet.filter((b) => b.status === "active");

    grid.innerHTML = activeFleet
      .map((bus, i) => {
        const feats = [];
        if (bus.reg) feats.push("Reg " + esc(bus.reg));
        if (bus.notes) {
          bus.notes.split(/[,·]/).forEach((n) => {
            const t = n.trim();
            if (t) feats.push(esc(t));
          });
        }
        const featHtml = feats
          .slice(0, 3)
          .map((f) => "<li>" + f + "</li>")
          .join("");

        return (
          '<article class="card fleet-card hoverable" data-reveal style="--reveal-delay:' +
          i * 70 +
          'ms">' +
          '<div class="fleet-media">' +
          '<span class="seat-badge">' + bus.seats + " seats</span>" +
          busSVG() +
          "</div>" +
          '<div class="body">' +
          '<span class="type-tag">' + esc(bus.type) + "</span>" +
          "<h3>" + esc(bus.name) + "</h3>" +
          "<p>Comfortable, well-maintained and ready for your group.</p>" +
          (featHtml ? '<ul class="feats">' + featHtml + "</ul>" : "") +
          "</div>" +
          "</article>"
        );
      })
      .join("");

    // reveal the freshly injected fleet cards
    const injected = Array.from(grid.querySelectorAll("[data-reveal]"));
    if (prefersReduced || !("IntersectionObserver" in window)) {
      injected.forEach((el) => el.classList.add("is-visible"));
    } else {
      const io2 = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              obs.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
      );
      injected.forEach((el) => io2.observe(el));
    }
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }
})();
