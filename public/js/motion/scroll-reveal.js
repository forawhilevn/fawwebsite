window.FAWMotion = window.FAWMotion || {};

window.FAWMotion.initScrollReveal = function initScrollReveal(root) {
  if (!window.gsap || !window.ScrollTrigger) return;
  const scope = root || document;
  const els = scope.querySelectorAll('[data-reveal]');
  if (!els.length) return;

  gsap.set(els, { opacity: 0, y: 24 });

  ScrollTrigger.batch(els, {
    start: 'top 88%',
    onEnter: (batch) => {
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: 'expo.out'
      });
    },
    once: true
  });
};
