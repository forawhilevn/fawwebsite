window.FAWMotion = window.FAWMotion || {};

window.FAWMotion.initParallax = function initParallax(root) {
  if (!window.gsap || !window.ScrollTrigger) return;
  const scope = root || document;
  const layers = scope.querySelectorAll('[data-parallax]');

  layers.forEach((layer) => {
    const speed = Number(layer.getAttribute('data-parallax')) || 10;
    gsap.to(layer, {
      yPercent: speed,
      ease: 'none',
      scrollTrigger: {
        trigger: layer.closest('section') || layer.parentElement || layer,
        scrub: 0.5
      }
    });
  });
};
