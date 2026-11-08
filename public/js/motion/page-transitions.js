window.FAWMotion = window.FAWMotion || {};

window.FAWMotion.initPageTransitions = function initPageTransitions() {
  if (!window.barba) return;

  barba.init({
    preventRunning: true,
    // never reuse a cached copy of a page: cart / product state changes between visits
    cacheIgnore: true,
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

  // Barba only swaps the container: copy the new page's <body> class over, otherwise
  // body keeps e.g. "page-home" and the page loses its top padding under the header.
  barba.hooks.beforeEnter((data) => {
    try {
      var m = /<body[^>]*\sclass=["']([^"']*)["']/i.exec(data.next.html || '');
      if (m) document.body.className = m[1];
      document.documentElement.classList.remove('is-locked');
    } catch (e) {}
  });

  barba.hooks.after((data) => {
    if (window.FAWMotion.initScrollReveal) window.FAWMotion.initScrollReveal(data.next.container);
    if (window.FAWMotion.initParallax) window.FAWMotion.initParallax(data.next.container);
    if (window.FAWMotion.refreshOnImagesLoad) window.FAWMotion.refreshOnImagesLoad(data.next.container);
    if (window.FAWApp && window.FAWApp.rebind) window.FAWApp.rebind();
    if (window.FAWApp && window.FAWApp.playLoopVideos) window.FAWApp.playLoopVideos();
    if (window.FAWApp && window.FAWApp.markAccentTitles) window.FAWApp.markAccentTitles();
  });
};
