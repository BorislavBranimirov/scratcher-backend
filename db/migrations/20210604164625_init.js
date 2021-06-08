
exports.up = async (knex) => {
  await knex.schema.createTable('users', (table) => {
    table.increments('id');
    table.text('username').unique().notNullable();
    table.text('password').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.text('description');
    table.integer('pinned_id');
    table.text('profile_image_url');
    table.text('profile_banner_url');
  });

  await knex.schema.createTable('scratches', (table) => {
    table.increments('id');
    table.integer('author_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('parent_id').unsigned().references('id').inTable('scratches').onDelete('CASCADE');
    table.integer('rescratched_id').unsigned().references('id').inTable('scratches').onDelete('CASCADE');
    table.text('body');
    table.text('media_url');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.alterTable('users', (table) => {
    table.foreign('pinned_id').references('id').inTable('scratches').onDelete('SET NULL');
  });

  await knex.schema.createTable('likes', (table) => {
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('scratch_id').unsigned().notNullable().references('id').inTable('scratches').onDelete('CASCADE');
    table.primary(['user_id', 'scratch_id']);
  });

  await knex.schema.createTable('follows', (table) => {
    table.integer('follower_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('followed_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.primary(['follower_id', 'followed_id']);
  });

  await knex.schema.createTable('bookmarks', (table) => {
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('scratch_id').unsigned().notNullable().references('id').inTable('scratches').onDelete('CASCADE');
    table.primary(['user_id', 'scratch_id']);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('bookmarks');
  await knex.schema.dropTable('follows');
  await knex.schema.dropTable('likes');
  await knex.schema.table('users', (table) => {
    table.dropForeign('pinned_id');
  });
  await knex.schema.dropTable('scratches');
  await knex.schema.dropTable('users');
};
