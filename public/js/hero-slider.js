/* Home hero slider: auto-advance every 3s with cross-fade, arrows, dots, swipe. Works with Barba (delegated + one global tick). */
(function () {
  var last = 0, startX = null, startY = null;

  function slider() { return document.querySelector('[data-hero-slider]'); }
  function slides(root) { return Array.prototype.slice.call(root.querySelectorAll('[data-hero-slide]')); }

  function go(root, n) {
    var list = slides(root);
    if (list.length < 2) return;
    var cur = list.findIndex(function (s) { return s.classList.contains('is-active'); });
    n = (n + list.length) % list.length;
    if (n === cur) return;
    list.forEach(function (s, i) {
      s.classList.toggle('is-active', i === n);
      if (i === n) s.removeAttribute('aria-hidden'); else s.setAttribute('aria-hidden', 'true');
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-hero-dot]'), function (d, i) { d.classList.toggle('is-active', i === n); });
    last = Date.now();
  }
  function current(root) {
    return slides(root).findIndex(function (s) { return s.classList.contains('is-active'); });
  }

  document.addEventListener('click', function (e) {
    var root = slider();
    if (!root || !e.target.closest) return;
    var step = e.target.closest('[data-hero-step]');
    if (step) { go(root, current(root) + Number(step.getAttribute('data-hero-step'))); return; }
    var dot = e.target.closest('[data-hero-dot]');
    if (dot) go(root, Number(dot.getAttribute('data-hero-dot')));
  });

  document.addEventListener('touchstart', function (e) {
    var root = slider();
    if (!root || !e.target.closest || !e.target.closest('[data-hero-slider]')) { startX = null; return; }
    startX = e.touches[0].clientX; startY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    var root = slider();
    if (!root || startX === null) return;
    var dx = e.changedTouches[0].clientX - startX, dy = e.changedTouches[0].clientY - startY;
    startX = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) go(root, current(root) + (dx < 0 ? 1 : -1));
  }, { passive: true });

  // one timer for the whole session; the countdown (data-interval, 5s) restarts after every change (auto or manual)
  setInterval(function () {
    var root = slider();
    if (!root || document.hidden) return;
    if (document.documentElement.classList.contains('intro-running')) { last = Date.now(); return; } // wait for the intro video
    var interval = Number(root.getAttribute('data-interval')) || 5000;
    if (!last) last = Date.now();
    if (Date.now() - last >= interval) go(root, current(root) + 1);
  }, 250);
})();
