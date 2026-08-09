window.FAWMotion = window.FAWMotion || {};

window.FAWMotion.initSmoothScroll = function initSmoothScroll() {
  if (!window.Lenis || !window.gsap) return null;

  const lenis = new Lenis({
    duration: 1.1,
    smoothWheel: true
  });

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  if (window.ScrollTrigger) {
    lenis.on('scroll', ScrollTrigger.update);
  }

  window.FAWMotion._lenis = lenis;
  return lenis;
};
