const db = require('../db/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { userUtils, errorUtils } = require('../utils');

exports.verifyAccessToken = (req, res, next) => {
  // access token should be supplied in an Authorization header with a Bearer schema
  if (req.headers['authorization'] === undefined ||
    req.headers['authorization'].split(' ')[0] !== 'Bearer') {
    return res.status(401).json({ err: 'Unauthorized' });
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
    return res.status(401).json({ err: 'Unauthorized' });
  }
};

/**
 * Exposes user information on res.locals.user if access token can be verified, similarly to verifyAccessToken().
 * If no access token is provided, continues to the next middleware without setting the users object.
 * Returns an error on invalid or expired token.
 */
exports.passUserInfo = (req, res, next) => {
  // access token should be supplied in an Authorization header with a Bearer schema
  if (req.headers['authorization'] === undefined ||
    req.headers['authorization'].split(' ')[0] !== 'Bearer') {
    return next();
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
    return res.status(401).json({ err: 'Invalid token' });
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

exports.refreshToken = async (req, res) => {
  // refresh token should be supplied in a cookie
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ err: 'No refresh token provided' });
  }

  try {
    const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await db('users')
      .select('*')
      .where({ id: payload.id })
      .first();
    if (!user) {
      return res.status(400).json({ err: 'User doesn\'t exist' });
    }

    const newAccessToken = jwt.sign({
      id: user.id,
      username: user.username
    }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_AFTER });

    const newRefreshToken = jwt.sign({
      id: user.id,
      username: user.username
    }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_AFTER });

    res.cookie('refreshToken', newRefreshToken, {
      maxAge: process.env.REFRESH_TOKEN_EXPIRES_AFTER,
      path: req.baseUrl + '/refresh-token',
      httpOnly: true,
      secure: true
    });

    return res.json({
      accessToken: newAccessToken
    });
  } catch (err) {
    // if refresh token is expired send a 401, the user should log in again to receive a new one
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ err: 'Unauthorized' });
    }
    return errorUtils.tryCatchError(res, err, 'An error occurred while refreshing token');
  }
};

exports.logout = async (req, res) => {
  res.clearCookie('refreshToken', {
    path: req.baseUrl + '/refresh-token',
    httpOnly: true,
    secure: true
  });
  
  return res.json({
    success: true
  });
};