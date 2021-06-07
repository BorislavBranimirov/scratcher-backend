const db = require('../db/db');

exports.getOneById = async (req, res) => {
  try {
    const scratch = await db('scratches')
      .select('*')
      .where({ id: parseInt(req.params.id, 10) })
      .first();
    if (!scratch) {
      return res.status(404).json({ err: 'Scratch not found' });
    }

    return res.json(scratch);
  } catch (err) {
    return res.status(500).json({ err: 'An error occured while searching for scratch' });
  }
};