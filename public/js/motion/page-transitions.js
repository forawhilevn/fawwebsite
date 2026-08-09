window.FAWMotion = window.FAWMotion || {};

window.FAWMotion.initPageTransitions = function initPageTransitions(reduced) {
  if (!window.barba) return;

  const overlay = document.getElementById('pageTransitionOverlay');
  const duration = reduced ? 0.2 : 0.55;
  const ease = 'power2.inOut';

  barba.init({
    preventRunning: true,
    transitions: [
      {
        name: 'overlay-wipe',
        leave() {
          if (!window.gsap || !overlay) return Promise.resolve();
          window.scrollTo(0, 0);
          return gsap.fromTo(overlay, { yPercent: 101 }, { yPercent: 0, duration, ease });
        },
        enter(data) {
          if (window.ScrollTrigger) ScrollTrigger.getAll().forEach((st) => st.kill());
          if (window.FAWMotion._lenis) window.FAWMotion._lenis.scrollTo(0, { immediate: true });
          if (!window.gsap || !overlay) return Promise.resolve();
          gsap.set(data.next.container, { opacity: 1 });
          return gsap.to(overlay, { yPercent: -101, duration, ease, delay: 0.05 });
        },
        after() {
          if (overlay) gsap.set(overlay, { yPercent: 101 });
        }
      }
    ]
  });

  barba.hooks.after((data) => {
    if (window.FAWMotion.initScrollReveal) window.FAWMotion.initScrollReveal(data.next.container);
    if (window.FAWMotion.initParallax) window.FAWMotion.initParallax(data.next.container);
    if (window.FAWMotion.refreshOnImagesLoad) window.FAWMotion.refreshOnImagesLoad(data.next.container);
    if (window.FAWApp && window.FAWApp.rebind) window.FAWApp.rebind();
  });
};
