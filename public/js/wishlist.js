(function () {
  const STORAGE_KEY = 'faw_wishlist';

  function getWishlist() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveWishlist(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function isSaved(slug) {
    return getWishlist().some((item) => item.slug === slug);
  }

  function toggle(product) {
    const items = getWishlist();
    const idx = items.findIndex((item) => item.slug === product.slug);
    if (idx > -1) {
      items.splice(idx, 1);
    } else {
      items.push(product);
    }
    saveWishlist(items);
    return idx === -1;
  }

  function updateButtonState(btn) {
    const slug = btn.getAttribute('data-wishlist-slug');
    const saved = isSaved(slug);
    btn.classList.toggle('is-saved', saved);
    btn.setAttribute('aria-pressed', saved ? 'true' : 'false');
  }

  document.addEventListener('DOMContentLoaded', refreshButtons);
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-wishlist-toggle]');
    if (!btn) return;
    e.preventDefault();
    toggle({
      slug: btn.getAttribute('data-wishlist-slug'),
      name: btn.getAttribute('data-wishlist-name'),
      image: btn.getAttribute('data-wishlist-image'),
      price: btn.getAttribute('data-wishlist-price'),
      href: btn.getAttribute('data-wishlist-href')
    });
    updateButtonState(btn);
    renderWishlistPage();
  });

  function refreshButtons() {
    document.querySelectorAll('[data-wishlist-toggle]').forEach(updateButtonState);
    renderWishlistPage();
  }

  function renderWishlistPage() {
    const container = document.getElementById('wishlistGrid');
    if (!container) return;
    const items = getWishlist();
    const emptyMsg = document.getElementById('wishlistEmpty');

    if (items.length === 0) {
      container.innerHTML = '';
      if (emptyMsg) emptyMsg.style.display = 'block';
      return;
    }
    if (emptyMsg) emptyMsg.style.display = 'none';

    container.innerHTML = items
      .map(
        (item) => `
      <a href="${item.href}" class="product-card">
        <div class="product-card__media"><img src="${item.image}" alt="${item.name}" loading="lazy" /></div>
        <div class="product-card__body">
          <span class="product-card__name">${item.name}</span>
          <span class="product-card__price">${item.price}</span>
        </div>
      </a>`
      )
      .join('');
  }

  window.FAWWishlist = { getWishlist, toggle, isSaved, refreshButtons };
})();
