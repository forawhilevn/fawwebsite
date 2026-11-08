const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

function getLookbookImages(slug) {
  const dir = path.join(PUBLIC_DIR, 'images', 'lookbook', slug);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort()
    .map((f) => `/images/lookbook/${slug}/${f}`);
}

function getSizeChartUrl(slug) {
  const exts = ['jpg', 'jpeg', 'png', 'webp'];
  for (const ext of exts) {
    const filePath = path.join(PUBLIC_DIR, 'images', 'sizecharts', `${slug}.${ext}`);
    if (fs.existsSync(filePath)) {
      // ?v= makes browsers pick up a replaced chart straight away
      return `/images/sizecharts/${slug}.${ext}?v=${Math.floor(fs.statSync(filePath).mtimeMs)}`;
    }
  }
  return null;
}

module.exports = { getLookbookImages, getSizeChartUrl };
