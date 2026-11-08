const fs = require('fs');
const path = require('path');

const storage = require('./storage');

const PUBLIC_DIR = storage.PUBLIC_DIR;

// lookbook photos can sit in the app (bundled with the code) and in upload storage
function getLookbookImages(slug) {
  const names = new Set();
  [PUBLIC_DIR, storage.STORAGE_DIR].forEach((root) => {
    const dir = path.join(root, 'images', 'lookbook', slug);
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).forEach((f) => names.add(f));
  });
  return Array.from(names).sort().map((f) => `/images/lookbook/${slug}/${f}`);
}

function getSizeChartUrl(slug) {
  const exts = ['jpg', 'jpeg', 'png', 'webp'];
  for (const ext of exts) {
    const filePath = storage.locate(`/images/sizecharts/${slug}.${ext}`);
    if (filePath) {
      // ?v= makes browsers pick up a replaced chart straight away
      return `/images/sizecharts/${slug}.${ext}?v=${Math.floor(fs.statSync(filePath).mtimeMs)}`;
    }
  }
  return null;
}

module.exports = { getLookbookImages, getSizeChartUrl };
