const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const { verifyAccessToken } = require('../controllers/authController');

router.route('/')
  .post(userController.createOne);

router.route('/username/:username')
  .get(userController.getOneByUsername);

router.route('/:id')
  .get(userController.getOneById)
  .delete(verifyAccessToken, userController.deleteOneById);

router.route('/:id/followers')
  .get(userController.getFollowersById);

router.route('/:id/followed')
  .get(userController.getFollowedById);

router.route('/:id/follow')
  .post(verifyAccessToken, userController.followOneById)
  .delete(verifyAccessToken, userController.unfollowOneById);

module.exports = router;