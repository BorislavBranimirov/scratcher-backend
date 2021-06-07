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

module.exports = router;