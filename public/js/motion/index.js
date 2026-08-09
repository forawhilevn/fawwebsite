(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) document.documentElement.classList.add('reduced-motion');

  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  if (window.FAWMotion.initPreloader) window.FAWMotion.initPreloader(reduced);

  if (!reduced && window.FAWMotion.initSmoothScroll) {
    window.FAWMotion.initSmoothScroll();
  }

  if (window.FAWMotion.initScrollReveal) window.FAWMotion.initScrollReveal(document);
  if (!reduced && window.FAWMotion.initParallax) window.FAWMotion.initParallax(document);
  if (window.FAWMotion.initPageTransitions) window.FAWMotion.initPageTransitions(reduced);
})();
