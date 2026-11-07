(function () {
  window.FAWApp = window.FAWApp || {};

  // Keep the page from looking smaller when the visitor zooms the browser out
  // (desktop only): counter-scale the page so it keeps its normal size.
  (function keepScale() {
    var root = document.documentElement;
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;
    function apply() {
      var ratio = window.outerWidth && window.innerWidth ? window.innerWidth / window.outerWidth : 1;
      // only react to zooming OUT; devtools/zooming in make the ratio < 1
      var z = ratio > 1.08 && ratio < 5 ? ratio : 1;
      root.style.zoom = z === 1 ? '' : String(z);
    }
    window.addEventListener('resize', apply);
    apply();
  })();

  // Product page behaviour (variants, AJAX cart, mini-cart, size chart, bottom
  // sheet) now lives in /js/product.js.

  // Mobile header hamburger menu
  document.addEventListener('click', function (e) {
    const toggle = e.target.closest('[data-menu-toggle]');
    if (toggle) {
      const nav = document.querySelector('[data-mobile-nav]');
      const isOpen = toggle.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (nav) nav.classList.toggle('is-open', isOpen);
      return;
    }
    if (e.target.closest('[data-mobile-nav] a')) {
      const openToggle = document.querySelector('[data-menu-toggle].is-open');
      const nav = document.querySelector('[data-mobile-nav]');
      if (openToggle) openToggle.classList.remove('is-open');
      if (openToggle) openToggle.setAttribute('aria-expanded', 'false');
      if (nav) nav.classList.remove('is-open');
    }
  });


  // Header always stays visible; only add a denser background once the page
  // has scrolled so content passing underneath never shows through the text.
  (function () {
    var ticking = false;
    function update() {
      ticking = false;
      var header = document.querySelector('.site-header');
      if (!header) return;
      header.classList.remove('is-hidden');
      header.classList.toggle('is-stuck', (window.pageYOffset || 0) > 10);
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    update();
  })();

  // Payment method radio → toggle visible instructions on checkout
  document.addEventListener('change', function (e) {
    if (e.target.name === 'paymentMethod') {
      document.querySelectorAll('.payment-option').forEach((el) => el.classList.remove('is-selected'));
      e.target.closest('.payment-option').classList.add('is-selected');
    }
  });

  window.FAWApp.rebind = function rebind() {
    // Event delegation on document means no per-page rebinding is needed;
    // reserved for any future imperative re-init after Barba page swaps.
  };
})();
