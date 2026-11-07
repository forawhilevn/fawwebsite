window.FAWMotion = window.FAWMotion || {};

window.FAWMotion.initScrollReveal = function initScrollReveal(root) {
  if (!window.gsap || !window.ScrollTrigger) return;
  // While the homepage intro plays, hold the reveal until the video starts
  // uncovering the page, so the animation is seen instead of finishing under it.
  const rootEl = document.documentElement;
  if (rootEl.classList.contains('intro-running') && !rootEl.classList.contains('intro-revealed')) {
    document.addEventListener('faw:intro-reveal', () => initScrollReveal(root), { once: true });
    return;
  }
  const scope = root || document;
  const els = scope.querySelectorAll('[data-reveal]');
  if (!els.length) return;

  gsap.set(els, { opacity: 0, y: 24 });

  const slowEls = Array.from(els).filter((el) => el.hasAttribute('data-reveal-slow'));
  const cardEls = Array.from(els).filter((el) => el.classList.contains('product-card'));
  const normalEls = Array.from(els).filter(
    (el) => !el.hasAttribute('data-reveal-slow') && !el.classList.contains('product-card')
  );

  // Product cards: every card appears together as the page opens (short
  // stagger, whole sequence capped) instead of waiting for the scroll.
  if (cardEls.length) {
    gsap.to(cardEls, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      delay: 0.15,
      stagger: { amount: Math.min(0.5, cardEls.length * 0.06) },
      ease: 'power2.out'
    });
  }

  if (normalEls.length) {
    ScrollTrigger.batch(normalEls, {
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
  }

  // Slower, gentler reveal for a few standalone hero-style elements (e.g.
  // the homepage banner) where the snappy expo.out default reads as an
  // abrupt flash rather than a graceful entrance.
  if (slowEls.length) {
    ScrollTrigger.batch(slowEls, {
      start: 'top 95%',
      onEnter: (batch) => {
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: 1.6,
          stagger: 0.2,
          ease: 'power2.out'
        });
      },
      once: true
    });
  }
};
