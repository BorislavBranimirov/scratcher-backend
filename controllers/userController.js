const db = require('../db/db');
const bcrypt = require('bcryptjs');
const userUtils = require('../utils/userUtils');

exports.getUserByUsername = async (req, res) => {
  try {
    const user = await db('users')
      .select('id', 'username', 'created_at', 'description', 'pinned_id', 'profile_image_url', 'profile_banner_url')
      .where({ username: req.params.username })
      .first();
    if (!user) {
      return res.status(404).json({ err: 'User not found' });
    }

    return res.json(user);
  } catch (err) {
    return res.status(500).json({ err: 'An error occured while searching for user' });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await db('users')
      .select('id', 'username', 'created_at', 'description', 'pinned_id', 'profile_image_url', 'profile_banner_url')
      .where({ id: parseInt(req.params.id, 10) })
      .first();
    if (!user) {
      return res.status(404).json({ err: 'User not found' });
    }

    return res.json(user);
  } catch (err) {
    return res.status(500).json({ err: 'An error occured while searching for user' });
  }
};

exports.createUser = async (req, res) => {
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({ err: 'No username or password provided' });
  }

  if (!userUtils.usernamePatternTest(req.body.username)) {
    return res.status(400).json({ err: 'Invalid username' });
  }

  if (!userUtils.passwordPatternTest(req.body.password)) {
    return res.status(400).json({ err: 'Invalid password' });
  }

  try {
    const userExists = await db('users')
      .select('id')
      .where({ username: req.body.username })
      .first();
    if (userExists) {
      return res.status(400).json({ err: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 12);
    const [user] = await db('users')
      .insert({
        username: req.body.username,
        password: hashedPassword
      })
      .returning(['id', 'username']);

    return res.status(201).json({
      success: true,
      ...user
    });
  } catch (err) {
    return res.status(500).json({ err: 'An error occurred while creating user' });
  }
};

exports.deleteUserById = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (id !== res.locals.user.id) {
    return res.status(401).json({ err: 'Unauthorized to delete user' });
  }

  try {
    const [user] = await db('users')
      .where({ id })
      .del()
      .returning(['id', 'username']);
    if (!user) {
      return res.status(404).json({ err: 'User not found' });
    }

    return res.json({
      success: true,
      ...user
    });
  } catch (err) {
    return res.status(500).json({ err: 'An error occurred while deleting user' });
  }
};

exports.getFollowersById = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const followers = await db('follows')
      .select('follower_id', 'username', 'description', 'profile_image_url')
      .join('users', 'follower_id', '=', 'id')
      .where({ followed_id: id });

    return res.json(followers);
  } catch (err) {
    return res.status(500).json({ err: 'An error occurred while searching for followers' });
  }
};

exports.getFollowedById = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const followed = await db('follows')
      .select('followed_id', 'username', 'description', 'profile_image_url')
      .join('users', 'followed_id', '=', 'id')
      .where({ follower_id: id });

    return res.json(followed);
  } catch (err) {
    return res.status(500).json({ err: 'An error occurred while searching for followed users' });
  }
};

exports.followUserById = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (id === res.locals.user.id) {
    return res.status(400).json({ err: 'A user cannot follow themselves' });
  }

  try {
    const userExists = await db('users')
      .select('id')
      .where({ id })
      .first();
    if (!userExists) {
      return res.status(400).json({ err: 'User does not exist' });
    }

    const alreadyFollowed = await db('follows')
      .select('*')
      .where({
        follower_id: res.locals.user.id,
        followed_id: id
      })
      .first();
    if (alreadyFollowed) {
      return res.status(400).json({ err: 'User is already followed' });
    }

    const [follow] = await db('follows')
      .insert({
        follower_id: res.locals.user.id,
        followed_id: id
      })
      .returning(['follower_id', 'followed_id']);

    return res.status(201).json({
      success: true,
      ...follow
    });
  } catch (err) {
    return res.status(500).json({ err: 'An error occurred while trying to follow user' });
  }
};

exports.unfollowUserById = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const userExists = await db('users')
      .select('id')
      .where({ id })
      .first();
    if (!userExists) {
      return res.status(400).json({ err: 'User does not exist' });
    }

    const [unfollow] = await db('follows')
      .where({
        follower_id: res.locals.user.id,
        followed_id: id
      })
      .del()
      .returning(['follower_id', 'followed_id']);
    if (!unfollow) {
      return res.status(400).json({ err: 'User already unfollowed' });
    }

    return res.json({
      success: true,
      ...unfollow
    });
  } catch (err) {
    return res.status(500).json({ err: 'An error occurred while trying to unfollow user' });
  }
};

exports.pinScratch = async (req, res) => {
  if (!req.body.scratchId) {
    return res.status(400).json({ err: 'No scratch id provided' });
  }

  const userId = parseInt(req.params.userId, 10);
  const scratchId = parseInt(req.body.scratchId, 10);

  if (userId !== res.locals.user.id) {
    return res.status(401).json({ err: 'Unauthorized to pin scratch' });
  }

  try {
    const scratch = await db('scratches')
      .select(['id', 'author_id'])
      .where({ id: scratchId })
      .first();
    if (!scratch) {
      return res.status(404).json({ err: 'Scratch not found' });
    }
    if (scratch.author_id !== userId) {
      return res.status(401).json({ err: 'Unauthorized to pin scratch' });
    }

    const [user] = await db('users')
      .where({ id: userId })
      .update({ pinned_id: scratchId })
      .returning(['id', 'pinned_id']);

    return res.json({
      success: true
    });
  } catch (err) {
    return res.status(500).json({ err: 'An error occurred while pinning scratch' });
  }
};

exports.unpinScratch = async (req, res) => {
  if (!req.body.scratchId) {
    return res.status(400).json({ err: 'No scratch id provided' });
  }

  const userId = parseInt(req.params.userId, 10);
  const scratchId = parseInt(req.body.scratchId, 10);

  if (userId !== res.locals.user.id) {
    return res.status(401).json({ err: 'Unauthorized to unpin scratch' });
  }

  try {
    const userOld = await db('users')
      .select(['id', 'pinned_id'])
      .where({ id: userId })
      .first();
    if (userOld.pinned_id !== scratchId) {
      return res.status(400).json({ err: 'Scratch is not pinned' });
    }

    const [user] = await db('users')
      .where({ id: userId })
      .update({ pinned_id: null })
      .returning(['id', 'pinned_id']);

    return res.json({
      success: true
    });
  } catch (err) {
    return res.status(500).json({ err: 'An error occurred while unpinning scratch' });
  }
};

exports.getBookmarksByUserId = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (id !== res.locals.user.id) {
    return res.status(401).json({ err: 'Unauthorized to view user\'s bookmarks' });
  }

  try {
    const bookmarks = await db('bookmarks')
      .select('scratches.*')
      .join('scratches', 'scratch_id', 'id')
      .where({ user_id: id });

    return res.json(bookmarks);
  } catch (err) {
    return res.status(500).json({ err: 'An error occurred while searching for bookmarks' });
  }
};

exports.getLikesByUserId = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const likes = await db('likes')
      .select('scratches.*')
      .join('scratches', 'scratch_id', 'id')
      .where({ user_id: id });

    return res.json(likes);
  } catch (err) {
    return res.status(500).json({ err: 'An error occurred while searching for likes' });
  }
};