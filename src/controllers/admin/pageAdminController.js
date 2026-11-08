const fs = require('fs');
const path = require('path');
const db = require('../../db');
const pages = require('../../services/pages');
const { sanitizeHtml } = require('../../utils/sanitize');

function removeUploaded(url) {
  if (url && url.indexOf('/images/uploads/pages/') === 0) {
    fs.unlink(path.join(__dirname, '..', '..', '..', 'public', url), () => {});
  }
}

function clean(v, max) { return String(v || '').trim().slice(0, max); }
function slugify(v) {
  return String(v || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

async function listPages(req, res, next) {
  try {
    await pages.ensurePagesSchema();
    const rows = await db('pages').orderBy('sort_order').orderBy('id');
    const bySlug = new Map(rows.map((r) => [r.slug, r]));
    const system = Object.keys(pages.SYSTEM).map((slug) => ({
      slug,
      title: pages.SYSTEM[slug].titleVi,
      edited: !!(bySlug.get(slug) && (bySlug.get(slug).content_vi || bySlug.get(slug).content_en)),
      url: slug === 'about' ? '/about' : '/' + slug
    }));
    res.render('admin/pages', {
      title: 'Trang chính sách - FAW Admin',
      system,
      custom: rows.filter((r) => !r.is_system),
      saved: req.query.saved || null
    });
  } catch (err) {
    next(err);
  }
}

async function showForm(req, res, next) {
  try {
    await pages.ensurePagesSchema();
    const slug = req.params.slug;
    const meta = pages.SYSTEM[slug];
    let row = slug ? await db('pages').where({ slug }).first() : null;
    if (slug && !row && !meta) return res.redirect('/admin/chinh-sach');
    const def = meta ? pages.defaultContent(slug) : { vi: '', en: '' };
    const page = {
      slug: slug || '',
      is_system: !!meta,
      title_vi: row ? row.title_vi : (meta ? meta.titleVi : ''),
      title_en: row ? row.title_en : (meta ? meta.titleEn : ''),
      content_vi: row && row.content_vi ? row.content_vi : def.vi,
      content_en: row && row.content_en ? row.content_en : def.en,
      is_active: row ? !!row.is_active : true,
      show_in_footer: row ? !!row.show_in_footer : false,
      customised: !!(row && (row.content_vi || row.content_en)),
      image_url: row ? row.image_url : null,
      default_image: meta ? meta.mascot : ''
    };
    res.render('admin/page-form', {
      title: (slug ? 'Sửa trang' : 'Thêm trang') + ' - FAW Admin',
      page,
      isNew: !slug,
      error: req.query.error || null
    });
  } catch (err) {
    next(err);
  }
}

async function savePage(req, res, next) {
  try {
    await pages.ensurePagesSchema();
    const meta = pages.SYSTEM[req.params.slug];
    const isNew = !req.params.slug;
    const data = {
      title_vi: clean(req.body.titleVi, 200),
      title_en: clean(req.body.titleEn, 200) || null,
      content_vi: sanitizeHtml(req.body.contentVi) || null,
      content_en: sanitizeHtml(req.body.contentEn) || null,
      is_active: req.body.isActive === '1',
      show_in_footer: !meta && req.body.showInFooter === '1',
      updated_at: db.fn.now()
    };
    // picture: new upload > hide > back to default > keep as it was
    const existing = isNew ? null : await db('pages').where({ slug: req.params.slug }).first();
    const oldImage = existing ? existing.image_url : null;
    if (req.file) {
      data.image_url = '/images/uploads/pages/' + req.file.filename;
    } else if (req.body.imageMode === 'hide') {
      data.image_url = 'none';
    } else if (req.body.imageMode === 'default') {
      data.image_url = null;
    }
    if (data.image_url !== undefined && oldImage && oldImage !== data.image_url) removeUploaded(oldImage);
    if (!data.title_vi) {
      if (req.file) removeUploaded('/images/uploads/pages/' + req.file.filename);
      return res.redirect(req.originalUrl.split('?')[0] + '?error=' + encodeURIComponent('Vui lòng nhập tiêu đề.'));
    }

    if (isNew) {
      let slug = slugify(req.body.slug || data.title_vi);
      if (!slug || pages.SYSTEM[slug]) slug = slug ? slug + '-2' : 'trang-moi';
      while (await db('pages').where({ slug }).first()) slug += '-2';
      const max = await db('pages').max({ m: 'sort_order' }).first();
      await db('pages').insert(Object.assign(data, { slug, is_system: false, sort_order: ((max && max.m) || 0) + 1 }));
      return res.redirect('/admin/chinh-sach?saved=1');
    }

    const row = await db('pages').where({ slug: req.params.slug }).first();
    if (row) {
      await db('pages').where({ id: row.id }).update(data);
    } else if (meta) {
      await db('pages').insert(Object.assign(data, { slug: req.params.slug, is_system: true }));
    }
    res.redirect('/admin/chinh-sach?saved=1');
  } catch (err) {
    next(err);
  }
}

// Built-in pages: go back to the original text.
async function resetPage(req, res, next) {
  try {
    if (pages.SYSTEM[req.params.slug]) {
      const row = await db('pages').where({ slug: req.params.slug }).first();
      if (row) removeUploaded(row.image_url);
      await db('pages').where({ slug: req.params.slug }).del();
    }
    res.redirect('/admin/chinh-sach?saved=1');
  } catch (err) {
    next(err);
  }
}

async function deletePage(req, res, next) {
  try {
    const row = await db('pages').where({ slug: req.params.slug, is_system: false }).first();
    if (row) removeUploaded(row.image_url);
    await db('pages').where({ slug: req.params.slug, is_system: false }).del();
    res.redirect('/admin/chinh-sach');
  } catch (err) {
    next(err);
  }
}

module.exports = { listPages, showForm, savePage, resetPage, deletePage };
