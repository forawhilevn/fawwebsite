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
