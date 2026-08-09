const { Jimp } = require('jimp');

const IMAGE_SIZES = {
  hero: { w: 1920, h: 960 },
  featured: { w: 900, h: 1200 },
  thumb: { w: 800, h: 800 },
  product: { w: 1200, h: 1500 },
  category: { w: 700, h: 700 }
};

async function cropToFixedSize(filePath, sizeKey) {
  const size = IMAGE_SIZES[sizeKey];
  if (!size) throw new Error('Unknown image size key: ' + sizeKey);
  const image = await Jimp.read(filePath);
  image.cover({ w: size.w, h: size.h });
  await image.write(filePath);
}

module.exports = { cropToFixedSize, IMAGE_SIZES };
