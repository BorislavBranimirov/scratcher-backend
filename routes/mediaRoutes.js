const express = require('express');
const router = express.Router();

const mediaController = require('../controllers/mediaController');
const { verifyAccessToken } = require('../controllers/authController');

router.route('/').post(verifyAccessToken, mediaController.uploadMediaFile);

module.exports = router;