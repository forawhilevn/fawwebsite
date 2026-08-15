(function () {
  window.FAWApp = window.FAWApp || {};

  // Variant (size/color) selection on the product detail page
  document.addEventListener('click', function (e) {
    const opt = e.target.closest('.variant-option');
    if (!opt || opt.classList.contains('is-disabled')) return;

    const group = opt.closest('.variant-options');
    if (!group) return;

    group.querySelectorAll('.variant-option').forEach((el) => el.classList.remove('is-selected'));
    opt.classList.add('is-selected');

    const form = opt.closest('form');
    if (!form) return;

    const size = form.querySelector('.variant-options[data-role="size"] .is-selected');
    const color = form.querySelector('.variant-options[data-role="color"] .is-selected');
    const sizeVal = size ? size.getAttribute('data-value') : null;
    const colorVal = color ? color.getAttribute('data-value') : '';

    let variants = [];
    try {
      variants = JSON.parse(form.getAttribute('data-variants') || '[]');
    } catch (err) {
      variants = [];
    }
    const match = variants.find(
      (v) => v.size === sizeVal && (colorVal === '' || v.color === colorVal)
    );

    const variantInput = form.querySelector('input[name="variantId"]');
    if (variantInput) variantInput.value = match ? match.id : '';

    const hint = document.getElementById('variantHint');
    if (match && hint) hint.style.display = 'none';
  });

  // Prevent adding to cart before a required variant is selected, with visible feedback
  document.addEventListener('submit', function (e) {
    const form = e.target.closest('.js-product-form');
    if (!form) return;
    if (form.getAttribute('data-requires-variant') !== '1') return;

    const variantInput = form.querySelector('input[name="variantId"]');
    if (!variantInput || variantInput.value) return;

    e.preventDefault();
    const hint = document.getElementById('variantHint');
    if (hint) hint.style.display = 'block';
    const firstGroup = form.querySelector('.variant-options');
    if (firstGroup) firstGroup.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });

  // Quantity stepper on the product detail page
  document.addEventListener('click', function (e) {
    const decBtn = e.target.closest('[data-qty-decrease]');
    const incBtn = e.target.closest('[data-qty-increase]');
    if (!decBtn && !incBtn) return;

    const selector = (decBtn || incBtn).closest('.qty-selector');
    const input = selector && selector.querySelector('[data-qty-input]');
    if (!input) return;

    const current = Math.max(1, parseInt(input.value, 10) || 1);
    input.value = decBtn ? Math.max(1, current - 1) : current + 1;
  });

  // Product gallery: thumbnail paging (4 at a time), main-image arrows, swipe
  var THUMBS_PER_PAGE = 4;
  var THUMB_STEP = 92; // 84px thumb + 8px gap, matches CSS

  function selectGalleryImage(gallery, index) {
    if (!gallery) return;
    var thumbs = gallery.querySelectorAll('[data-gallery-thumb]');
    var target = thumbs[index];
    if (!target) return;
    thumbs.forEach(function (t) { t.classList.remove('is-active'); });
    target.classList.add('is-active');
    setThumbPage(gallery, Math.floor(index / THUMBS_PER_PAGE));

    var mainImg = gallery.querySelector('[data-gallery-main]');
    if (!mainImg) return;
    var newSrc = target.getAttribute('data-gallery-thumb');
    if (mainImg.getAttribute('src') === newSrc) return;

    // Mirrors an AnimatePresence mode="wait" crossfade: exit (fade + slide
    // up) fully finishes, then the new frame enters (fade + slide up into
    // place) — done here with two chained CSS transition classes since this
    // is plain JS/CSS, not React/framer-motion.
    mainImg.classList.remove('is-entering');
    mainImg.classList.add('is-exiting');
    setTimeout(function () {
      mainImg.src = newSrc;
      mainImg.classList.remove('is-exiting');
      void mainImg.offsetWidth; // force reflow so the enter animation replays
      mainImg.classList.add('is-entering');
      setTimeout(function () {
        mainImg.classList.remove('is-entering');
      }, 320);
    }, 160);
  }

  function setThumbPage(gallery, page) {
    var track = gallery.querySelector('[data-thumbs-track]');
    var thumbs = gallery.querySelectorAll('[data-gallery-thumb]');
    if (!track || !thumbs.length) return;
    var totalPages = Math.ceil(thumbs.length / THUMBS_PER_PAGE);
    var clamped = Math.max(0, Math.min(page, totalPages - 1));
    track.style.transform = 'translateY(-' + clamped * THUMBS_PER_PAGE * THUMB_STEP + 'px)';
    gallery.setAttribute('data-thumb-page', clamped);

    var prevBtn = gallery.querySelector('[data-thumbs-prev]');
    var nextBtn = gallery.querySelector('[data-thumbs-next]');
    if (prevBtn) prevBtn.disabled = clamped <= 0;
    if (nextBtn) nextBtn.disabled = clamped >= totalPages - 1;
  }

  function activeIndex(gallery) {
    var thumbs = gallery.querySelectorAll('[data-gallery-thumb]');
    return Array.from(thumbs).findIndex(function (t) { return t.classList.contains('is-active'); });
  }

  document.addEventListener('click', function (e) {
    var thumb = e.target.closest('[data-gallery-thumb]');
    if (thumb) {
      selectGalleryImage(thumb.closest('[data-gallery]'), Number(thumb.getAttribute('data-index')));
      return;
    }

    var prevImg = e.target.closest('[data-gallery-prev]');
    var nextImg = e.target.closest('[data-gallery-next]');
    if (prevImg || nextImg) {
      var g1 = (prevImg || nextImg).closest('[data-gallery]');
      var thumbs1 = g1.querySelectorAll('[data-gallery-thumb]');
      var idx1 = activeIndex(g1);
      var next1 = prevImg ? idx1 - 1 : idx1 + 1;
      if (next1 < 0) next1 = thumbs1.length - 1;
      if (next1 >= thumbs1.length) next1 = 0;
      selectGalleryImage(g1, next1);
      return;
    }

    var prevPage = e.target.closest('[data-thumbs-prev]');
    var nextPage = e.target.closest('[data-thumbs-next]');
    if (prevPage || nextPage) {
      var g2 = (prevPage || nextPage).closest('[data-gallery]');
      var current = Number(g2.getAttribute('data-thumb-page') || 0);
      setThumbPage(g2, prevPage ? current - 1 : current + 1);
    }
  });

  // Swipe on the main product image (mobile)
  (function () {
    var touchGallery = null;
    var startX = 0;
    var startY = 0;

    document.addEventListener('touchstart', function (e) {
      var mainEl = e.target.closest('.product-detail__gallery-main');
      touchGallery = mainEl ? mainEl.closest('[data-gallery]') : null;
      if (!touchGallery) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', function (e) {
      if (!touchGallery) return;
      var touch = e.changedTouches[0];
      var dx = touch.clientX - startX;
      var dy = touch.clientY - startY;
      var gallery = touchGallery;
      touchGallery = null;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
      var thumbs = gallery.querySelectorAll('[data-gallery-thumb]');
      var idx = activeIndex(gallery);
      var next = dx > 0 ? idx - 1 : idx + 1;
      if (next < 0) next = thumbs.length - 1;
      if (next >= thumbs.length) next = 0;
      selectGalleryImage(gallery, next);
    }, { passive: true });
  })();

  // Size guide modal
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-open-size-guide]')) {
      const modal = document.getElementById('sizeGuideModal');
      if (modal) modal.style.display = 'flex';
    }
    if (e.target.closest('[data-close-size-guide]') || e.target.id === 'sizeGuideModal') {
      const modal = document.getElementById('sizeGuideModal');
      if (modal) modal.style.display = 'none';
    }
  });

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
