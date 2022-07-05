const db = require('../db/db');
const bcrypt = require('bcryptjs');
const { userUtils, scratchUtils, errorUtils } = require('../utils');

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
        name: req.body.username,
        username: req.body.username,
        password: hashedPassword
      })
      .returning(['id', 'username']);

    return res.status(201).json({
      success: true,
      ...user
    });
  } catch (err) {
    return errorUtils.tryCatchError(res, err, 'An error occurred while creating user');
  }
};

exports.getHomeTimeline = async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;

  // scratch id, after which to give results
  const after = parseInt(req.query.after, 10);

  try {
    // get the ids of each user being followed by the logged-in user
    const followedUserIds = (await db('follows')
      .select('*')
      .where({ followerId: res.locals.user.id }))
      .map(row => row.followedId);

    // get an extra record to check if there are any records left after the current search
    let scratches = await db('scratches')
      .select('*')
      .whereIn('authorId', [res.locals.user.id, ...followedUserIds])
      .modify((builder) => {
        // if after has been specified, add an additional where clause
        if (after) {
          builder.where('id', '<', after)
        }
      })
      .orderBy('id', 'desc')
      .limit(limit + 1);

    let isFinished = false;
    if (scratches.length > limit) {
      scratches.pop();
    } else {
      isFinished = true;
    }

    for (const scratch of scratches) {
      Object.assign(
        scratch,
        await scratchUtils.getAdditionalScratchData(scratch, res.locals.user.id)
      );
    }

    const extraScratches = await scratchUtils.getExtraScratches(scratches, res.locals.user.id);

    return res.json({ scratches, isFinished, extraScratches });
  } catch (err) {
    return errorUtils.tryCatchError(res, err, 'An error occurred while getting home timeline');
  }
};

exports.searchUsers = async (req, res) => {
  const searchPattern = (req.query.query) ? `%${req.query.query}%` : '%';
  const limit = parseInt(req.query.limit, 10) || 50;

  // username, after which to give results
  const after = (req.query.after) || '';

  try {
    // get an extra record to check if there are any records left after the current search
    let users = await db('users')
      .select('id', 'name', 'username', 'createdAt', 'description',
        'pinnedId', 'profileImageUrl', 'profileBannerUrl')
      .where('username', 'ilike', searchPattern)
      .andWhere('username', '>', after)
      .orderBy('username')
      .limit(limit + 1);

    let isFinished = false;
    if (users.length > limit) {
      users.pop();
    } else {
      isFinished = true;
    }

    for (const user of users) {
      Object.assign(
        user,
        await userUtils.getFollowData(user.id, res.locals.user?.id)
      );
    }

    return res.json({ users, isFinished });
  } catch (err) {
    return errorUtils.tryCatchError(res, err, 'An error occured while searching for users');
  }
};

exports.getSuggestedUsers = async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 3;

  try {
    if (!res.locals.user) {
      const suggestedUsers = await db('users')
        .select('id', 'name', 'username', 'createdAt', 'description',
          'pinnedId', 'profileImageUrl', 'profileBannerUrl')
        .limit(limit);

      for (const user of suggestedUsers) {
        Object.assign(
          user,
          await userUtils.getFollowData(user.id)
        );
      }

      return res.json(suggestedUsers);
    }

    // get the ids of each user being followed by the logged-in user
    const followedUserIds = (await db('follows')
      .select('*')
      .where({ followerId: res.locals.user.id }))
      .map(row => row.followedId);

    // get the users followed by whoever the logged-in user follows
    let suggestedUsers = await db('follows')
      .select('id', 'name', 'username', 'createdAt', 'description',
        'pinnedId', 'profileImageUrl', 'profileBannerUrl')
      .join('users', 'followedId', 'id')
      .whereIn('followerId', followedUserIds)
      .whereNotIn('followedId', [res.locals.user.id, ...followedUserIds])
      .limit(limit);

    // if not enough results were found, suggest additional users
    if (suggestedUsers.length < limit) {
      const newLimit = limit - suggestedUsers.length;
      const currentSuggestedIds = suggestedUsers.map(user => user.id);

      // use the default suggestion search, excluding the logged-in user and any already found users
      suggestedUsers = suggestedUsers.concat(await db('users')
        .select('id', 'name', 'username', 'createdAt', 'description',
          'pinnedId', 'profileImageUrl', 'profileBannerUrl')
        .whereNotIn('id', [res.locals.user.id, ...followedUserIds, ...currentSuggestedIds])
        .limit(newLimit));
    }

    for (const user of suggestedUsers) {
      Object.assign(
        user,
        await userUtils.getFollowData(user.id, res.locals.user.id)
      );
    }

    return res.json(suggestedUsers);
  } catch (err) {
    return errorUtils.tryCatchError(res, err, 'An error occured while collecting suggested users');
  }
};

