const bcrypt = require('bcryptjs');

function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const CATEGORIES = [
  { slug: 'ao', name_vi: 'Áo', name_en: 'Tops', sort_order: 1, image_url: null },
  { slug: 'quan', name_vi: 'Quần', name_en: 'Bottoms', sort_order: 2, image_url: null },
  { slug: 'phu-kien', name_vi: 'Phụ kiện', name_en: 'Accessories', sort_order: 3, image_url: null }
];

const PRODUCTS = [
  {
    category: 'ao',
    name_vi: '"CRANKY BOY" LONG SLEEVE',
    name_en: '"CRANKY BOY" LONG SLEEVE',
    description_vi:
      '▪ Hình in \'\' CRANKY BOY \'\' lớn ở phía trước.\n▪ Phía sau in ở hông trái cụm \'\' everything is a copy of a copy... \'\'\n▪ Trên cổ tay phải thêu hình logo ngôi sao F★',
    description_en:
      '▪ Large "CRANKY BOY" print on the front.\n▪ "everything is a copy of a copy..." printed on the left hip at the back.\n▪ F★ star logo embroidered on the right cuff.',
    price: 480000,
    cover_image_url: '/images/seed/cranky-boy-long-sleeve/1.jpg',
    is_featured: true,
    variants: [
      { size: 'M', color: 'Navy', color_hex: '#31394a', stock: 8 },
      { size: 'L', color: 'Navy', color_hex: '#31394a', stock: 10 },
      { size: 'XL', color: 'Navy', color_hex: '#31394a', stock: 6 }
    ],
    images: ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg']
  },
  {
    category: 'quan',
    slug: 'faw-double-knee',
    name_vi: 'DOUBLE KNEE DENIM PANT',
    name_en: 'DOUBLE KNEE DENIM PANT',
    description_vi:
      'Quần jeans denim đen dáng rộng (baggy) phong cách carpenter/workwear, với thiết kế double-knee gia cố đầu gối, đường chỉ may tương phản trắng nổi bật, túi hammer loop và logo thêu nhỏ ở túi trước. Chất liệu denim dày dặn, bền chắc, phù hợp phong cách streetwear cá tính.',
    description_en:
      'Black baggy carpenter/workwear-style denim jeans with reinforced double-knee construction, contrast white stitching, a hammer loop pocket, and a small embroidered logo on the front pocket. Heavyweight, durable denim built for streetwear.',
    price: 700000,
    cover_image_url: '/images/seed/faw-double-knee/5.jpg',
    is_featured: true,
    variants: [
      { size: '29', color: 'Black', color_hex: '#111111', stock: 5 },
      { size: '30', color: 'Black', color_hex: '#111111', stock: 8 },
      { size: '31', color: 'Black', color_hex: '#111111', stock: 8 },
      { size: '32', color: 'Black', color_hex: '#111111', stock: 4 }
    ],
    images: ['5.jpg', '6.jpg', '1.jpg', '2.jpg', '3.jpg', '4.jpg']
  },
  {
    category: 'ao',
    name_vi: '"LOVE AGAIN" TSHIRT',
    name_en: '"LOVE AGAIN" TSHIRT',
    description_vi: '▪️LOVE\n▪️FAIL\n▪️LOVE AGAIN',
    description_en: '▪️LOVE\n▪️FAIL\n▪️LOVE AGAIN',
    price: 350000,
    cover_image_url: '/images/seed/love-again-tshirt/1.jpg',
    is_featured: false,
    variants: [
      { size: 'M', color: 'Grey', color_hex: '#6b6b63', stock: 7 },
      { size: 'L', color: 'Grey', color_hex: '#6b6b63', stock: 9 },
      { size: 'XL', color: 'Grey', color_hex: '#6b6b63', stock: 5 }
    ],
    images: ['1.jpg', '2.jpg', '3.jpg']
  },
  {
    category: 'phu-kien',
    slug: 'trucker-hat',
    name_vi: 'F★ TRUCKER HAT',
    name_en: 'F★ TRUCKER HAT',
    description_vi: 'ONE SIZE FOR ALL\n2 MÀU: CAM & ĐEN',
    description_en: 'ONE SIZE FOR ALL\n2 COLORS: ORANGE & BLACK',
    price: 380000,
    cover_image_url: '/images/seed/trucker-hat/1.jpg',
    is_featured: false,
    variants: [
      { size: 'One Size', color: 'Orange', color_hex: '#f4791d', stock: 15 },
      { size: 'One Size', color: 'Black', color_hex: '#111111', stock: 12 }
    ],
    images: ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg']
  }
];

exports.seed = async function (knex) {
  await knex('order_items').del();
  await knex('orders').del();
  await knex('product_images').del();
  await knex('product_variants').del();
  await knex('products').del();
  await knex('categories').del();
  await knex('admin_users').del();
  await knex('banners').del();
  await knex('discount_codes').del();

  const categoryIds = {};
  for (const cat of CATEGORIES) {
    const [id] = await knex('categories').insert(cat).returning('id');
    categoryIds[cat.slug] = typeof id === 'object' ? id.id : id;
  }

  for (const p of PRODUCTS) {
    const slug = p.slug || slugify(p.name_en);
    const [productId] = await knex('products')
      .insert({
        category_id: categoryIds[p.category],
        name_vi: p.name_vi,
        name_en: p.name_en,
        slug,
        description_vi: p.description_vi,
        description_en: p.description_en,
        price: p.price,
        cover_image_url: p.cover_image_url,
        is_featured: p.is_featured,
        is_active: true
      })
      .returning('id');
    const pid = typeof productId === 'object' ? productId.id : productId;

    for (const v of p.variants) {
      await knex('product_variants').insert({
        product_id: pid,
        size: v.size,
        color: v.color,
        color_hex: v.color_hex,
        stock: v.stock
      });
    }

    const folder = slug;
    let sortOrder = 0;
    for (const img of p.images) {
      await knex('product_images').insert({
        product_id: pid,
        image_url: `/images/seed/${folder}/${img}`,
        sort_order: sortOrder++
      });
    }
  }

  await knex('banners').insert([
    {
      image_url: '/images/seed/homepage/hero.png',
      link_url: '/shop',
      type: 'hero',
      title_vi: 'FROM ANOTHER WORLD',
      title_en: 'FROM ANOTHER WORLD',
      sort_order: 1,
      is_active: true
    },
    {
      image_url: '/images/seed/homepage/banner-san-pham.png',
      link_url: '/shop',
      type: 'featured',
      title_vi: null,
      title_en: null,
      sort_order: 1,
      is_active: true
    }
  ]);

  const passwordHash = bcrypt.hashSync(process.env.ADMIN_DEFAULT_PASSWORD || 'ForAWhile@2026', 10);
  await knex('admin_users').insert({
    username: process.env.ADMIN_DEFAULT_USERNAME || 'admin',
    password_hash: passwordHash
  });
};
