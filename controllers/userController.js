const db = require('../db/db');
const bcrypt = require('bcryptjs');
const userUtils = require('../utils/userUtils');

exports.getOneByUsername = async (req, res) => {
  try {
    const user = await db('users')
      .select('id', 'username', 'created_at', 'description', 'pinned_id', 'profile_image_url', 'profile_banner_url')
      .where({ username: req.params.username })
      .first();

    if (!user) {
      return res.status(404).json({ err: 'User not found' });
    }

    return res.json(user);
  } catch (err) {
    return res.status(500).json({ err: 'An error occured while searching for user' });
  }
};

exports.getOneById = async (req, res) => {
  try {
    const user = await db('users')
      .select('id', 'username', 'created_at', 'description', 'pinned_id', 'profile_image_url', 'profile_banner_url')
      .where({ id: parseInt(req.params.id, 10) })
      .first();

    if (!user) {
      return res.status(404).json({ err: 'User not found' });
    }

    return res.json(user);
  } catch (err) {
    return res.status(500).json({ err: 'An error occured while searching for user' });
  }
};

exports.createOne = async (req, res) => {
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({ err: 'No username or password provided' });
  }

  if (!userUtils.usernamePatternTest(req.body.username)) {
    return res.status(400).json({ err: 'Invalid username' });
  }

  if (!userUtils.passwordPatternTest(req.body.password)) {
    return res.status(400).json({ err: 'Invalid password' });
  }

  try {
    const userExists = await db('users')
      .select('id')
      .where({ username: req.body.username })
      .first();

    if (userExists) {
      return res.status(400).json({ err: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 12);
    const [user] = await db('users')
      .insert({
        username: req.body.username,
        password: hashedPassword
      })
      .returning(['id', 'username']);

    return res.status(201).json({
      success: true,
      ...user
    });
  } catch (err) {
    return res.status(500).json({ err: 'An error occurred while creating user' });
  }
};

exports.deleteOneById = async (req, res) => {
  const id = parseInt(req.param.id, 10);

  if (id !== res.locals.user.id) {
    return res.status(401).json({ err: 'Unauthorized to delete user' });
  }

  try {
    const [user] = await db('users')
      .where({ id })
      .del()
      .returning(['id', 'username']);

    if (!user) {
      return res.status(404).json({ err: 'User not found' });
    }

    return res.json({
      success: true,
      ...user
    });
  } catch (err) {
    return res.status(500).json({ err: 'An error occurred while deleting user' });
  }
};