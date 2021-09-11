const db = require('./db/db');

beforeAll(async () => {
  await db.migrate.rollback();
});

beforeEach(async () => {
  await db.migrate.latest();
  await db.seed.run();
});

afterEach(async () => {
  await db.migrate.rollback();
});

afterAll(async () => {
  await db.destroy();
});

global.testUserProperties = (user) => {
  expect(user).toHaveProperty('id');
  expect(user).toHaveProperty('name');
  expect(user).toHaveProperty('username');
  expect(user).toHaveProperty('createdAt');
  expect(user).toHaveProperty('description');
  expect(user).toHaveProperty('pinnedId');
  expect(user).toHaveProperty('profileImageUrl');
  expect(user).toHaveProperty('profileBannerUrl');
  expect(user).toHaveProperty('followerCount');
  expect(user).toHaveProperty('followedCount');
  expect(user).toHaveProperty('isFollowing');
};

global.testScratchProperties = (scratch) => {
  expect(scratch).toHaveProperty('id');
  expect(scratch).toHaveProperty('authorId');
  expect(scratch).toHaveProperty('parentId');
  expect(scratch).toHaveProperty('rescratchedId');
  expect(scratch).toHaveProperty('body');
  expect(scratch).toHaveProperty('mediaUrl');
  expect(scratch).toHaveProperty('createdAt');
  expect(scratch).toHaveProperty('author');
  expect(scratch).toHaveProperty('replyCount');
  expect(scratch).toHaveProperty('rescratchCount');
  expect(scratch).toHaveProperty('likeCount');
  expect(scratch).toHaveProperty('isRescratched');
  expect(scratch).toHaveProperty('isLiked');
  expect(scratch).toHaveProperty('isBookmarked');
  expect(scratch).toHaveProperty('rescratchType');
};