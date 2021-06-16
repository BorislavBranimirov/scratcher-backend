const db = require('../db/db');
const scratchUtils = require('../utils/scratchUtils');
const errorUtils = require('../utils/errorUtils');

exports.getScratchById = async (req, res) => {
  try {
    const scratch = await db('scratches')
      .select('*')
      .where({ id: parseInt(req.params.id, 10) })
      .first();
    if (!scratch) {
      return res.status(404).json({ err: 'Scratch not found' });
    }

    Object.assign(
      scratch,
      await scratchUtils.getAdditionalScratchData(scratch, res.locals.user?.id)
    );

    return res.json(scratch);
  } catch (err) {
    return errorUtils.tryCatchError(res, err, 'An error occured while searching for scratch');
  }
};

exports.searchScratches = async (req, res) => {
  const searchPattern = (req.query.query) ? `%${req.query.query}%` : '%';
  const limit = parseInt(req.query.limit, 10) || 50;

  // scratch id, after which to give results
  const after = parseInt(req.query.after, 10);

  try {
    // get an extra record to check if there are any records left after the current search
    let scratches = await db('scratches')
      .select('*')
      .where('body', 'ilike', searchPattern)
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

    return res.json({ scratches, isFinished });
  } catch (err) {
    return errorUtils.tryCatchError(res, err, 'An error occured while searching for scratches');
  }
};

exports.createScratch = async (req, res) => {
  let { body, parentId, rescratchedId, mediaUrl } = req.body;

  try {
    if (body) {
      if (typeof body !== 'string') {
        return res.status(400).json({ err: 'Invalid body' });
      }
      body = body.trim();
      const scratchLimit = 280;
      if (body.length > scratchLimit) {
        return res.status(400).json({ err: `Scratch body is limited to ${scratchLimit} characters` });
      }
    }

    // a scratch has to contain text, id of a shared scratch or url to a media resource
    if (!body && !rescratchedId && !mediaUrl) {
      return res.status(400).json({ err: 'No data provided' });
    }

    if (parentId) {
      parentId = parseInt(parentId, 10);
      const parentScratch = await db('scratches')
        .select('id')
        .where({ id: parentId })
        .first();
      if (!parentScratch) {
        return res.status(404).json({ err: 'Parent scratch not found' });
      }
    }

    if (rescratchedId) {
      rescratchedId = parseInt(rescratchedId, 10);
      const userRescratches = await db('scratches')
        .select('*')
        .where({
          authorId: res.locals.user.id,
          rescratchedId: rescratchedId
        });
      // a user can share a scratch any number of times
      // however, a direct share (with no text body or media) can only be posted once
      for (const userRescratch of userRescratches) {
        if (!userRescratch.body && !userRescratch.mediaUrl) {
          return res.status(400).json({ err: 'Scratch has already been direct shared' });
        }
      }

      const scratchToShare = await db('scratches')
        .select('id')
        .where({ id: rescratchedId })
        .first();
      if (!scratchToShare) {
        return res.status(404).json({ err: 'Scratch being shared not found' });
      }
      if (!scratchToShare.body && !scratchToShare.mediaUrl) {
        return res.status(400).json({ err: 'Scratch being shared needs to have text or media' });
      }
    }

    // TODO: implement mediaUrl in controller
    /*
    if (mediaUrl) {
    }
    */

    const [scratch] = await db('scratches')
      .insert({
        authorId: res.locals.user.id,
        rescratchedId,
        parentId,
        body,
        mediaUrl
      })
      .returning(['id', 'authorId']);

    return res.status(201).json({
      success: true,
      ...scratch
    });
  } catch (err) {
    return errorUtils.tryCatchError(res, err, 'An error occured while creating scratch');
  }
};

exports.deleteScratchById = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const scratchOld = await db('scratches')
      .select('*')
      .where({ id })
      .first();
    if (!scratchOld) {
      return res.status(404).json({ err: 'Scratch not found' });
    }
    if (scratchOld.authorId !== res.locals.user.id) {
      return res.status(401).json({ err: 'Unauthorized to delete scratch' });
    }

    const [scratch] = await db('scratches')
      .where({ id })
      .del()
      .returning(['id', 'authorId']);

    return res.json({
      success: true,
      ...scratch
    });
  } catch (err) {
    return errorUtils.tryCatchError(res, err, 'An error occured while deleting scratch');
  }
};

/**
 * Used to get a scratch, its parent chain, and all direct replies
 */
exports.getScratchConversationById = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const obj = {
      parentChain: [],
      scratch: null,
      replies: []
    };

    obj.scratch = await db('scratches')
      .select('*')
      .where({ id })
      .first();
    if (!obj.scratch) {
      return res.status(404).json({ err: 'Scratch not found' });
    }
    Object.assign(
      obj.scratch,
      await scratchUtils.getAdditionalScratchData(obj.scratch, res.locals.user?.id)
    );

    let parentId = obj.scratch.parentId;
    while (parentId) {
      const parent = await db('scratches')
        .select('*')
        .where({ id: parentId })
        .first();

      Object.assign(
        parent,
        await scratchUtils.getAdditionalScratchData(parent, res.locals.user?.id)
      );

      obj.parentChain.unshift(parent);
      parentId = parent.parentId;
    }

    obj.replies = await db('scratches')
      .select('*')
      .where({ parentId: id });
    for (const reply of obj.replies) {
      Object.assign(
        reply,
        await scratchUtils.getAdditionalScratchData(reply, res.locals.user?.id)
      );
    }

    return res.json(obj);
  } catch (err) {
    return errorUtils.tryCatchError(res, err, 'An error occured while searching for scratch conversation');
  }
};

