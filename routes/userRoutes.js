const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const { verifyAccessToken, passUserInfo } = require('../controllers/authController');

router.route('/')
  .post(userController.createUser);

router.route('/timeline')
  .get(verifyAccessToken, userController.getHomeTimeline);

router.route('/search')
  .get(passUserInfo, userController.searchUsers);

router.route('/suggested-users')
  .get(passUserInfo, userController.getSuggestedUsers);

router.route('/username/:username')
  .get(passUserInfo, userController.getUserByUsername);

router.route('/:id')
  .get(passUserInfo, userController.getUserById)
  .delete(verifyAccessToken, userController.deleteUserById);

router.route('/:id/timeline')
  .get(passUserInfo, userController.getUserTimeline);

router.route('/:id/followers')
  .get(verifyAccessToken, userController.getFollowersById);

router.route('/:id/followed')
  .get(verifyAccessToken, userController.getFollowedById);

router.route('/:id/follow')
  .post(verifyAccessToken, userController.followUserById)
  .delete(verifyAccessToken, userController.unfollowUserById);

router.route('/:id/bookmarks')
  .get(verifyAccessToken, userController.getBookmarksByUserId);

router.route('/:id/likes')
  .get(verifyAccessToken, userController.getLikesByUserId);

module.exports = router;