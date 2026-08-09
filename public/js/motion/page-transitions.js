window.FAWMotion = window.FAWMotion || {};

window.FAWMotion.initPageTransitions = function initPageTransitions(reduced) {
  if (!window.barba) return;

  const overlay = document.getElementById('pageTransitionOverlay');
  const durationMs = reduced ? 200 : 550;
  const ease = 'power2.inOut';

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function animate(target, vars) {
    if (window.gsap && target) {
      try {
        gsap.to(target, vars);
      } catch (err) {
        /* ignore visual animation failures, timing below still resolves */
      }
    }
  }

  barba.init({
    preventRunning: true,
    timeout: 4000,
    transitions: [
      {
        name: 'overlay-wipe',
        leave() {
          window.scrollTo(0, 0);
          animate(overlay, { yPercent: 0, duration: durationMs / 1000, ease });
          return wait(durationMs);
        },
        enter(data) {
          if (window.ScrollTrigger) ScrollTrigger.getAll().forEach((st) => st.kill());
          if (window.FAWMotion._lenis) window.FAWMotion._lenis.scrollTo(0, { immediate: true });
          if (data && data.next && data.next.container) {
            data.next.container.style.opacity = '1';
          }
          animate(overlay, { yPercent: -101, duration: durationMs / 1000, ease, delay: 0.05 });
          return wait(durationMs + 50);
        },
        after() {
          if (overlay) {
            if (window.gsap) gsap.set(overlay, { yPercent: 101 });
            else overlay.style.transform = 'translateY(101%)';
          }
        }
      }
    ]
  });

  barba.hooks.after((data) => {
    if (window.FAWMotion.initScrollReveal) window.FAWMotion.initScrollReveal(data.next.container);
    if (window.FAWMotion.initParallax) window.FAWMotion.initParallax(data.next.container);
    if (window.FAWMotion.refreshOnImagesLoad) window.FAWMotion.refreshOnImagesLoad(data.next.container);
    if (window.FAWWishlist && window.FAWWishlist.refreshButtons) window.FAWWishlist.refreshButtons();
    if (window.FAWApp && window.FAWApp.rebind) window.FAWApp.rebind();
  });
};
