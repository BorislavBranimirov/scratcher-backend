const express = require('express');
const router = express.Router();

const scratchController = require('../controllers/scratchController');
const { verifyAccessToken } = require('../controllers/authController');

router.route('/')
  .post(verifyAccessToken, scratchController.createScratch);

router.route('/:id')
  .get(scratchController.getScratchById)
  .delete(verifyAccessToken, scratchController.deleteScratchById);

module.exports = router;