// Helpers for the stores (dai ly) page: Google Maps links without an API key.
function mapQuery(store) {
  const ll = String(store.lat_lng || '').replace(/\s+/g, '');
  if (/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(ll)) return ll;
  return [store.address, store.city].filter(Boolean).join(', ') || store.name_vi;
}

function embedUrl(store, locale) {
  return 'https://www.google.com/maps?q=' + encodeURIComponent(mapQuery(store)) +
    '&output=embed&hl=' + (locale === 'en' ? 'en' : 'vi');
}

function directionsUrl(store) {
  if (store.maps_url && /^https?:\/\//i.test(store.maps_url)) return store.maps_url;
  return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(mapQuery(store));
}

function socialUrl(value, base) {
  const v = String(value || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  return base + v.replace(/^@/, '');
}

function imageList(store) {
  let list = [];
  try { list = JSON.parse(store.images || '[]'); } catch (e) { list = []; }
  if (!Array.isArray(list)) list = [];
  if (!list.length && store.image_url) list = [store.image_url];
  return list.filter((u) => typeof u === 'string' && u);
}

function prepare(store, locale) {
  const en = locale === 'en';
  return Object.assign({}, store, {
    name: (en && store.name_en) || store.name_vi,
    note: (en && store.note_en) || store.note_vi || '',
    embed: embedUrl(store, locale),
    imageList: imageList(store),
    directions: directionsUrl(store),
    instagramUrl: socialUrl(store.instagram, 'https://instagram.com/'),
    facebookUrl: socialUrl(store.facebook, 'https://facebook.com/'),
    phoneHref: String(store.phone || '').replace(/[^\d+]/g, '')
  });
}

module.exports = { imageList, prepare, embedUrl, directionsUrl };
