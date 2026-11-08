const fs = require('fs');
const storage = require('../../utils/storage');
const path = require('path');
const db = require('../../db');
const { cropToFixedSize } = require('../../utils/imageProcess');
const { ensureBannerSchema } = require('../../services/bannerSchema');

const IMAGE_ERROR_MESSAGE = 'Ảnh không hợp lệ hoặc bị lỗi khi xử lý. Vui lòng thử lại với file JPG/PNG/GIF/WEBP khác.';

function removeUploadedFile(imageUrl) {
  if (imageUrl && imageUrl.startsWith('/images/uploads/')) {
    const filePath = path.join(storage.STORAGE_DIR, imageUrl);
    fs.unlink(filePath, () => {});
  }
}

async function renderWithError(req, res, message) {
  await ensureBannerSchema();
  const heroBanners = await db('banners').where('type', 'hero').orderBy('sort_order');
  const featuredBanner = await db('banners').where('type', 'featured').first();
  const archiveBanners = await db('banners').where('type', 'archive').orderBy('sort_order');

  res.status(400).render('admin/banners', {
    title: 'Quản lý Banner - FAW Admin',
    heroBanners,
    featuredBanner,
    archiveBanners,
    error: message
  });
}

async function listBanners(req, res, next) {
  try {
    await ensureBannerSchema();
    const heroBanners = await db('banners').where('type', 'hero').orderBy('sort_order');
    const featuredBanner = await db('banners').where('type', 'featured').first();
    const archiveBanners = await db('banners').where('type', 'archive').orderBy('sort_order');

    res.render('admin/banners', {
      title: 'Quản lý Banner - FAW Admin',
      heroBanners,
      featuredBanner,
      archiveBanners,
      error: null
    });
  } catch (err) {
    next(err);
  }
}

const BANNER_DIR = path.join(storage.STORAGE_DIR, 'images', 'uploads', 'banners');

// Crop one uploaded file and return its public URL (or null if there is no file).
async function processHeroFile(file, sizeKey) {
  if (!file) return null;
  const destPath = path.join(BANNER_DIR, file.filename);
  try {
    await cropToFixedSize(destPath, sizeKey);
  } catch (imgErr) {
    removeUploadedFile('/images/uploads/banners/' + file.filename);
    throw new Error('IMAGE');
  }
  return '/images/uploads/banners/' + file.filename;
}

function heroFiles(req) {
  const f = req.files || {};
  return { desktop: (f.imageDesktop || [])[0], mobile: (f.imageMobile || [])[0] };
}

function cleanupHeroFiles(files) {
  [files.desktop, files.mobile].forEach((f) => {
    if (f) removeUploadedFile('/images/uploads/banners/' + f.filename);
  });
}

// A banner needs at least one image. Missing desktop image -> the mobile one
// is used for both, missing mobile image -> desktop is used for both.
async function createHeroBanner(req, res, next) {
  const files = heroFiles(req);
  try {
    await ensureBannerSchema();
    if (!files.desktop && !files.mobile) return res.redirect('/admin/banner');

    let desktopUrl;
    let mobileUrl;
    try {
      desktopUrl = await processHeroFile(files.desktop, 'hero');
      mobileUrl = await processHeroFile(files.mobile, 'heroMobile');
    } catch (e) {
      cleanupHeroFiles(files);
      return renderWithError(req, res, IMAGE_ERROR_MESSAGE);
    }

    const maxSort = await db('banners').where('type', 'hero').max('sort_order as max').first();

    await db('banners').insert({
      image_url: desktopUrl || mobileUrl,
      image_mobile_url: mobileUrl || null,
      link_url: req.body.linkUrl || null,
      title_vi: req.body.titleVi || null,
      title_en: req.body.titleEn || null,
      sort_order: (maxSort.max || 0) + 1,
      is_active: true,
      type: 'hero'
    });

    res.redirect('/admin/banner');
  } catch (err) {
    cleanupHeroFiles(files);
    next(err);
  }
}

