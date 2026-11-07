exports.up = async function (knex) {
  const has = await knex.schema.hasColumn('banners', 'image_mobile_url');
  if (has) return;
  await knex.schema.alterTable('banners', (table) => {
    table.string('image_mobile_url', 500).nullable();
  });
};

exports.down = async function (knex) {
  const has = await knex.schema.hasColumn('banners', 'image_mobile_url');
  if (!has) return;
  await knex.schema.alterTable('banners', (table) => {
    table.dropColumn('image_mobile_url');
  });
};
