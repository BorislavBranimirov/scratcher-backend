
exports.seed = async (knex) => {
  await knex('scratches').del();
  await knex('scratches').insert([
    {
      author_id: 1,
      body: 'Nunc rhoncus dui vel sem. Sed sagittis. Nam congue, risus semper porta volutpat, quam pede lobortis ligula, sit amet eleifend pede libero quis orci. Nullam molestie nibh in lectus. Pellentesque at nulla.'
    },
    {
      author_id: 2,
      parent_id: 1,
      body: 'Morbi sem mauris, laoreet ut, rhoncus aliquet, pulvinar sed, nisl. Nunc rhoncus dui vel sem. Sed sagittis.'
    },
    {
      author_id: 1,
      parent_id: 2,
      body: 'Etiam vel augue. Vestibulum rutrum rutrum neque. Aenean auctor gravida sem. Praesent id massa id nisl venenatis lacinia.'
    },
    {
      author_id: 1,
      parent_id: 1,
      body: 'Nam dui. Proin leo odio, porttitor id, consequat in, consequat ut, nulla. Sed accumsan felis. Ut at dolor quis odio consequat varius. Integer ac leo.'
    },
    {
      author_id: 3,
      rescratched_id: 4,
      body: 'Nam congue, risus semper porta volutpat, quam pede lobortis ligula, sit amet eleifend pede libero quis orci. Nullam molestie nibh in lectus.'
    }
  ]);
  await knex('users').where({ id: 1 }).update({ pinned_id: 4 });
};
