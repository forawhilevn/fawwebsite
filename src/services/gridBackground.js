// Background behind the product grid (home + shop), set in Admin > Hinh nen san pham.
const DEFAULT_IMAGE = '/images/brand/pattern-bg.jpg';
const DEFAULT_COLOR = '#0a0a0a';

function cleanColor(value) {
  const v = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : DEFAULT_COLOR;
}

// Only our own upload paths are allowed into the CSS.
function cleanImage(value) {
  const v = String(value || '').trim();
  return /^\/images\/uploads\/backgrounds\/[\w.-]+$/.test(v) ? v : '';
}

function resolve(s) {
  const mode = s.gridbg_mode === 'color' ? 'color' : 'image';
  const uploaded = cleanImage(s.gridbg_image);
  return {
    mode,
    color: cleanColor(s.gridbg_color),
    uploaded,
    image: mode === 'image' ? (uploaded || DEFAULT_IMAGE) : '',
    fixed: s.gridbg_fixed !== '0'
  };
}

// CSS variables read by .product-grid-wrap in style.css
function buildCss(s) {
  const bg = resolve(s || {});
  return ':root{' +
    '--grid-bg-color:' + bg.color + ';' +
    '--grid-bg-image:' + (bg.image ? "url('" + bg.image + "')" : 'none') + ';' +
    '--grid-bg-attach:' + (bg.fixed ? 'fixed' : 'scroll') + ';' +
    '--grid-bg-layer:' + (bg.fixed ? 'fixed' : 'absolute') + ';' +
    '}';
}

module.exports = { resolve, buildCss, cleanColor, DEFAULT_IMAGE, DEFAULT_COLOR };
