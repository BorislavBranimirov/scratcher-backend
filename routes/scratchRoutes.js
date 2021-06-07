const express = require('express');
const router = express.Router();

const scratchController = require('../controllers/scratchController');

router.route('/:id')
  .get(scratchController.getOneById);

module.exports = router;