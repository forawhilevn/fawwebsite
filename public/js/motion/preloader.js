window.FAWMotion = window.FAWMotion || {};

window.FAWMotion.initPreloader = function initPreloader(reduced) {
  const el = document.getElementById('preloader');
  if (!el) return;

  const alreadyShown = sessionStorage.getItem('faw_preloader_shown');

  if (alreadyShown) {
    el.style.display = 'none';
    return;
  }

  sessionStorage.setItem('faw_preloader_shown', '1');

  if (reduced || !window.gsap) {
    el.style.transition = 'opacity 200ms ease';
    el.style.opacity = '0';
    setTimeout(() => {
      el.style.display = 'none';
    }, 220);
    return;
  }

  const mark = el.querySelector('.preloader__mark');
  const tl = gsap.timeline({
    onComplete: () => {
      el.style.display = 'none';
    }
  });

  gsap.set(mark, { scale: 0.6, opacity: 0 });
  tl.to(mark, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' })
    .to(mark, { rotate: 8, duration: 0.35, ease: 'power1.inOut', yoyo: true, repeat: 1 })
    .to(el, { yPercent: -100, duration: 0.6, ease: 'expo.inOut', delay: 0.15 });
};
