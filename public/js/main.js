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

  // Sub-banner animations must always play on a loop. iPhones in Low Power Mode block
  // autoplay, so we retry on load, when the page becomes visible again, and on the
  // visitor's first touch / scroll (a gesture lets the video start).
  (function loopVideos() {
    function kick() {
      document.querySelectorAll('.sub-banner video').forEach(function (v) {
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.setAttribute('playsinline', '');
        v.setAttribute('webkit-playsinline', '');
        if (v.paused) {
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        }
      });
    }
    window.FAWApp.playLoopVideos = kick;
    ['touchstart', 'pointerdown', 'scroll', 'keydown'].forEach(function (ev) {
      window.addEventListener(ev, kick, { passive: true });
    });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
    window.addEventListener('pageshow', kick);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kick);
    else kick();
  })();

  // Page titles in capitals: letters with a mark above the capital (Ử, Ả, Ố, Ề...) reach higher
  // than the title box, so those titles get a little extra room under the header (see CSS).
  (function markAccentTitles() {
    var TOP_MARKS = /[\u0300\u0301\u0303\u0309\u0302\u0306\u031B]/;
    function mark() {
      document.querySelectorAll('main .page-title, main .about-title, main .policy-title').forEach(function (el) {
        var text = (el.textContent || '').normalize('NFD');
        el.classList.toggle('has-top-accent', TOP_MARKS.test(text));
      });
    }
    window.FAWApp.markAccentTitles = mark;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mark);
    else mark();
  })();

  // Product page behaviour (variants, AJAX cart, mini-cart, size chart, bottom
  // sheet) now lives in /js/product.js.

  // Mobile header hamburger menu
  // Lifestyle: thumbnails open a pop up with the other photos of that set
  var lifeModal = null;
  function lifeBuild() {
    if (lifeModal) return lifeModal;
    var m = document.createElement('div');
    m.className = 'life-modal';
    m.hidden = true;
    m.innerHTML =
      '<div class="life-modal__backdrop" data-life-close></div>' +
      '<div class="life-modal__box" role="dialog" aria-modal="true">' +
        '<div class="life-modal__head"><h3 class="life-modal__title"></h3>' +
        '<a class="life-modal__product" hidden></a>' +
        '<button type="button" class="life-modal__close" data-life-close aria-label="Close">&times;</button></div>' +
        '<div class="life-modal__scroll" data-lenis-prevent>' +
          '<div class="life-modal__info"><p class="life-modal__desc" hidden></p><p class="life-modal__credit" hidden></p></div>' +
          '<div class="life-modal__grid"></div></div>' +
      '</div>' +
      '<div class="life-zoom" hidden>' +
        '<button type="button" class="life-zoom__btn life-zoom__close" data-zoom-close aria-label="Close">&times;</button>' +
        '<button type="button" class="life-zoom__btn life-zoom__nav life-zoom__nav--prev" data-zoom-step="-1" aria-label="Prev">&lsaquo;</button>' +
        '<button type="button" class="life-zoom__btn life-zoom__nav life-zoom__nav--next" data-zoom-step="1" aria-label="Next">&rsaquo;</button>' +
        '<img class="life-zoom__img" alt="" draggable="false" />' +
      '</div>';
    m.setAttribute('data-lenis-prevent', '');
    m.addEventListener('wheel', function (e) {
      if (m.querySelector('.life-zoom').hidden === false) { e.preventDefault(); return; }
      var sc = m.querySelector('.life-modal__scroll');
      if (!sc.contains(e.target)) { sc.scrollTop += e.deltaY; }
      e.preventDefault();
      if (sc.contains(e.target)) sc.scrollTop += e.deltaY;
    }, { passive: false });
    m.addEventListener('touchmove', function (e) {
      if (!m.querySelector('.life-modal__scroll').contains(e.target)) e.preventDefault();
    }, { passive: false });
    document.body.appendChild(m);
    lifeModal = m;
    return m;
  }
  var lifeImages = [];
  var lifeIndex = 0;
  function lifeZoomShow(i) {
    var m = lifeModal; if (!m || !lifeImages.length) return;
    lifeIndex = (i + lifeImages.length) % lifeImages.length;
    m.querySelector('.life-zoom__img').src = lifeImages[lifeIndex];
    m.querySelector('.life-zoom').hidden = false;
    var multi = lifeImages.length > 1;
    Array.prototype.forEach.call(m.querySelectorAll('.life-zoom__nav'), function (b) { b.hidden = !multi; });
  }
  function lifeClose() {
    if (!lifeModal) return;
    lifeModal.hidden = true;
    lifeModal.querySelector('.life-zoom').hidden = true;
    document.documentElement.classList.remove('life-open');
  }
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var openBtn = t.closest('[data-life-open]');
    if (openBtn) {
      var data;
      try { data = JSON.parse(openBtn.getAttribute('data-life-open')); } catch (err) { return; }
      var m = lifeBuild();
      lifeImages = data.images || [];
      m.querySelector('.life-modal__title').textContent = data.title || '';
      var pa = m.querySelector('.life-modal__product');
      if (data.product && data.product.url) {
        pa.href = data.product.url;
        pa.textContent = (document.documentElement.lang === 'en' ? 'View product' : 'Xem sản phẩm') + ' →';
        pa.hidden = false;
      } else { pa.hidden = true; }
      var descEl = m.querySelector('.life-modal__desc');
      descEl.textContent = data.desc || '';
      descEl.hidden = !data.desc;
      // credit: @handles become Instagram links
      var credEl = m.querySelector('.life-modal__credit');
      credEl.innerHTML = '';
      (data.credit || '').split(/(@[A-Za-z0-9._]+)/g).forEach(function (part) {
        if (!part) return;
        if (part.charAt(0) === '@' && part.length > 1) {
          var a = document.createElement('a');
          a.href = 'https://www.instagram.com/' + part.slice(1).replace(/\.+$/, '') + '/';
          a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = part;
          credEl.appendChild(a);
        } else {
          credEl.appendChild(document.createTextNode(part));
        }
      });
      credEl.hidden = !data.credit;
      var grid = m.querySelector('.life-modal__grid');
      grid.innerHTML = '';
      lifeImages.forEach(function (src, i) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'life-modal__item'; b.setAttribute('data-life-img', String(i));
        var im = document.createElement('img'); im.src = src; im.alt = data.title || ''; im.loading = 'lazy';
        b.appendChild(im); grid.appendChild(b);
      });
      m.querySelector('.life-modal__scroll').scrollTop = 0;
      m.hidden = false;
      document.documentElement.classList.add('life-open');
      return;
    }
    if (!lifeModal || lifeModal.hidden) {
      var sc = t.closest('[data-life-scroll]');
      if (sc) {
        var row = document.querySelector('[data-life-row]');
        if (row) row.scrollBy({ left: Number(sc.getAttribute('data-life-scroll')) * row.clientWidth * 0.8, behavior: 'smooth' });
      }
      return;
    }
    if (t.closest('[data-zoom-close]')) { lifeModal.querySelector('.life-zoom').hidden = true; return; }
    var step = t.closest('[data-zoom-step]');
    if (step) { lifeZoomShow(lifeIndex + Number(step.getAttribute('data-zoom-step'))); return; }
    var img = t.closest('[data-life-img]');
    if (img) { lifeZoomShow(Number(img.getAttribute('data-life-img'))); return; }
    if (t.closest('.life-zoom__img')) { lifeZoomShow(lifeIndex + 1); return; }
    if (t.closest('.life-modal__product') || t.closest('[data-life-close]')) lifeClose();
  });
  document.addEventListener('keydown', function (e) {
    if (!lifeModal || lifeModal.hidden) return;
    var z = lifeModal.querySelector('.life-zoom');
    if (e.key === 'Escape') { if (!z.hidden) z.hidden = true; else lifeClose(); }
    else if (!z.hidden && e.key === 'ArrowRight') lifeZoomShow(lifeIndex + 1);
    else if (!z.hidden && e.key === 'ArrowLeft') lifeZoomShow(lifeIndex - 1);
  });
  // page changes (Barba) close the pop up
  window.addEventListener('popstate', lifeClose);

  // home: "Xem thêm" reveals the next batch of products
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-home-more]');
    if (!btn) return;
    var step = parseInt(btn.getAttribute('data-step'), 10) || 8;
    var hidden = Array.prototype.slice.call(document.querySelectorAll('[data-home-extra][hidden]'));
    hidden.slice(0, step).forEach(function (box) {
      var card = box.querySelector('.product-card');
      if (!card) { box.remove(); return; }
      card.removeAttribute('data-reveal');
      card.style.opacity = '';
      card.style.transform = '';
      card.style.visibility = '';
      card.classList.add('is-fresh');
      // the card becomes a direct child of the grid, exactly like the first ones
      box.parentNode.replaceChild(card, box);
    });
    if (hidden.length <= step) {
      var wrap = btn.closest('.home-more-wrap');
      if (wrap) wrap.hidden = true;
    }
  });

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

  // Cart quantity stepper (+ / -) and remove: updated in place (no page reload, no extra history entries)
  (function () {
    var busy = false;

    function refreshCart() {
      return fetch(location.pathname, { credentials: 'same-origin', headers: { Accept: 'text/html' } })
        .then(function (r) { return r.text(); })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var fresh = doc.querySelector('.page-shell .container');
          var cur = document.querySelector('.page-shell .container');
          if (fresh && cur) cur.innerHTML = fresh.innerHTML;
          var newCount = doc.querySelector('[data-cart-count]');
          document.querySelectorAll('[data-cart-count]').forEach(function (el) {
            if (!newCount) return;
            el.textContent = newCount.textContent;
            el.hidden = newCount.hidden;
          });
        });
    }

    function send(form, quantity) {
      if (busy) return;
      busy = true;
      var body = new URLSearchParams(new FormData(form));
      if (quantity != null) body.set('quantity', String(quantity));
      form.classList.add('is-busy');
      fetch(form.getAttribute('action'), {
        method: 'POST',
        body: body,
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
      })
        .then(function (r) { if (!r.ok) throw new Error('http'); return refreshCart(); })
        .catch(function () { form.submit(); })
        .then(function () { busy = false; form.classList.remove('is-busy'); });
    }

    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-qty-step]');
      if (!btn) return;
      e.preventDefault();
      var form = btn.closest('[data-qty-form]');
      if (!form || btn.disabled || busy) return;
      var input = form.querySelector('input[name="quantity"]');
      var next = (parseInt(input.value, 10) || 1) + parseInt(btn.getAttribute('data-qty-step'), 10);
      if (next < 1 || next > 3) return;
      send(form, next);
    });

    document.addEventListener('submit', function (e) {
      var form = e.target;
      if (!form.matches || !form.matches('.cart-table form')) return;
      if (!/\/cart\/remove$/.test(form.getAttribute('action') || '')) return;
      e.preventDefault();
      send(form, null);
    });
  })();

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
