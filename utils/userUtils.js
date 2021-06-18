const db = require('../db/db');

module.exports.usernamePatternTest = (username) => {
  const usernamePattern = /^[a-zA-Z0-9]{6,25}$/;
  return usernamePattern.test(username);
};

module.exports.passwordPatternTest = (password) => {
  const passwordPattern = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,72}$/;
  return passwordPattern.test(password);
};

exports.getFollowData = async (id, loggedUserId) => {
  const obj = {
    followerCount: '0',
    followedCount: '0',
    isFollowing: false
  };

  obj.followerCount = (await db('follows')
    .count('*')
    .where({ followedId: id }))[0].count;

  obj.followedCount = (await db('follows')
    .count('*')
    .where({ followerId: id }))[0].count;

  if (loggedUserId) {
    const follow = await db('follows')
      .select('*')
      .where({
        followerId: loggedUserId,
        followedId: id
      })
      .first();

    if (follow) {
      obj.isFollowing = true;
    }
  }

  return obj;
};