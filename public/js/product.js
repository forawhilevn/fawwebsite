/* ==========================================================================
   FAW product page + mini-cart behaviour (Palace-style)
   - size / colour selection, AJAX add / remove, "IN CART" state
   - glass mini-cart under the header pill
   - mobile bottom-sheet size picker
   - size chart modal
   - full-screen image lightbox with zoom / pan / pinch
   All listeners are delegated on document, so they keep working across
   Barba page swaps. Page state lives in the DOM (data attributes).
   ========================================================================== */
(function () {
  'use strict';

  var variantCache = typeof WeakMap === 'function' ? new WeakMap() : null;
  var busy = false;

  /* ---------- helpers ---------- */

  function qsa(root, sel) {
    return Array.prototype.slice.call(root.querySelectorAll(sel));
  }

  function getRoot() {
    return document.querySelector('[data-pdp]');
  }

  function getMini() {
    return document.querySelector('[data-mini-cart]');
  }

  function getVariants(root) {
    if (variantCache && variantCache.has(root)) return variantCache.get(root);
    var list = [];
    try {
      list = JSON.parse(root.getAttribute('data-variants') || '[]');
    } catch (err) {
      list = [];
    }
    if (variantCache) variantCache.set(root, list);
    return list;
  }

  function findVariant(root, id) {
    var list = getVariants(root);
    for (var i = 0; i < list.length; i += 1) {
      if (Number(list[i].id) === Number(id)) return list[i];
    }
    return null;
  }

  function selectedVariant(root) {
    return findVariant(root, root.getAttribute('data-selected'));
  }

  function hasColors(root) {
    return root.getAttribute('data-has-colors') === '1';
  }

  // First in-stock variant matching size and/or colour (null = don't care).
  function pick(root, size, color) {
    var list = getVariants(root);
    for (var i = 0; i < list.length; i += 1) {
      var v = list[i];
      if (v.stock <= 0) continue;
      if (size && v.size !== size) continue;
      if (color && v.color !== color) continue;
      return v;
    }
    return null;
  }

  function isMobile() {
    return !!(window.matchMedia && window.matchMedia('(max-width: 900px)').matches);
  }

  function lockScroll(locked) {
    document.documentElement.classList.toggle('is-locked', locked);
    var lenis = window.FAWMotion && window.FAWMotion._lenis;
    if (lenis) {
      if (locked && lenis.stop) lenis.stop();
      if (!locked && lenis.start) lenis.start();
    }
  }

  function setCount(n) {
    qsa(document, '[data-cart-count]').forEach(function (el) {
      el.textContent = n;
      el.hidden = !(n > 0);
    });
  }

  /* ---------- product state -> DOM ---------- */

  function render(root) {
    var v = selectedVariant(root);
    if (!v) return;
    var colorsOn = hasColors(root);
    var list = getVariants(root);

    function available(size, color) {
      return list.some(function (x) {
        return x.stock > 0 && (!size || x.size === size) && (!color || x.color === color);
      });
    }

    qsa(root, '[data-size-option]').forEach(function (btn) {
      var value = btn.getAttribute('data-value');
      var ok = available(value, colorsOn ? v.color : null);
      btn.classList.toggle('is-selected', value === v.size);
      btn.classList.toggle('is-soldout', !ok);
      btn.setAttribute('aria-pressed', value === v.size ? 'true' : 'false');
    });

    qsa(root, '[data-color-option]').forEach(function (btn) {
      var value = btn.getAttribute('data-value');
      // a colour stays clickable if ANY size of it is in stock; clicking jumps to a size that exists
      var ok = available(null, value);
      btn.classList.toggle('is-selected', value === v.color);
      btn.classList.toggle('is-soldout', !ok);
      btn.setAttribute('aria-pressed', value === v.color ? 'true' : 'false');
    });

    qsa(root, '[data-color-name]').forEach(function (el) {
      el.textContent = v.color || '';
    });

    qsa(root, '[data-variant-row]').forEach(function (row) {
      var rv = findVariant(root, row.getAttribute('data-variant-id'));
      row.classList.toggle('is-selected', !!rv && rv.id === v.id);
      row.classList.toggle('is-soldout', !!rv && rv.stock <= 0);
      row.setAttribute('aria-selected', !!rv && rv.id === v.id ? 'true' : 'false');
      var tag = row.querySelector('[data-row-tag]');
      if (tag && rv) {
        tag.hidden = !(rv.inCart || rv.stock <= 0);
        tag.textContent = rv.stock <= 0 ? root.getAttribute('data-l-soldout') : root.getAttribute('data-l-incart');
      }
      var rm = row.querySelector('[data-row-remove]');
      if (rm && rv) rm.hidden = !rv.inCart;
    });

    var input = root.querySelector('input[name="variantId"]');
    if (input) input.value = v.id;

    var price = root.querySelector('[data-pdp-price]');
    if (price) {
      if (price.getAttribute('data-original') === null) {
        price.setAttribute('data-original', price.innerHTML);
      }
      if (v.override) price.textContent = v.priceLabel;
      else price.innerHTML = price.getAttribute('data-original');
    }

    var labels = {
      add: root.getAttribute('data-l-add'),
      incart: root.getAttribute('data-l-incart'),
      soldout: root.getAttribute('data-l-soldout')
    };

    qsa(root, '[data-pdp-add]').forEach(function (btn) {
      if (v.stock <= 0) {
        btn.disabled = true;
        btn.classList.remove('is-in-cart');
        btn.textContent = labels.soldout;
      } else if (v.inCart) {
        btn.disabled = false;
        btn.classList.add('is-in-cart');
        btn.textContent = labels.incart;
      } else {
        btn.disabled = false;
        btn.classList.remove('is-in-cart');
        btn.textContent = labels.add;
      }
    });

    qsa(root, '[data-pdp-remove]').forEach(function (btn) {
      btn.hidden = !v.inCart;
    });
  }

  function select(root, variant) {
    if (!variant) return;
    root.setAttribute('data-selected', variant.id);
    render(root);
  }

  function showError(root, message) {
    var box = root && root.querySelector('[data-pdp-error]');
    if (!box) return;
    box.textContent = message || '';
    box.hidden = !message;
  }

  /* ---------- cart (AJAX) ---------- */

  function sendCart(url, variantId) {
    var body = new URLSearchParams();
    body.set('variantId', variantId);
    body.set('quantity', '1');
    return fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: body
    }).then(function (res) {
      if (!res.ok) throw new Error('cart-request-failed');
      return res.json();
    });
  }

  function applyPayload(root, data, openPanel) {
    setCount(data.count);

    var mini = getMini();
    if (mini) mini.innerHTML = data.html;

    if (root) {
      var inCart = {};
      (data.items || []).forEach(function (item) {
        inCart[item.variantId] = true;
      });
      getVariants(root).forEach(function (v) {
        v.inCart = !!inCart[v.id];
      });
      render(root);
    }

    if (openPanel && !isMobile()) toggleMini(true);
  }

  function runCartAction(root, url, variantId, openPanel, after) {
    if (busy || !url || !variantId) return;
    busy = true;
    showError(root, '');
    sendCart(url, variantId)
      .then(function (data) {
        applyPayload(root, data, openPanel);
        if (after) after();
      })
      .catch(function () {
        showError(root, root ? root.getAttribute('data-l-error') : '');
      })
      .then(function () {
        busy = false;
      });
  }

  /* ---------- mini-cart panel ---------- */

  function toggleMini(open) {
    var mini = getMini();
    if (!mini) return;
    var willOpen = typeof open === 'boolean' ? open : !mini.classList.contains('is-open');
    mini.classList.toggle('is-open', willOpen);
    mini.setAttribute('aria-hidden', willOpen ? 'false' : 'true');
    qsa(document, '[data-cart-link]').forEach(function (link) {
      link.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });
  }

  function loadMini(root) {
    var mini = getMini();
    if (!mini) return;
    var url = mini.getAttribute('data-mini-url');
    fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('mini-cart-failed');
        return res.json();
      })
      .then(function (data) {
        applyPayload(root, data, true);
      })
      .catch(function () {});
  }

  /* ---------- sheet + modal ---------- */

  function setSheet(open) {
    var sheet = document.querySelector('[data-pdp-sheet]');
    if (!sheet) return;
    sheet.classList.toggle('is-open', open);
    sheet.setAttribute('aria-hidden', open ? 'false' : 'true');
    lockScroll(open);
  }

  function setSizeGuide(open) {
    var modal = document.querySelector('[data-size-guide]');
    if (!modal) return;
    modal.hidden = !open;
    lockScroll(open);
  }


  /* ---------- image lightbox (zoom / pan / pinch) ---------- */

  var LB_MAX = 4;
  var lb = { idx: 0, scale: 1, x: 0, y: 0, pointers: {}, moved: 0, startDist: 0, startScale: 1, last: null };

  function lbEls() {
    var box = document.querySelector('[data-lightbox]');
    if (!box) return null;
    return {
      box: box,
      stage: box.querySelector('[data-lightbox-stage]'),
      img: box.querySelector('[data-lightbox-img]'),
      count: box.querySelector('[data-lightbox-count]')
    };
  }

  function lbImages(el) {
    try {
      return JSON.parse(el.box.getAttribute('data-images') || '[]');
    } catch (err) {
      return [];
    }
  }

  function lbApply(el) {
    // keep the image inside the stage while zoomed in
    var w = el.img.clientWidth * lb.scale;
    var h = el.img.clientHeight * lb.scale;
    var maxX = Math.max(0, (w - el.stage.clientWidth) / 2);
    var maxY = Math.max(0, (h - el.stage.clientHeight) / 2);
    lb.x = Math.min(maxX, Math.max(-maxX, lb.x));
    lb.y = Math.min(maxY, Math.max(-maxY, lb.y));
    el.img.style.transform = 'translate(' + lb.x + 'px,' + lb.y + 'px) scale(' + lb.scale + ')';
    el.stage.classList.toggle('is-zoomed', lb.scale > 1.01);
  }

  function lbZoomTo(el, scale, cx, cy) {
    var next = Math.min(LB_MAX, Math.max(1, scale));
    var rect = el.stage.getBoundingClientRect();
    var dx = cx - (rect.left + rect.width / 2);
    var dy = cy - (rect.top + rect.height / 2);
    var ratio = next / lb.scale;
    lb.x = dx - (dx - lb.x) * ratio;
    lb.y = dy - (dy - lb.y) * ratio;
    lb.scale = next;
    if (next === 1) { lb.x = 0; lb.y = 0; }
    lbApply(el);
  }

  function lbShow(el, idx) {
    var list = lbImages(el);
    if (!list.length) return;
    lb.idx = (idx + list.length) % list.length;
    lb.scale = 1; lb.x = 0; lb.y = 0; lb.pointers = {};
    el.img.src = list[lb.idx];
    el.img.style.transform = '';
    el.stage.classList.remove('is-zoomed');
    if (el.count) el.count.textContent = (lb.idx + 1) + ' / ' + list.length;
  }

  function setLightbox(open, idx) {
    var el = lbEls();
    if (!el) return;
    if (open) {
      lbShow(el, idx || 0);
      el.box.hidden = false;
    } else {
      el.box.hidden = true;
      el.img.removeAttribute('src');
    }
    lockScroll(open);
  }

  function lbDist(a, b) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
  }

  document.addEventListener('pointerdown', function (e) {
    var stage = e.target.closest && e.target.closest('[data-lightbox-stage]');
    if (!stage) return;
    lb.pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    lb.moved = 0;
    lb.last = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(lb.pointers);
    if (ids.length === 2) {
      lb.startDist = lbDist(lb.pointers[ids[0]], lb.pointers[ids[1]]);
      lb.startScale = lb.scale;
    }
    try { stage.setPointerCapture(e.pointerId); } catch (err) {}
  });

  document.addEventListener('pointermove', function (e) {
    if (!lb.pointers[e.pointerId]) return;
    var el = lbEls();
    if (!el) return;
    lb.pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(lb.pointers);
    if (ids.length >= 2) {
      var a = lb.pointers[ids[0]];
      var b = lb.pointers[ids[1]];
      lb.moved = 99;
      if (lb.startDist) {
        lbZoomTo(el, lb.startScale * (lbDist(a, b) / lb.startDist), (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
      return;
    }
    var dx = e.clientX - lb.last.x;
    var dy = e.clientY - lb.last.y;
    lb.last = { x: e.clientX, y: e.clientY };
    lb.moved += Math.abs(dx) + Math.abs(dy);
    if (lb.scale > 1.01) {
      lb.x += dx;
      lb.y += dy;
      lbApply(el);
    }
  });

  function lbPointerEnd(e) {
    if (!lb.pointers[e.pointerId]) return;
    var wasSingle = Object.keys(lb.pointers).length === 1;
    delete lb.pointers[e.pointerId];
    var el = lbEls();
    if (!el || !wasSingle || lb.moved > 6) return;
    // a plain tap/click: toggle zoom on the image, or close when tapping the backdrop
    if (e.target === el.img) {
      lbZoomTo(el, lb.scale > 1.01 ? 1 : 2.5, e.clientX, e.clientY);
    } else if (lb.scale <= 1.01) {
      setLightbox(false);
    }
  }
  document.addEventListener('pointerup', lbPointerEnd);
  document.addEventListener('pointercancel', function (e) { delete lb.pointers[e.pointerId]; });

  document.addEventListener('wheel', function (e) {
    var stage = e.target.closest && e.target.closest('[data-lightbox-stage]');
    if (!stage) return;
    var el = lbEls();
    if (!el) return;
    e.preventDefault();
    lbZoomTo(el, lb.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX, e.clientY);
  }, { passive: false });

  /* ---------- mobile gallery: swipe + dash indicators ---------- */

  document.addEventListener('scroll', function (e) {
    var g = e.target;
    if (!g || !g.getAttribute || !g.hasAttribute('data-pdp-gallery')) return;
    var w = g.clientWidth || 1;
    var idx = Math.round(g.scrollLeft / w);
    qsa(document, '[data-pdp-dot]').forEach(function (dot) {
      dot.classList.toggle('is-active', Number(dot.getAttribute('data-index')) === idx);
    });
  }, true);

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var row = e.target.closest && e.target.closest('[data-variant-row]');
    if (!row || e.target !== row) return;
    e.preventDefault();
    row.click();
  });

  /* ---------- events ---------- */

  document.addEventListener('click', function (e) {
    var root = getRoot();
    var target = e.target;

    // Variant selection (desktop buttons + mobile sheet rows)
    var sizeBtn = target.closest('[data-size-option]');
    if (sizeBtn && root) {
      if (sizeBtn.classList.contains('is-soldout')) return;
      var size = sizeBtn.getAttribute('data-value');
      var current = selectedVariant(root);
      var color = hasColors(root) && current ? current.color : null;
      select(root, pick(root, size, color) || pick(root, size, null));
      return;
    }

    var colorBtn = target.closest('[data-color-option]');
    if (colorBtn && root) {
      if (colorBtn.classList.contains('is-soldout')) return;
      var colorValue = colorBtn.getAttribute('data-value');
      var cur = selectedVariant(root);
      select(root, pick(root, cur ? cur.size : null, colorValue) || pick(root, null, colorValue));
      return;
    }

    var rowRemove = target.closest('[data-row-remove]');
    if (rowRemove && root) {
      runCartAction(root, root.getAttribute('data-remove-url'), rowRemove.getAttribute('data-variant-id'), false);
      return;
    }

    var row = target.closest('[data-variant-row]');
    if (row && root) {
      var rv = findVariant(root, row.getAttribute('data-variant-id'));
      if (rv && rv.stock > 0) select(root, rv);
      return;
    }

    // Mobile bottom sheet
    if (target.closest('[data-pdp-open-sheet]')) {
      setSheet(true);
      return;
    }
    if (target.closest('[data-pdp-sheet-close]')) {
      setSheet(false);
      return;
    }

    // Remove (product page buttons)
    if (target.closest('[data-pdp-remove]') && root) {
      var sel = selectedVariant(root);
      if (sel) runCartAction(root, root.getAttribute('data-remove-url'), sel.id, false);
      return;
    }

    // Remove (mini-cart)
    var miniRemove = target.closest('[data-mini-remove]');
    if (miniRemove) {
      var mini = getMini();
      runCartAction(
        root,
        mini ? mini.getAttribute('data-remove-url') : '',
        miniRemove.getAttribute('data-variant-id'),
        false
      );
      return;
    }

    // Header CART link: on the product page it opens the glass panel
    var cartLink = target.closest('[data-cart-link]');
    if (cartLink && root && !isMobile()) {
      var count = Number((document.querySelector('[data-cart-count]') || {}).textContent) || 0;
      if (count > 0 || (getMini() && getMini().classList.contains('is-open'))) {
        e.preventDefault();
        var panel = getMini();
        if (panel && panel.classList.contains('is-open')) toggleMini(false);
        else loadMini(root);
        return;
      }
    }

    // Gallery dash indicators (mobile)
    var dot = target.closest('[data-pdp-dot]');
    if (dot) {
      var gal = document.querySelector('[data-pdp-gallery]');
      if (gal) gal.scrollTo({ left: gal.clientWidth * Number(dot.getAttribute('data-index')), behavior: 'smooth' });
      return;
    }

    // Image lightbox
    var zoomOpen = target.closest('[data-zoom-open]');
    if (zoomOpen) {
      setLightbox(true, Number(zoomOpen.getAttribute('data-index')) || 0);
      return;
    }
    if (target.closest('[data-lightbox-close]')) {
      setLightbox(false);
      return;
    }
    if (target.closest('[data-lightbox-prev]')) {
      var elp = lbEls();
      if (elp) lbShow(elp, lb.idx - 1);
      return;
    }
    if (target.closest('[data-lightbox-next]')) {
      var eln = lbEls();
      if (eln) lbShow(eln, lb.idx + 1);
      return;
    }

    // Size chart modal
    if (target.closest('[data-open-size-guide]')) {
      setSizeGuide(true);
      return;
    }
    if (target.closest('[data-size-guide-close]')) {
      setSizeGuide(false);
      return;
    }

    // Click anywhere else closes the mini-cart
    var openMini = getMini();
    if (openMini && openMini.classList.contains('is-open') && !target.closest('[data-mini-cart]')) {
      toggleMini(false);
    }
  });

  // "ADD TO CART" is a submit button; the form still works without JS.
  document.addEventListener('submit', function (e) {
    var root = e.target.closest ? e.target.closest('[data-pdp]') : null;
    if (!root) return;
    e.preventDefault();

    var v = selectedVariant(root);
    if (!v || v.stock <= 0) return;

    if (v.inCart) {
      setSheet(false);
      if (!isMobile()) loadMini(root);
      return;
    }

    runCartAction(root, root.getAttribute('data-add-url'), v.id, true, function () {
      setSheet(false);
    });
  });

  document.addEventListener('keydown', function (e) {
    var lbox = document.querySelector('[data-lightbox]');
    if (lbox && !lbox.hidden) {
      if (e.key === 'Escape') setLightbox(false);
      else if (e.key === 'ArrowLeft') lbShow(lbEls(), lb.idx - 1);
      else if (e.key === 'ArrowRight') lbShow(lbEls(), lb.idx + 1);
      return;
    }
    if (e.key !== 'Escape') return;
    var modal = document.querySelector('[data-size-guide]');
    if (modal && !modal.hidden) {
      setSizeGuide(false);
      return;
    }
    var sheet = document.querySelector('[data-pdp-sheet].is-open');
    if (sheet) {
      setSheet(false);
      return;
    }
    toggleMini(false);
  });

  /* ---------- init (first load + after Barba swaps) ---------- */

  function init() {
    var root = getRoot();
    if (root) render(root);
    lockScroll(false);
  }

  var previousRebind = window.FAWApp && window.FAWApp.rebind;
  window.FAWApp = window.FAWApp || {};
  window.FAWApp.rebind = function () {
    if (typeof previousRebind === 'function') previousRebind();
    init();
  };

  init();
})();
