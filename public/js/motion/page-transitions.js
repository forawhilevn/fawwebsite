window.FAWMotion = window.FAWMotion || {};

window.FAWMotion.initPageTransitions = function initPageTransitions(reduced) {
  if (!window.barba) return;

  const overlay = document.getElementById('pageTransitionOverlay');
  const durationMs = reduced ? 0 : 550;

  if (overlay && reduced) {
    overlay.classList.add('is-instant');
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function resetOverlay() {
    if (!overlay) return;
    overlay.classList.add('is-instant');
    overlay.classList.remove('is-covering', 'is-revealed');
    // Force a reflow so the next transition re-enables the CSS transition cleanly.
    void overlay.offsetHeight;
    if (!reduced) overlay.classList.remove('is-instant');
  }

  barba.init({
    preventRunning: true,
    timeout: 5000,
    transitions: [
      {
        name: 'overlay-wipe',
        leave() {
          window.scrollTo(0, 0);
          if (overlay) overlay.classList.add('is-covering');
          return wait(durationMs);
        },
        enter(data) {
          if (window.ScrollTrigger) ScrollTrigger.getAll().forEach((st) => st.kill());
          if (window.FAWMotion._lenis) window.FAWMotion._lenis.scrollTo(0, { immediate: true });
          if (data && data.next && data.next.container) {
            data.next.container.style.opacity = '1';
          }
          if (overlay) overlay.classList.add('is-revealed');
          return wait(durationMs + 50);
        },
        after() {
          resetOverlay();
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
