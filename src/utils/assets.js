const fs = require('fs');
const path = require('path');
const storage = require('./storage');

const IMG = /\.(jpe?g|png|webp)$/i;

function listDir(dir) {
  try {
    return fs.readdirSync(dir);
  } catch (err) {
    return [];
  }
}

// Lookbook photos of one product. Uploads live in the storage folder (outside the app in
// production); files shipped inside the app's public/ folder are listed too.
function getLookbookImages(slug) {
  const names = new Set();
  [storage.STORAGE_DIR, storage.PUBLIC_DIR].forEach((base) => {
    listDir(path.join(base, 'images', 'lookbook', slug)).forEach((f) => {
      if (IMG.test(f)) names.add(f);
    });
  });
  return Array.from(names)
    .sort()
    .map((f) => `/images/lookbook/${slug}/${f}`);
}

function getSizeChartUrl(slug) {
  const exts = ['jpg', 'jpeg', 'png', 'webp'];
  for (const ext of exts) {
    const url = `/images/sizecharts/${slug}.${ext}`;
    if (storage.locate(url)) return url;
  }
  return null;
}

module.exports = { getLookbookImages, getSizeChartUrl };
