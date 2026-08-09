(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) document.documentElement.classList.add('reduced-motion');

  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  window.FAWMotion.refreshOnImagesLoad = function refreshOnImagesLoad(root) {
    if (!window.ScrollTrigger) return;
    const scope = root || document;
    const images = scope.querySelectorAll('img');
    let pending = 0;
    images.forEach((img) => {
      if (img.complete) return;
      pending += 1;
      const done = () => {
        pending -= 1;
        if (pending <= 0) ScrollTrigger.refresh();
      };
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    });
    // Always refresh once on the next frame too, in case fonts/layout shift after paint.
    requestAnimationFrame(() => requestAnimationFrame(() => ScrollTrigger.refresh()));
  };

  if (window.FAWMotion.initPreloader) window.FAWMotion.initPreloader(reduced);

  if (!reduced && window.FAWMotion.initSmoothScroll) {
    window.FAWMotion.initSmoothScroll();
  }

  if (window.FAWMotion.initScrollReveal) window.FAWMotion.initScrollReveal(document);
  if (!reduced && window.FAWMotion.initParallax) window.FAWMotion.initParallax(document);
  if (window.FAWMotion.initPageTransitions) window.FAWMotion.initPageTransitions(reduced);

  window.addEventListener('load', () => window.FAWMotion.refreshOnImagesLoad(document));
})();
