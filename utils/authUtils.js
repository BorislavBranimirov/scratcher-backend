const jwt = require('jsonwebtoken');

exports.createAccessToken = (user) => {
  return jwt.sign({
    id: user.id,
    username: user.username
  }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_AFTER });
};

exports.createRefreshToken = (user) => {
  return jwt.sign({
    id: user.id,
    username: user.username
  }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_AFTER });
};

exports.addRefreshCookie = (req, res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    maxAge: process.env.REFRESH_TOKEN_EXPIRES_AFTER,
    path: req.baseUrl + '/refresh-token',
    httpOnly: true,
    secure: true
  });
};

exports.clearRefreshCookie = (req, res) => {
  res.clearCookie('refreshToken', {
    path: req.baseUrl + '/refresh-token',
    httpOnly: true,
    secure: true
  });
};