exports.getUserByUsername = async (req, res) => {
  try {
    const user = await db('users')
      .select('id', 'name', 'username', 'createdAt', 'description',
        'pinnedId', 'profileImageUrl', 'profileBannerUrl')
      .where({ username: req.params.username })
      .first();
    if (!user) {
      return res.status(404).json({ err: 'User not found' });
    }

    Object.assign(
      user,
      await userUtils.getFollowData(user.id, res.locals.user?.id)
    );

    return res.json(user);
  } catch (err) {
    return errorUtils.tryCatchError(res, err, 'An error occured while searching for user');
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await db('users')
      .select('id', 'name', 'username', 'createdAt', 'description',
        'pinnedId', 'profileImageUrl', 'profileBannerUrl')
      .where({ id: parseInt(req.params.id, 10) })
      .first();
    if (!user) {
      return res.status(404).json({ err: 'User not found' });
    }

    Object.assign(
      user,
      await userUtils.getFollowData(user.id, res.locals.user?.id)
    );

    return res.json(user);
  } catch (err) {
    return errorUtils.tryCatchError(res, err, 'An error occured while searching for user');
  }
};

exports.changeUserById = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (id !== res.locals.user.id) {
    return res.status(401).json({ err: 'Unauthorized to change user' });
  }

  if (
    (req.body.name === undefined || req.body.name === null) ||
    (req.body.description === undefined || req.body.description === null)
  ) {
    return res.status(400).json({ err: 'Data not provided' });
  }

  if (req.body.name.length === 0) {
    return res.status(400).json({ err: 'Name cannot be blank' });
  }

  const nameLimit = 50;
  if (req.body.name.length > nameLimit) {
    return res.status(400).json({ err: `Name is limited to ${nameLimit} characters` });
  }

  const descriptionLimit = 160;
  if (req.body.description.length > descriptionLimit) {
    return res.status(400).json({ err: `Description is limited to ${descriptionLimit} characters` });
  }

  try {
    const [user] = await db('users')
      .where({ id })
      .update({
        name: req.body.name,
        description: req.body.description
      })
      .returning(['id', 'username']);

    return res.json({
      success: true,
      ...user
    });
  } catch (err) {
    return errorUtils.tryCatchError(res, err, 'An error occurred while updating user');
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
    return errorUtils.tryCatchError(res, err, 'An error occurred while deleting user');
  }
};

exports.changePassword = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (id !== res.locals.user.id) {
    return res.status(401).json({ err: 'Unauthorized to change user\'s password' });
  }

  if (
    !req.body.currentPassword ||
    !req.body.password ||
    !req.body.confirmPassword
  ) {
    return res.status(400).json({ err: 'Data not provided' });
  }

  if (req.body.password !== req.body.confirmPassword) {
    return res.status(400).json({ err: 'Passwords do not match' });
  }

  if (!userUtils.passwordPatternTest(req.body.password)) {
    return res.status(400).json({ err: 'Invalid password' });
  }

  try {
    const userOld = await db('users')
      .select('id', 'password')
      .where({ id })
      .first();
    if (!userOld) {
      return res.status(404).json({ err: 'User not found' });
    }

    const isMatch = await bcrypt.compare(req.body.currentPassword, userOld.password);
    if (!isMatch) {
      return res.status(400).json({ err: 'Password does not match your current password' });
    }

    if (req.body.currentPassword === req.body.password) {
      return res.status(400).json({ err: 'New password cannot be the same as your current one' });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 12);
    const [user] = await db('users')
      .where({ id })
      .update({
        password: hashedPassword,
      })
      .returning(['id', 'username']);

    return res.json({
      success: true,
      ...user
    });
  } catch (err) {
    return errorUtils.tryCatchError(
      res,
      err,
      'An error occurred while updating user\'s password'
    );
  }
};

