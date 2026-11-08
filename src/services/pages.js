const fs = require('fs');
const path = require('path');
const db = require('../db');

const SYSTEM = {
  'shipping-policy': { view: 'shipping-policy', titleVi: 'Chính sách vận chuyển', titleEn: 'Shipping Policy', mascot: '/images/brand/mascot-shipping.png', layout: 'policy' },
  'return-policy': { view: 'return-policy', titleVi: 'Chính sách đổi trả', titleEn: 'Return Policy', mascot: '/images/brand/mascot-return.png', layout: 'policy' },
  about: { view: 'about', titleVi: 'Về chúng tôi', titleEn: 'About us', mascot: '', layout: 'about' }
};

let ready = null;
function ensurePagesSchema() {
  if (!ready) {
    ready = db.schema.hasTable('pages').then((has) => {
      if (has) {
        return db.schema.hasColumn('pages', 'image_url').then((h) => {
          if (h) return null;
          return db.schema.alterTable('pages', (t) => { t.string('image_url', 500).nullable(); });
        });
      }
      return db.schema.createTable('pages', (t) => {
        t.increments('id');
        t.string('slug', 100).notNullable().unique();
        t.string('title_vi', 200).notNullable();
        t.string('title_en', 200).nullable();
        t.text('content_vi', 'longtext').nullable();
        t.text('content_en', 'longtext').nullable();
        t.string('image_url', 500).nullable(); // null = default image, 'none' = hidden
        t.boolean('is_system').notNullable().defaultTo(false);
        t.boolean('is_active').notNullable().defaultTo(true);
        t.boolean('show_in_footer').notNullable().defaultTo(false);
        t.integer('sort_order').notNullable().defaultTo(0);
        t.timestamp('updated_at').defaultTo(db.fn.now());
      });
    }).catch((err) => { ready = null; throw err; });
  }
  return ready;
}

async function getPage(slug) {
  await ensurePagesSchema();
  return db('pages').where({ slug }).first();
}

const VIEWS_DIR = path.join(__dirname, '..', '..', 'views');

// The text that is hard-coded in the built-in views, as editable HTML.
function defaultContent(slug) {
  const meta = SYSTEM[slug];
  if (!meta) return { vi: '', en: '' };
  let src = '';
  try { src = fs.readFileSync(path.join(VIEWS_DIR, meta.view + '.ejs'), 'utf8'); } catch (e) { return { vi: '', en: '' }; }
  const a = src.indexOf("<% if (locale === 'en') { %>");
  const b = src.indexOf('<% } else { %>', a);
  const c = src.indexOf('<% } %>', b);
  if (a < 0 || b < 0 || c < 0) return { vi: '', en: '' };
  let en = src.slice(a + "<% if (locale === 'en') { %>".length, b).trim();
  let vi = src.slice(b + '<% } else { %>'.length, c).trim();
  if (slug === 'about') {
    const toHtml = (t) => t.split(/\n\s*\n/).map((x) => '<p>' + x.trim().replace(/\n/g, '<br />') + '</p>').join('\n');
    const big = '<p class="about-big">A kid with passion<br />A dude know how to draw<br />A guy got work to do</p>';
    en = '<h1 class="about-title">FROM ANOTHER WORLD</h1>\n' + toHtml(en) + '\n' + big;
    vi = '<h1 class="about-title">FROM ANOTHER WORLD</h1>\n' + toHtml(vi) + '\n' + big;
  }
  return { vi, en };
}

async function footerPages(locale) {
  try {
    await ensurePagesSchema();
    const rows = await db('pages').where({ is_system: false, is_active: true, show_in_footer: true }).orderBy('sort_order').orderBy('id');
    return rows.map((r) => ({ slug: r.slug, title: (locale === 'en' && r.title_en) || r.title_vi }));
  } catch (e) {
    return [];
  }
}

module.exports = { SYSTEM, ensurePagesSchema, getPage, defaultContent, footerPages };
