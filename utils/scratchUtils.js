const db = require('../db/db');

exports.getAdditionalScratchData = async (scratch, loggedUserId) => {
  const obj = {
    author: null,
    rescratch: null,
    replyCount: '0',
    rescratchCount: '0',
    likeCount: '0',
    isRescratched: false,
    isLiked: false,
    isBookmarked: false
  };

  // author
  obj.author = await db('users')
    .select('id', 'name', 'username', 'profileImageUrl')
    .where({ id: scratch.authorId })
    .first();

  // rescratched scratch
  if (scratch.rescratchedId) {
    obj.rescratch = await db('scratches')
      .select('id', 'authorId', 'body', 'mediaUrl')
      .where({ id: scratch.rescratchedId })
      .first();

    obj.rescratch.author = await db('users')
      .select('id', 'name', 'username', 'profileImageUrl')
      .where({ id: obj.rescratch.authorId })
      .first();
  }

  // counters
  obj.replyCount = (await db('scratches')
    .count('*')
    .where({ parentId: scratch.id }))[0].count;

  obj.rescratchCount = (await db('scratches')
    .count('*')
    .where({ rescratchedId: scratch.id }))[0].count;

  obj.likeCount = (await db('likes')
    .count('*')
    .where({ scratchId: scratch.id }))[0].count;

  // statuses
  if (loggedUserId) {
    // posts by the logged user that have shared the scratch
    const userRescratches = await db('scratches')
      .select('*')
      .where({
        authorId: loggedUserId,
        rescratchedId: scratch.id
      });
    // status only applies to direct rescratches, with no text body or media
    for (const userRescratch of userRescratches) {
      if (!userRescratch.body && !userRescratch.mediaUrl) {
        obj.isRescratched = true;
        break;
      }
    }

    const userLike = await db('likes')
      .select('*')
      .where({
        userId: loggedUserId,
        scratchId: scratch.id
      })
      .first();
    if (userLike) {
      obj.isLiked = true;
    }

    const userBookmark = await db('bookmarks')
      .select('*')
      .where({
        userId: loggedUserId,
        scratchId: scratch.id
      })
      .first();
    if (userBookmark) {
      obj.isBookmarked = true;
    }
  }

  return obj;
};