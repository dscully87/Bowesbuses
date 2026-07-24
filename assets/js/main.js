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

})();
