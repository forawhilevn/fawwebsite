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

    const variants = window.__FAW_VARIANTS__ || [];
    const match = variants.find(
      (v) => v.size === sizeVal && (colorVal === '' || v.color === colorVal)
    );

    const variantInput = form.querySelector('input[name="variantId"]');
    const addBtn = form.querySelector('.js-add-to-cart');
    if (variantInput) variantInput.value = match ? match.id : '';
    if (addBtn) addBtn.disabled = !match || match.stock <= 0;
  });

  // Gallery thumbnail swap on the product detail page
  document.addEventListener('click', function (e) {
    const thumb = e.target.closest('[data-gallery-thumb]');
    if (!thumb) return;
    const main = document.querySelector('[data-gallery-main]');
    if (!main) return;
    main.src = thumb.getAttribute('data-gallery-thumb');
    document.querySelectorAll('[data-gallery-thumb]').forEach((t) => t.classList.remove('is-active'));
    thumb.classList.add('is-active');
  });

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
