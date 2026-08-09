window.FAWMotion = window.FAWMotion || {};

window.FAWMotion.initPageTransitions = function initPageTransitions(reduced) {
  if (!window.barba) return;

  const duration = reduced ? 0.15 : 0.5;
  const ease = 'power2.inOut';

  barba.init({
    preventRunning: true,
    transitions: [
      {
        name: 'fade-slide',
        leave(data) {
          if (!window.gsap) return Promise.resolve();
          return gsap.to(data.current.container, {
            opacity: 0,
            y: reduced ? 0 : -16,
            duration,
            ease
          });
        },
        enter(data) {
          if (window.ScrollTrigger) ScrollTrigger.getAll().forEach((st) => st.kill());
          if (!window.gsap) return Promise.resolve();
          gsap.set(data.next.container, { opacity: 0, y: reduced ? 0 : 16 });
          return gsap.to(data.next.container, { opacity: 1, y: 0, duration, ease });
        }
      }
    ]
  });

  barba.hooks.after((data) => {
    if (window.FAWMotion.initScrollReveal) window.FAWMotion.initScrollReveal(data.next.container);
    if (window.FAWMotion.initParallax) window.FAWMotion.initParallax(data.next.container);
    if (window.ScrollTrigger) ScrollTrigger.refresh();
    if (window.FAWMotion._lenis) window.FAWMotion._lenis.scrollTo(0, { immediate: true });
    if (window.FAWApp && window.FAWApp.rebind) window.FAWApp.rebind();
    if (window.gtag) {
      // placeholder hook for future analytics page_view calls
    }
  });
};