exports.getUserTimeline = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const limit = parseInt(req.query.limit, 10) || 50;

  // scratch id, after which to give results
  const after = parseInt(req.query.after, 10);

  try {
    // get an extra record to check if there are any records left after the current search
    let scratches = await db('scratches')
      .select('*')
      .where({ authorId: id })
      .modify((builder) => {
        // if after has been specified, add an additional where clause
        if (after) {
          builder.where('id', '<', after)
        }
      })
      .orderBy('id', 'desc')
      .limit(limit + 1);

    let isFinished = false;
    if (scratches.length > limit) {
      scratches.pop();
    } else {
      isFinished = true;
    }

    for (const scratch of scratches) {
      Object.assign(
        scratch,
        await scratchUtils.getAdditionalScratchData(scratch, res.locals.user?.id)
      );
    }

    const extraScratches = await scratchUtils.getExtraScratches(scratches, res.locals.user?.id);

    return res.json({ scratches, isFinished, extraScratches });
  } catch (err) {
    return errorUtils.tryCatchError(res, err, 'An error occurred while getting user\'s timeline');
  }
};

exports.getFollowersById = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const limit = parseInt(req.query.limit, 10) || 50;

  // follower id, after which to give results
  const after = parseInt(req.query.after, 10);

  try {
    // get an extra record to check if there are any records left after the current search
    const followers = await db('follows')
      .select('id', 'name', 'username', 'createdAt', 'description',
        'pinnedId', 'profileImageUrl', 'profileBannerUrl')
      .join('users', 'followerId', 'id')
      .where({ followedId: id })
      .modify((builder) => {
        // if after has been specified, add an additional where clause
        if (after) {
          builder.where('followerId', '<', after)
        }
      })
      .orderBy('followerId', 'desc')
      .limit(limit + 1);

    let isFinished = false;
    if (followers.length > limit) {
      followers.pop();
    } else {
      isFinished = true;
    }

    for (const follower of followers) {
      Object.assign(
        follower,
        await userUtils.getFollowData(follower.id, res.locals.user.id)
      );
    }

    return res.json({ users: followers, isFinished });
  } catch (err) {
    return errorUtils.tryCatchError(res, err, 'An error occurred while searching for followers');
  }
};

exports.getFollowedById = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const limit = parseInt(req.query.limit, 10) || 50;

  // followed id, after which to give results
  const after = parseInt(req.query.after, 10);

  try {
    // get an extra record to check if there are any records left after the current search
    const followed = await db('follows')
      .select('id', 'name', 'username', 'createdAt', 'description',
        'pinnedId', 'profileImageUrl', 'profileBannerUrl')
      .join('users', 'followedId', 'id')
      .where({ followerId: id })
      .modify((builder) => {
        // if after has been specified, add an additional where clause
        if (after) {
          builder.where('followedId', '<', after)
        }
      })
      .orderBy('followedId', 'desc')
      .limit(limit + 1);

    let isFinished = false;
    if (followed.length > limit) {
      followed.pop();
    } else {
      isFinished = true;
    }

    for (const follower of followed) {
      Object.assign(
        follower,
        await userUtils.getFollowData(follower.id, res.locals.user.id)
      );
    }

    return res.json({ users: followed, isFinished });
  } catch (err) {
    return errorUtils.tryCatchError(res, err, 'An error occurred while searching for followed users');
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
        followerId: res.locals.user.id,
        followedId: id
      })
      .first();
    if (alreadyFollowed) {
      return res.status(400).json({ err: 'User is already followed' });
    }

    const [follow] = await db('follows')
      .insert({
        followerId: res.locals.user.id,
        followedId: id
      })
      .returning(['followerId', 'followedId']);

    return res.status(201).json({
      success: true,
      ...follow
    });
  } catch (err) {
    return errorUtils.tryCatchError(res, err, 'An error occurred while trying to follow user');
  }
};

