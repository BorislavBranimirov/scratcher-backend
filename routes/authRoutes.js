const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');

router.route('/login').post(authController.login);

router.route('/refresh-token').post(authController.refreshToken);

module.exports = router;