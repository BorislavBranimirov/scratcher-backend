const express = require('express');
const router = express.Router();

const scratchController = require('../controllers/scratchController');
const { verifyAccessToken } = require('../controllers/authController');

router.route('/')
  .post(verifyAccessToken, scratchController.createOne);

router.route('/:id')
  .get(scratchController.getOneById)
  .delete(verifyAccessToken, scratchController.deleteOneById);

module.exports = router;