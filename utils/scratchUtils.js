const db = require('../db/db');

/**
 * Returns an object with the rescratched posts associated with the given scratches
 * @param {Object[]} scratches - scratches whose rescratchedId property would be used when fetching posts
 * @param {number} [loggedUserId] - id of the logged-in user 
 */
const getExtraScratches = async (scratches, loggedUserId) => {
  const extraScratches = {};

  for (const scratch of scratches) {
    if (!scratch.rescratchedId) {
      continue;
    }

    const rescratch = await getRescratch(scratch, loggedUserId);
    extraScratches[rescratch.id] = rescratch;

    // only fetch posts two levels deep from the original scratch, as further ones won't be usable by the original
    if (rescratch.rescratchedId) {
      const nestedRescratch = await getRescratch(rescratch, loggedUserId);
      extraScratches[nestedRescratch.id] = nestedRescratch;
    }
  }

  return extraScratches;
};

const getRescratch = async (scratch, loggedUserId) => {
  const rescratch = await db('scratches')
    .select('*')
    .where({ id: scratch.rescratchedId })
    .first();

  Object.assign(
    rescratch,
    await getAdditionalScratchData(rescratch, loggedUserId)
  );

  return rescratch;
};

const getAdditionalScratchData = async (scratch, loggedUserId) => {
  const obj = {
    author: null,
    replyCount: 0,
    rescratchCount: 0,
    likeCount: 0,
    isRescratched: false,
    isLiked: false,
    isBookmarked: false,
    rescratchType: 'none'
  };

  obj.author = await getAuthor(scratch.authorId);

  Object.assign(
    obj,
    await getCounters(scratch.id),
    await getStatuses(scratch.id, loggedUserId)
  );

  if (scratch.rescratchedId) {
    if (!scratch.body && !scratch.mediaUrl) {
      obj.rescratchType = 'direct';
    } else {
      obj.rescratchType = 'quote';
    }
  }

  return obj;
};

const getAuthor = async (id) => {
  return await db('users')
    .select('id', 'name', 'username', 'profileImageUrl')
    .where({ id })
    .first();
};

const getCounters = async (id) => {
  const counters = {
    replyCount: 0,
    rescratchCount: 0,
    likeCount: 0
  };

  counters.replyCount = (await db('scratches')
    .count('*')
    .where({ parentId: id }))[0].count;

  counters.rescratchCount = (await db('scratches')
    .count('*')
    .where({ rescratchedId: id }))[0].count;

  counters.likeCount = (await db('likes')
    .count('*')
    .where({ scratchId: id }))[0].count;

  return counters;
};

const getStatuses = async (id, loggedUserId) => {
  const statuses = {
    isRescratched: false,
    isLiked: false,
    isBookmarked: false
  };

  if (!loggedUserId) {
    return statuses;
  }

  // posts by the logged user that have shared the scratch
  const userRescratches = await db('scratches')
    .select('*')
    .where({
      authorId: loggedUserId,
      rescratchedId: id
    });
  // status only applies to direct rescratches, with no text body or media
  for (const userRescratch of userRescratches) {
    if (!userRescratch.body && !userRescratch.mediaUrl) {
      statuses.isRescratched = true;
      break;
    }
  }

  const userLike = await db('likes')
    .select('*')
    .where({
      userId: loggedUserId,
      scratchId: id
    })
    .first();
  if (userLike) {
    statuses.isLiked = true;
  }

  const userBookmark = await db('bookmarks')
    .select('*')
    .where({
      userId: loggedUserId,
      scratchId: id
    })
    .first();
  if (userBookmark) {
    statuses.isBookmarked = true;
  }

  return statuses;
};

module.exports = { getExtraScratches, getAdditionalScratchData };