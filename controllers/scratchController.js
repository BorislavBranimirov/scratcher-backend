const db = require('../db/db');

exports.getScratchById = async (req, res) => {
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

exports.createScratch = async (req, res) => {
  let { body, parent_id, rescratched_id, media_url } = req.body;

  try {
    if (body) {
      body = body.trim();
      const scratchLimit = 280;
      if (body.length > scratchLimit) {
        return res.status(400).json({ err: `Scartch body is limited to ${scratchLimit} characters` });
      }
    }

    // a scratch has to contain text, id of a shared scratch or url to a media resource
    if (!body && !rescratched_id && !media_url) {
      return res.status(400).json({ err: 'No data provided' });
    }

    if (parent_id) {
      parent_id = parseInt(parent_id, 10);
      const parentScratch = await db('scratches')
        .select('id')
        .where({ id: parent_id })
        .first();
      if (!parentScratch) {
        return res.status(404).json({ err: 'Parent scratch not found' });
      }
    }

    if (rescratched_id) {
      rescratched_id = parseInt(rescratched_id, 10);
      const scratchToShare = await db('scratches')
        .select('id')
        .where({ id: rescratched_id })
        .first();
      if (!scratchToShare) {
        return res.status(404).json({ err: 'Scratch being shared not found' });
      }
    }

    // TODO: implement media_url in controller
    /*
    if (media_url) {
    }
    */

    const [scratch] = await db('scratches')
      .insert({
        author_id: res.locals.user.id,
        rescratched_id,
        parent_id,
        body,
        media_url
      })
      .returning(['id', 'author_id']);

    return res.status(201).json({
      success: true,
      ...scratch
    });
  } catch (err) {
    return res.status(500).json({ err: 'An error occured while creating scratch' });
  }
};

exports.deleteScratchById = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const scratchOld = await db('scratches')
      .select('*')
      .where({ id })
      .first();
    if (!scratchOld) {
      return res.status(404).json({ err: 'Scratch not found' });
    }
    if (scratchOld.author_id !== res.locals.user.id) {
      return res.status(401).json({ err: 'Unauthorized to delete scratch' });
    }

    const [scratch] = await db('scratches')
      .where({ id })
      .del()
      .returning(['id', 'author_id']);

    return res.json({
      success: true,
      ...scratch
    });
  } catch (err) {
    return res.status(500).json({ err: 'An error occured while deleting scratch' });
  }
};