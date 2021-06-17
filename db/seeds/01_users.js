const bcrypt = require('bcryptjs');

exports.seed = async (knex) => {
  await knex('users').del();
  await knex('users').insert([
    {
      name: 'test user 1',
      username: 'testUser1',
      password: await bcrypt.hash('F8hTOnzbXRv', 12),
      description: 'Vivamus vestibulum sagittis sapien. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Etiam vel augue.'
    },
    {
      name: 'test user 2',
      username: 'testUser2',
      password: await bcrypt.hash('F8hTOnzbXRv', 12)
    },
    {
      name: 'test user 3',
      username: 'testUser3',
      password: await bcrypt.hash('F8hTOnzbXRv', 12),
      description: 'Sed sagittis. Nam congue, risus semper porta volutpat, quam pede lobortis ligula, sit amet eleifend pede libero quis orci.'
    }
  ]);
};
