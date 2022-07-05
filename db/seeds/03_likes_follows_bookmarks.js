
exports.seed = async (knex) => {
  await knex('likes').del();
  await knex('follows').del();
  await knex('bookmarks').del();

  await knex('likes').insert([
    {
      user_id: 1,
      scratch_id: 2
    },
    {
      user_id: 1,
      scratch_id: 3
    },
    {
      user_id: 2,
      scratch_id: 1
    },
    {
      user_id: 3,
      scratch_id: 4
    }
  ]);

  await knex('follows').insert([
    {
      follower_id: 1,
      followed_id: 2
    },
    {
      follower_id: 1,
      followed_id: 4
    },
    {
      follower_id: 4,
      followed_id: 1
    },
    {
      follower_id: 3,
      followed_id: 1
    }
  ]);

  await knex('bookmarks').insert([
    {
      user_id: 1,
      scratch_id: 2
    },
    {
      user_id: 1,
      scratch_id: 3
    },
    {
      user_id: 2,
      scratch_id: 1
    },
    {
      user_id: 3,
      scratch_id: 4
    }
  ]);
};
