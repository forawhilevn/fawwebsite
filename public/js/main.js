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

  // Stores page: city filter, photo slider, "view map" swaps the photos for Google Maps
  (function () {
    function updateDots(track) {
      var slider = track.closest('[data-store-slider]');
      if (!slider) return;
      var dots = slider.querySelectorAll('[data-slider-dots] span');
      var idx = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      dots.forEach(function (d, i) { d.classList.toggle('is-on', i === idx); });
    }
    document.addEventListener('scroll', function (e) {
      if (e.target && e.target.matches && e.target.matches('[data-slider-track]')) updateDots(e.target);
    }, true);
    document.addEventListener('click', function (e) {
      var nav = e.target.closest('[data-slider-prev],[data-slider-next]');
      if (nav) {
        var track = nav.closest('[data-store-slider]').querySelector('[data-slider-track]');
        var dir = nav.hasAttribute('data-slider-next') ? 1 : -1;
        var max = track.scrollWidth - track.clientWidth;
        var next = track.scrollLeft + dir * track.clientWidth;
        if (next > max + 2) next = 0; else if (next < -2) next = max;
        track.scrollTo({ left: next, behavior: 'smooth' });
        return;
      }
      var chip = e.target.closest('[data-store-city]');
      if (chip) {
        var city = chip.getAttribute('data-store-city');
        document.querySelectorAll('[data-store-city]').forEach(function (c) { c.classList.toggle('is-active', c === chip); });
        document.querySelectorAll('[data-store-card]').forEach(function (card) {
          card.hidden = !!city && card.getAttribute('data-city') !== city;
        });
        return;
      }
      var tog = e.target.closest('[data-store-map-toggle]');
      if (tog) {
        var card = tog.closest('[data-store-card]');
        var on = card.classList.toggle('is-map');
        var frame = card.querySelector('[data-map-frame]');
        if (on && frame && !frame.getAttribute('src')) frame.setAttribute('src', frame.getAttribute('data-src'));
        tog.textContent = on ? tog.getAttribute('data-label-photos') : tog.getAttribute('data-label-map');
      }
    });
  })();

  // Cart quantity stepper (+ / -): submits the row's form
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-qty-step]');
    if (!btn) return;
    var form = btn.closest('[data-qty-form]');
    if (!form || btn.disabled) return;
    var input = form.querySelector('input[name="quantity"]');
    var next = (parseInt(input.value, 10) || 1) + parseInt(btn.getAttribute('data-qty-step'), 10);
    if (next < 1 || next > 3) return;
    input.value = String(next);
    form.querySelectorAll('[data-qty-step]').forEach(function (b) { b.disabled = true; });
    form.submit();
  });

  // Announcement bar: rotate the promo lines
  (function () {
    setInterval(function () {
      var bar = document.querySelector('[data-promo-bar]');
      if (!bar) return;
      var items = bar.querySelectorAll('.promo-bar__item');
      if (items.length < 2) return;
      var at = 0;
      items.forEach(function (el, i) { if (el.classList.contains('is-on')) at = i; el.classList.remove('is-on'); });
      items[(at + 1) % items.length].classList.add('is-on');
    }, 4000);
  })();

  // Checkout: live totals when the delivery area or discount code changes
  (function () {
    var timer = null;
    function refresh() {
      var box = document.querySelector('[data-checkout-totals]');
      if (!box) return;
      var zone = document.querySelector('[data-checkout-zone]');
      var code = document.querySelector('[data-checkout-code]');
      var url = box.getAttribute('data-quote-url') + '?zone=' + encodeURIComponent(zone ? zone.value : '') +
        '&code=' + encodeURIComponent(code ? code.value : '');
      fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .then(function (d) { if (d && d.ok) box.innerHTML = d.html; })
        .catch(function () {});
    }
    document.addEventListener('change', function (e) {
      if (e.target.closest && e.target.closest('[data-checkout-zone]')) refresh();
    });
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('[data-checkout-apply]')) refresh();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.matches && e.target.matches('[data-checkout-code]')) {
        e.preventDefault();
        refresh();
      }
    });
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
