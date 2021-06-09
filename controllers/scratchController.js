const db = require('../db/db');

exports.getScratchById = async (req, res) => {
  try {
    const scratch = await db('scratches')
      .select('*')
      .where({ id: parseInt(req.params.id, 10) })
      .first();
    if (!scratch) {
      return res.status(404).json({ err: 'Scratch not found' });
    }

    return res.json(scratch);
  } catch (err) {
    return res.status(500).json({ err: 'An error occured while searching for scratch' });
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

    return res.json({ scratches, isFinished });
  } catch (err) {
    return res.status(500).json({ err: 'An error occured while searching for scratches' });
  }
};

exports.createScratch = async (req, res) => {
  let { body, parentId, rescratchedId, mediaUrl } = req.body;

  try {
    if (body) {
      body = body.trim();
      const scratchLimit = 280;
      if (body.length > scratchLimit) {
        return res.status(400).json({ err: `Scartch body is limited to ${scratchLimit} characters` });
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
      const scratchToShare = await db('scratches')
        .select('id')
        .where({ id: rescratchedId })
        .first();
      if (!scratchToShare) {
        return res.status(404).json({ err: 'Scratch being shared not found' });
      }
    }

    // TODO: implement mediaUrl in controller
    /*
    if (mediaUrl) {
    }
    */

    const [scratch] = await db('scratches')
      .insert({
        author_id: res.locals.user.id,
        rescratched_id: rescratchedId,
        parent_id: parentId,
        body,
        media_url: mediaUrl
      })
      .returning(['id', 'author_id']);

    return res.status(201).json({
      success: true,
      ...scratch
    });
  } catch (err) {
    return res.status(500).json({ err: 'An error occured while creating scratch' });
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
    if (scratchOld.author_id !== res.locals.user.id) {
      return res.status(401).json({ err: 'Unauthorized to delete scratch' });
    }

    const [scratch] = await db('scratches')
      .where({ id })
      .del()
      .returning(['id', 'author_id']);

    return res.json({
      success: true,
      ...scratch
    });
  } catch (err) {
    return res.status(500).json({ err: 'An error occured while deleting scratch' });
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

    let parentId = obj.scratch.parent_id;
    while (parentId) {
      const parent = await db('scratches')
        .select('*')
        .where({ id: parentId })
        .first();
      obj.parentChain.unshift(parent);
      parentId = parent.parent_id;
    }

    obj.replies = await await db('scratches')
      .select('*')
      .where({ parent_id: id });

    return res.json(obj);
  } catch (err) {
    return res.status(500).json({ err: 'An error occured while searching for scratch conversation' });
  }
};

exports.getUsersRescratchedByScratchId = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const users = await db('scratches')
      .select('users.id', 'username', 'description', 'profile_image_url')
      .join('users', 'author_id', 'users.id')
      .where({ rescratched_id: id });

    return res.json(users);
  } catch (err) {
    return res.status(500).json({ err: 'An error occurred while searching for users who shared the scratch' });
  }
};

exports.pinScratch = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const scratch = await db('scratches')
      .select(['id', 'author_id'])
      .where({ id })
      .first();
    if (!scratch) {
      return res.status(404).json({ err: 'Scratch not found' });
    }
    if (scratch.author_id !== res.locals.user.id) {
      return res.status(401).json({ err: 'Scratches can only be pinned by their author' });
    }

    const userOld = await db('users')
      .select(['id', 'pinned_id'])
      .where({ id: res.locals.user.id })
      .first();
    if (userOld.pinned_id === id) {
      return res.status(400).json({ err: 'Scratch is already pinned' });
    }

    const [user] = await db('users')
      .where({ id: res.locals.user.id })
      .update({ pinned_id: id })
      .returning(['id', 'pinned_id']);

    return res.json({
      success: true,
      ...user
    });
  } catch (err) {
    return res.status(500).json({ err: 'An error occurred while pinning scratch' });
  }
};

exports.unpinScratch = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const userOld = await db('users')
      .select(['id', 'pinned_id'])
      .where({ id: res.locals.user.id })
      .first();
    if (userOld.pinned_id !== id) {
      return res.status(400).json({ err: 'Scratch is not pinned' });
    }

    const [user] = await db('users')
      .where({ id: res.locals.user.id })
      .update({ pinned_id: null })
      .returning(['id']);

    return res.json({
      success: true,
      ...user,
      pinned_id: id
    });
  } catch (err) {
    return res.status(500).json({ err: 'An error occurred while unpinning scratch' });
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
        user_id: res.locals.user.id,
        scratch_id: id
      })
      .first();
    if (isBookmarked) {
      return res.status(400).json({ err: 'Scratch is already bookmarked' });
    }

    const [bookmark] = await db('bookmarks')
      .insert({
        user_id: res.locals.user.id,
        scratch_id: id
      })
      .returning(['user_id', 'scratch_id']);

    return res.status(201).json({
      success: true,
      ...bookmark
    });
  } catch (err) {
    return res.status(500).json({ err: 'An error occurred while bookmarking scratch' });
  }
};

exports.unbookmarkScratchById = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const isBookmarked = await db('bookmarks')
      .select('*')
      .where({
        user_id: res.locals.user.id,
        scratch_id: id
      })
      .first();
    if (!isBookmarked) {
      return res.status(400).json({ err: 'Scratch is not bookmarked' });
    }

    const [bookmark] = await db('bookmarks')
      .where({
        user_id: res.locals.user.id,
        scratch_id: id
      })
      .del()
      .returning(['user_id', 'scratch_id']);

    return res.json({
      success: true,
      ...bookmark
    });
  } catch (err) {
    return res.status(500).json({ err: 'An error occurred while unbookmarking scratch' });
  }
};

exports.getUsersLikedByScratchId = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const users = await db('likes')
      .select('id', 'username', 'description', 'profile_image_url')
      .join('users', 'user_id', 'id')
      .where({ scratch_id: id });

    return res.json(users);
  } catch (err) {
    return res.status(500).json({ err: 'An error occurred while searching for users who liked the scratch' });
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
        user_id: res.locals.user.id,
        scratch_id: id
      })
      .first();
    if (isLiked) {
      return res.status(400).json({ err: 'Scratch is already liked' });
    }

    const [like] = await db('likes')
      .insert({
        user_id: res.locals.user.id,
        scratch_id: id
      })
      .returning(['user_id', 'scratch_id']);

    return res.status(201).json({
      success: true,
      ...like
    });
  } catch (err) {
    return res.status(500).json({ err: 'An error occurred while liking scratch' });
  }
};

exports.unlikeScratchById = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const isLiked = await db('likes')
      .select('*')
      .where({
        user_id: res.locals.user.id,
        scratch_id: id
      })
      .first();
    if (!isLiked) {
      return res.status(400).json({ err: 'Scratch is not liked' });
    }

    const [like] = await db('likes')
      .where({
        user_id: res.locals.user.id,
        scratch_id: id
      })
      .del()
      .returning(['user_id', 'scratch_id']);

    return res.json({
      success: true,
      ...like
    });
  } catch (err) {
    return res.status(500).json({ err: 'An error occurred while unliking scratch' });
  }
};
