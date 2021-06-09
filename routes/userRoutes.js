const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const { verifyAccessToken } = require('../controllers/authController');

router.route('/')
  .post(userController.createUser);

router.route('/timeline')
  .get(verifyAccessToken, userController.getHomeTimeline);

router.route('/search')
  .get(userController.searchUsers);

router.route('/username/:username')
  .get(userController.getUserByUsername);

router.route('/:id')
  .get(userController.getUserById)
  .delete(verifyAccessToken, userController.deleteUserById);

router.route('/:id/timeline')
  .get(userController.getUserTimeline);

router.route('/:id/followers')
  .get(userController.getFollowersById);

router.route('/:id/followed')
  .get(userController.getFollowedById);

router.route('/:id/follow')
  .post(verifyAccessToken, userController.followUserById)
  .delete(verifyAccessToken, userController.unfollowUserById);

router.route('/:id/bookmarks')
  .get(verifyAccessToken, userController.getBookmarksByUserId);

router.route('/:id/likes')
  .get(verifyAccessToken, userController.getLikesByUserId);

module.exports = router;