exports.unfollowUserById = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const alreadyFollowed = await db('follows')
      .select('*')
      .where({
        followerId: res.locals.user.id,
        followedId: id
      })
      .first();
    if (!alreadyFollowed) {
      return res.status(400).json({ err: 'User is not followed' });
    }

    const [unfollow] = await db('follows')
      .where({
        followerId: res.locals.user.id,
        followedId: id
      })
      .del()
      .returning(['followerId', 'followedId']);
    if (!unfollow) {
      return res.status(400).json({ err: 'User already unfollowed' });
    }

    return res.json({
      success: true,
      ...unfollow
    });
  } catch (err) {
    return errorUtils.tryCatchError(res, err, 'An error occurred while trying to unfollow user');
  }
};

exports.getBookmarksByUserId = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const limit = parseInt(req.query.limit, 10) || 50;

  // scratch id, after which to give results
  const after = parseInt(req.query.after, 10);

  if (id !== res.locals.user.id) {
    return res.status(401).json({ err: 'Unauthorized to view user\'s bookmarks' });
  }

  try {
    // get an extra record to check if there are any records left after the current search
    const bookmarks = await db('bookmarks')
      .select('scratches.*')
      .join('scratches', 'scratchId', 'id')
      .where({ userId: id })
      .modify((builder) => {
        // if after has been specified, add an additional where clause
        if (after) {
          builder.where('scratchId', '<', after)
        }
      })
      .orderBy('scratchId', 'desc')
      .limit(limit + 1);

    let isFinished = false;
    if (bookmarks.length > limit) {
      bookmarks.pop();
    } else {
      isFinished = true;
    }

    for (const bookmark of bookmarks) {
      Object.assign(
        bookmark,
        await scratchUtils.getAdditionalScratchData(bookmark, res.locals.user.id)
      );
    }

    const extraScratches = await scratchUtils.getExtraScratches(bookmarks, res.locals.user.id);

    return res.json({ scratches: bookmarks, isFinished, extraScratches });
  } catch (err) {
    return errorUtils.tryCatchError(res, err, 'An error occurred while searching for bookmarks');
  }
};

exports.getMediaScratchesByUserId = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const limit = parseInt(req.query.limit, 10) || 50;

  // scratch id, after which to give results
  const after = parseInt(req.query.after, 10);

  try {
    // get an extra record to check if there are any records left after the current search
    let scratches = await db('scratches')
      .select('*')
      .where({ authorId: id })
      .whereNotNull('mediaUrl')
      .modify((builder) => {
        // if after has been specified, add an additional where clause
        if (after) {
          builder.where('id', '<', after)
        }
      })
      .orderBy('id', 'desc')
      .limit(limit + 1);

    let isFinished = false;
    if (scratches.length > limit) {
      scratches.pop();
    } else {
      isFinished = true;
    }

    for (const scratch of scratches) {
      Object.assign(
        scratch,
        await scratchUtils.getAdditionalScratchData(scratch, res.locals.user?.id)
      );
    }

    const extraScratches = await scratchUtils.getExtraScratches(scratches, res.locals.user?.id);

    return res.json({ scratches, isFinished, extraScratches });
  } catch (err) {
    return errorUtils.tryCatchError(res, err, 'An error occurred while searching for media scratches');
  }
};

exports.getLikesByUserId = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const limit = parseInt(req.query.limit, 10) || 50;

  // scratch id, after which to give results
  const after = parseInt(req.query.after, 10);

  try {
    // get an extra record to check if there are any records left after the current search
    const likes = await db('likes')
      .select('scratches.*')
      .join('scratches', 'scratchId', 'id')
      .where({ userId: id })
      .modify((builder) => {
        // if after has been specified, add an additional where clause
        if (after) {
          builder.where('scratchId', '<', after)
        }
      })
      .orderBy('scratchId', 'desc')
      .limit(limit + 1);

    let isFinished = false;
    if (likes.length > limit) {
      likes.pop();
    } else {
      isFinished = true;
    }

    for (const like of likes) {
      Object.assign(
        like,
        await scratchUtils.getAdditionalScratchData(like, res.locals.user.id)
      );
    }

    const extraScratches = await scratchUtils.getExtraScratches(likes, res.locals.user.id);

    return res.json({ scratches: likes, isFinished, extraScratches });
  } catch (err) {
    return errorUtils.tryCatchError(res, err, 'An error occurred while searching for likes');
  }
};