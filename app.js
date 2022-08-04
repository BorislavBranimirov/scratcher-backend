const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const app = express();

require('dotenv').config();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN_URL || 'http://localhost:3000',
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('tiny'));
}

app.use(helmet());

const {
  authRouter,
  userRouter,
  scratchRouter,
  mediaRouter,
} = require('./routes');
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/scratches', scratchRouter);
app.use('/api/media', mediaRouter);

module.exports = app;