// Replace the desktop image, the mobile image, or both - independently.
async function updateHeroImages(req, res, next) {
  const files = heroFiles(req);
  try {
    await ensureBannerSchema();
    const banner = await db('banners').where('id', req.params.id).where('type', 'hero').first();
    if (!banner || (!files.desktop && !files.mobile)) {
      cleanupHeroFiles(files);
      return res.redirect('/admin/banner');
    }

    let desktopUrl;
    let mobileUrl;
    try {
      desktopUrl = await processHeroFile(files.desktop, 'hero');
      mobileUrl = await processHeroFile(files.mobile, 'heroMobile');
    } catch (e) {
      cleanupHeroFiles(files);
      return renderWithError(req, res, IMAGE_ERROR_MESSAGE);
    }

    const update = {};
    const mobileOnly = banner.image_mobile_url && banner.image_mobile_url === banner.image_url;
    if (desktopUrl) update.image_url = desktopUrl;
    if (mobileUrl) {
      update.image_mobile_url = mobileUrl;
      // mobile-only banner: the shared file is replaced, so desktop follows it
      if (mobileOnly && !desktopUrl) update.image_url = mobileUrl;
    }
    await db('banners').where('id', banner.id).update(update);

    if (desktopUrl && banner.image_url !== banner.image_mobile_url) removeUploadedFile(banner.image_url);
    if (mobileUrl && banner.image_mobile_url) removeUploadedFile(banner.image_mobile_url);

    res.redirect('/admin/banner');
  } catch (err) {
    cleanupHeroFiles(files);
    next(err);
  }
}

// Delete the desktop image: desktop then falls back to the mobile image.
async function removeHeroDesktop(req, res, next) {
  try {
    await ensureBannerSchema();
    const banner = await db('banners').where('id', req.params.id).where('type', 'hero').first();
    if (banner && banner.image_mobile_url && banner.image_mobile_url !== banner.image_url) {
      await db('banners').where('id', banner.id).update({ image_url: banner.image_mobile_url });
      removeUploadedFile(banner.image_url);
    }
    res.redirect('/admin/banner');
  } catch (err) {
    next(err);
  }
}

// Go back to using the desktop image on mobile too.
async function removeHeroMobile(req, res, next) {
  try {
    await ensureBannerSchema();
    const banner = await db('banners').where('id', req.params.id).where('type', 'hero').first();
    if (banner && banner.image_mobile_url) {
      await db('banners').where('id', banner.id).update({ image_mobile_url: null });
      if (banner.image_mobile_url !== banner.image_url) removeUploadedFile(banner.image_mobile_url);
    }
    res.redirect('/admin/banner');
  } catch (err) {
    next(err);
  }
}

async function toggleHeroBanner(req, res, next) {
  try {
    const banner = await db('banners').where('id', req.params.id).where('type', 'hero').first();
    if (banner) {
      await db('banners').where('id', banner.id).update({ is_active: !banner.is_active });
    }
    res.redirect('/admin/banner');
  } catch (err) {
    next(err);
  }
}

async function updateHeroTitle(req, res, next) {
  try {
    const banner = await db('banners').where('id', req.params.id).where('type', 'hero').first();
    if (banner) {
      await db('banners').where('id', banner.id).update({
        title_vi: String(req.body.titleVi || '').trim().slice(0, 200) || null,
        title_en: String(req.body.titleEn || '').trim().slice(0, 200) || null
      });
    }
    res.redirect('/admin/banner');
  } catch (err) {
    next(err);
  }
}

