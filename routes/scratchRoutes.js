const express = require('express');
const router = express.Router();

const scratchController = require('../controllers/scratchController');
const { verifyAccessToken, passUserInfo } = require('../controllers/authController');

router.route('/')
  .post(verifyAccessToken, scratchController.createScratch);

router.route('/search')
  .get(passUserInfo, scratchController.searchScratches);

router.route('/:id')
  .get(passUserInfo, scratchController.getScratchById)
  .delete(verifyAccessToken, scratchController.deleteScratchById);

router.route('/:id/conversation')
  .get(passUserInfo, scratchController.getScratchConversationById);

router.route('/:id/rescratches')
  .get(verifyAccessToken, scratchController.getUsersRescratchedByScratchId);

router.route('/:id/pin')
  .post(verifyAccessToken, scratchController.pinScratch)
  .delete(verifyAccessToken, scratchController.unpinScratch);

router.route('/:id/bookmark')
  .post(verifyAccessToken, scratchController.bookmarkScratchById)
  .delete(verifyAccessToken, scratchController.unbookmarkScratchById);

router.route('/:id/likes')
  .get(verifyAccessToken, scratchController.getUsersLikedByScratchId)
  .post(verifyAccessToken, scratchController.likeScratchById)
  .delete(verifyAccessToken, scratchController.unlikeScratchById);

module.exports = router;