exports.getUsersRescratchedByScratchId = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const users = await db('scratches')
      .select('users.id', 'name', 'username', 'description', 'profileImageUrl')
      .join('users', 'authorId', 'users.id')
      .where({ rescratchedId: id });

    for (const user of users) {
      const follow = await db('follows')
        .select('*')
        .where({
          followerId: res.locals.user.id,
          followedId: user.id
        })
        .first();

      user.isFollowing = (follow) ? true : false;
    }

    return res.json(users);
  } catch (err) {
    return errorUtils.tryCatchError(res, err, 'An error occurred while searching for users who shared the scratch');
  }
};

exports.pinScratch = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const scratch = await db('scratches')
      .select(['id', 'authorId'])
      .where({ id })
      .first();
    if (!scratch) {
      return res.status(404).json({ err: 'Scratch not found' });
    }
    if (scratch.authorId !== res.locals.user.id) {
      return res.status(401).json({ err: 'Scratches can only be pinned by their author' });
    }

    const userOld = await db('users')
      .select(['id', 'pinnedId'])
      .where({ id: res.locals.user.id })
      .first();
    if (userOld.pinnedId === id) {
      return res.status(400).json({ err: 'Scratch is already pinned' });
    }

    const [user] = await db('users')
      .where({ id: res.locals.user.id })
      .update({ pinnedId: id })
      .returning(['id', 'pinnedId']);

    return res.json({
      success: true,
      ...user
    });
  } catch (err) {
    return errorUtils.tryCatchError(res, err, 'An error occurred while pinning scratch');
  }
};

exports.unpinScratch = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const userOld = await db('users')
      .select(['id', 'pinnedId'])
      .where({ id: res.locals.user.id })
      .first();
    if (userOld.pinnedId !== id) {
      return res.status(400).json({ err: 'Scratch is not pinned' });
    }

    const [user] = await db('users')
      .where({ id: res.locals.user.id })
      .update({ pinnedId: null })
      .returning(['id']);

    return res.json({
      success: true,
      ...user,
      pinnedId: id
    });
  } catch (err) {
    return errorUtils.tryCatchError(res, err, 'An error occurred while unpinning scratch');
  }
};

exports.bookmarkScratchById = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const scratch = await db('scratches')
      .select('id')
      .where({ id })
      .first();
    if (!scratch) {
      return res.status(404).json({ err: 'Scratch not found' });
    }

    const isBookmarked = await db('bookmarks')
      .select('*')
      .where({
        userId: res.locals.user.id,
        scratchId: id
      })
      .first();
    if (isBookmarked) {
      return res.status(400).json({ err: 'Scratch is already bookmarked' });
    }

    const [bookmark] = await db('bookmarks')
      .insert({
        userId: res.locals.user.id,
        scratchId: id
      })
      .returning(['userId', 'scratchId']);

    return res.status(201).json({
      success: true,
      ...bookmark
    });
  } catch (err) {
    return errorUtils.tryCatchError(res, err, 'An error occurred while bookmarking scratch');
  }
};

exports.unbookmarkScratchById = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const isBookmarked = await db('bookmarks')
      .select('*')
      .where({
        userId: res.locals.user.id,
        scratchId: id
      })
      .first();
    if (!isBookmarked) {
      return res.status(400).json({ err: 'Scratch is not bookmarked' });
    }

    const [bookmark] = await db('bookmarks')
      .where({
        userId: res.locals.user.id,
        scratchId: id
      })
      .del()
      .returning(['userId', 'scratchId']);

    return res.json({
      success: true,
      ...bookmark
    });
  } catch (err) {
    return errorUtils.tryCatchError(res, err, 'An error occurred while unbookmarking scratch');
  }
};

exports.getUsersLikedByScratchId = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const users = await db('likes')
      .select('id', 'name', 'username', 'description', 'profileImageUrl')
      .join('users', 'userId', 'id')
      .where({ scratchId: id });

    for (const user of users) {
      const follow = await db('follows')
        .select('*')
        .where({
          followerId: res.locals.user.id,
          followedId: user.id
        })
        .first();

      user.isFollowing = (follow) ? true : false;
    }

    return res.json(users);
  } catch (err) {
    return errorUtils.tryCatchError(res, err, 'An error occurred while searching for users who liked the scratch');
  }
};

exports.likeScratchById = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const scratch = await db('scratches')
      .select('id')
      .where({ id })
      .first();
    if (!scratch) {
      return res.status(404).json({ err: 'Scratch not found' });
    }

    const isLiked = await db('likes')
      .select('*')
      .where({
        userId: res.locals.user.id,
        scratchId: id
      })
      .first();
    if (isLiked) {
      return res.status(400).json({ err: 'Scratch is already liked' });
    }

    const [like] = await db('likes')
      .insert({
        userId: res.locals.user.id,
        scratchId: id
      })
      .returning(['userId', 'scratchId']);

    return res.status(201).json({
      success: true,
      ...like
    });
  } catch (err) {
    return errorUtils.tryCatchError(res, err, 'An error occurred while liking scratch');
  }
};

exports.unlikeScratchById = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const isLiked = await db('likes')
      .select('*')
      .where({
        userId: res.locals.user.id,
        scratchId: id
      })
      .first();
    if (!isLiked) {
      return res.status(400).json({ err: 'Scratch is not liked' });
    }

    const [like] = await db('likes')
      .where({
        userId: res.locals.user.id,
        scratchId: id
      })
      .del()
      .returning(['userId', 'scratchId']);

    return res.json({
      success: true,
      ...like
    });
  } catch (err) {
    return errorUtils.tryCatchError(res, err, 'An error occurred while unliking scratch');
  }
};
