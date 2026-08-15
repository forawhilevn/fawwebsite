window.FAWMotion = window.FAWMotion || {};

window.FAWMotion.initPageTransitions = function initPageTransitions() {
  if (!window.barba) return;

  barba.init({
    preventRunning: true,
    timeout: 5000,
    transitions: [
      {
        name: 'instant-swap',
        leave() {
          window.scrollTo(0, 0);
        },
        enter(data) {
          if (window.ScrollTrigger) ScrollTrigger.getAll().forEach((st) => st.kill());
          if (window.FAWMotion._lenis) window.FAWMotion._lenis.scrollTo(0, { immediate: true });
          if (data && data.next && data.next.container) {
            data.next.container.style.opacity = '1';
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
