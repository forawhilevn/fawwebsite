const { Jimp } = require('jimp');

const IMAGE_SIZES = {
  hero: { w: 1920, h: 960 },
  heroMobile: { w: 900, h: 1100 },
  featured: { w: 900, h: 1200 },
  thumb: { w: 800, h: 800 },
  product: { w: 1200, h: 1500 },
  category: { w: 700, h: 700 },
  store: { w: 800, h: 1000 }
};

async function cropToFixedSize(filePath, sizeKey) {
  const size = IMAGE_SIZES[sizeKey];
  if (!size) throw new Error('Unknown image size key: ' + sizeKey);
  const image = await Jimp.read(filePath);
  image.cover({ w: size.w, h: size.h });
  if (/\.jpe?g$/i.test(filePath)) {
    try {
      await image.write(filePath, { quality: 85 });
      return;
    } catch (err) {
      /* fall back to the default quality below */
    }
  }
  await image.write(filePath);
}

module.exports = { cropToFixedSize, IMAGE_SIZES };
