const fs = require('fs');
const path = require('path');
const db = require('../../db');
const { cropToFixedSize } = require('../../utils/imageProcess');

const IMAGE_ERROR_MESSAGE = 'Ảnh không hợp lệ hoặc bị lỗi khi xử lý. Vui lòng thử lại với file JPG/PNG/GIF/WEBP khác.';

function removeUploadedFile(imageUrl) {
  if (imageUrl && imageUrl.startsWith('/images/uploads/')) {
    const filePath = path.join(__dirname, '..', '..', '..', 'public', imageUrl);
    fs.unlink(filePath, () => {});
  }
}

async function renderWithError(req, res, message) {
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

async function createHeroBanner(req, res, next) {
  try {
    if (!req.file) return res.redirect('/admin/banner');

    const destPath = path.join(__dirname, '..', '..', '..', 'public', 'images', 'uploads', 'banners', req.file.filename);
    try {
      await cropToFixedSize(destPath, 'hero');
    } catch (imgErr) {
      removeUploadedFile('/images/uploads/banners/' + req.file.filename);
      return renderWithError(req, res, IMAGE_ERROR_MESSAGE);
    }

    const imageUrl = '/images/uploads/banners/' + req.file.filename;
    const maxSort = await db('banners').where('type', 'hero').max('sort_order as max').first();

    await db('banners').insert({
      image_url: imageUrl,
      link_url: req.body.linkUrl || null,
      title_vi: req.body.titleVi || null,
      title_en: req.body.titleEn || null,
      sort_order: (maxSort.max || 0) + 1,
      is_active: true,
      type: 'hero'
    });

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

async function deleteHeroBanner(req, res, next) {
  try {
    const banner = await db('banners').where('id', req.params.id).where('type', 'hero').first();
    if (banner) {
      await db('banners').where('id', banner.id).del();
      removeUploadedFile(banner.image_url);
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
      const destPath = path.join(__dirname, '..', '..', '..', 'public', 'images', 'uploads', 'banners', req.file.filename);
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

    const destPath = path.join(__dirname, '..', '..', '..', 'public', 'images', 'uploads', 'banners', req.file.filename);
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
  listBanners,
  createHeroBanner,
  toggleHeroBanner,
  deleteHeroBanner,
  uploadFeaturedBanner,
  createArchiveBanner,
  deleteArchiveBanner
};
