const express = require('express');
const router = express.Router();

const mediaController = require('../controllers/mediaController');
const { verifyAccessToken } = require('../controllers/authController');

router.route('/').post(verifyAccessToken, mediaController.uploadMediaFile);

router.route('/profile-image')
  .post(verifyAccessToken, mediaController.addProfileImage)
  .delete(verifyAccessToken, mediaController.deleteProfileImage);

router.route('/profile-banner')
  .post(verifyAccessToken, mediaController.addProfileBanner)
  .delete(verifyAccessToken, mediaController.deleteProfileBanner);

module.exports = router;