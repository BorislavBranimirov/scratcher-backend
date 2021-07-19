const db = require('../db/db');

exports.getAdditionalScratchData = async (scratch, loggedUserId) => {
  const obj = {
    author: null,
    rescratch: null,
    replyCount: 0,
    rescratchCount: 0,
    likeCount: 0,
    isRescratched: false,
    isLiked: false,
    isBookmarked: false
  };

  obj.author = await getAuthor(scratch.authorId);

  if (scratch.rescratchedId) {
    obj.rescratch = await getRescratch(scratch, loggedUserId);
  }

  Object.assign(
    obj,
    await getCounters(scratch.id),
    await getStatuses(scratch.id, loggedUserId)
  );

  return obj;
};

const getAuthor = async (id) => {
  return await db('users')
    .select('id', 'name', 'username', 'profileImageUrl')
    .where({ id })
    .first();
};

const getRescratch = async (scratch, loggedUserId) => {
  const rescratch = await db('scratches')
    .select('*')
    .where({ id: scratch.rescratchedId })
    .first();

  rescratch.author = await getAuthor(rescratch.authorId);

  // return counters and statuses only on direct rescratches
  if (!scratch.body && !scratch.mediaUrl) {
    Object.assign(
      rescratch,
      await getCounters(rescratch.id),
      await getStatuses(rescratch.id, loggedUserId)
    );
  }

  return rescratch;
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