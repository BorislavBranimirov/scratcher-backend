const db = require('../db/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userUtils = require('../utils/userUtils');
const errorUtils = require('../utils/errorUtils');

exports.verifyAccessToken = (req, res, next) => {
  // access token should be supplied in an Authorization header with a Bearer schema
  if (req.headers['authorization'] === undefined ||
    req.headers['authorization'].split(' ')[0] !== 'Bearer') {
    res.status(401).json({ err: 'Unauthorized' });
  }

  const accessToken = req.headers['authorization'].split(' ')[1];

  try {
    const payload = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

    // attach the user info to the response object for use in further middleware
    res.locals.user = {
      id: payload.id,
      username: payload.username
    };

    next();
  } catch (err) {
    res.status(401).json({ err: 'Unauthorized' });
  }
};

exports.login = async (req, res) => {
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
    const user = await db('users')
      .select('*')
      .where({ username: req.body.username })
      .first();
    if (!user) {
      return res.status(400).json({ err: 'Wrong username or password' });
    }

    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isMatch) {
      return res.status(400).json({ err: 'Wrong username or password' });
    }

    const accessToken = jwt.sign({
      id: user.id,
      username: user.username
    }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_AFTER });

    const refreshToken = jwt.sign({
      id: user.id,
      username: user.username
    }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_AFTER });

    res.cookie('refreshToken', refreshToken, {
      maxAge: process.env.REFRESH_TOKEN_EXPIRES_AFTER,
      path: req.baseUrl + '/refresh-token',
      httpOnly: true,
      secure: true
    });

    return res.json({
      accessToken: accessToken
    });
  } catch (err) {
    return errorUtils.tryCatchError(res, err, 'An error occurred while trying to log in');
  }
};