// Swap a hero banner with its neighbour. The first ACTIVE hero banner is the
// one shown on the homepage, so order matters.
function moveHeroBanner(direction) {
  return async function (req, res, next) {
    try {
      const list = await db('banners').where('type', 'hero').orderBy('sort_order').orderBy('id');
      const idx = list.findIndex((b) => String(b.id) === String(req.params.id));
      const swapWith = direction === 'up' ? idx - 1 : idx + 1;
      if (idx >= 0 && swapWith >= 0 && swapWith < list.length) {
        // normalise to a clean 1..n sequence, then swap
        const order = list.map((b) => b.id);
        const tmp = order[idx];
        order[idx] = order[swapWith];
        order[swapWith] = tmp;
        for (let i = 0; i < order.length; i += 1) {
          await db('banners').where('id', order[i]).update({ sort_order: i + 1 });
        }
      }
      res.redirect('/admin/banner');
    } catch (err) {
      next(err);
    }
  };
}

async function deleteHeroBanner(req, res, next) {
  try {
    const banner = await db('banners').where('id', req.params.id).where('type', 'hero').first();
    if (banner) {
      await db('banners').where('id', banner.id).del();
      removeUploadedFile(banner.image_url);
      if (banner.image_mobile_url && banner.image_mobile_url !== banner.image_url) removeUploadedFile(banner.image_mobile_url);
    }
    res.redirect('/admin/banner');
  } catch (err) {
    next(err);
  }
}

async function uploadFeaturedBanner(req, res, next) {
  try {
    const existing = await db('banners').where('type', 'featured').first();

    let imageUrl = existing ? existing.image_url : null;
    if (req.file) {
      const destPath = path.join(storage.STORAGE_DIR, 'images', 'uploads', 'banners', req.file.filename);
      try {
        await cropToFixedSize(destPath, 'featured');
      } catch (imgErr) {
        removeUploadedFile('/images/uploads/banners/' + req.file.filename);
        return renderWithError(req, res, IMAGE_ERROR_MESSAGE);
      }
      imageUrl = '/images/uploads/banners/' + req.file.filename;
    }

    if (!imageUrl) return res.redirect('/admin/banner');

    if (existing) {
      if (req.file) removeUploadedFile(existing.image_url);
      await db('banners').where('id', existing.id).update({ image_url: imageUrl, link_url: req.body.linkUrl || null });
    } else {
      await db('banners').insert({
        image_url: imageUrl,
        link_url: req.body.linkUrl || null,
        sort_order: 1,
        is_active: true,
        type: 'featured'
      });
    }

    res.redirect('/admin/banner');
  } catch (err) {
    next(err);
  }
}

async function createArchiveBanner(req, res, next) {
  try {
    if (!req.file) return res.redirect('/admin/banner');

    const destPath = path.join(storage.STORAGE_DIR, 'images', 'uploads', 'banners', req.file.filename);
    try {
      await cropToFixedSize(destPath, 'thumb');
    } catch (imgErr) {
      removeUploadedFile('/images/uploads/banners/' + req.file.filename);
      return renderWithError(req, res, IMAGE_ERROR_MESSAGE);
    }

    const imageUrl = '/images/uploads/banners/' + req.file.filename;
    const maxSort = await db('banners').where('type', 'archive').max('sort_order as max').first();

    await db('banners').insert({
      image_url: imageUrl,
      title_vi: req.body.titleVi || null,
      title_en: req.body.titleEn || null,
      sort_order: (maxSort.max || 0) + 1,
      is_active: true,
      type: 'archive'
    });

    res.redirect('/admin/banner');
  } catch (err) {
    next(err);
  }
}

async function deleteArchiveBanner(req, res, next) {
  try {
    const banner = await db('banners').where('id', req.params.id).where('type', 'archive').first();
    if (banner) {
      await db('banners').where('id', banner.id).del();
      removeUploadedFile(banner.image_url);
    }
    res.redirect('/admin/banner');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  updateHeroTitle,
  listBanners,
  createHeroBanner,
  updateHeroImages,
  removeHeroMobile,
  removeHeroDesktop,
  toggleHeroBanner,
  moveHeroBanner,
  deleteHeroBanner,
  uploadFeaturedBanner,
  createArchiveBanner,
  deleteArchiveBanner
};
