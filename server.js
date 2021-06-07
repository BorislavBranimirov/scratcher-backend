const express = require('express');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const app = express();

require('dotenv').config();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(morgan('tiny'));

app.use(helmet());

const { authRouter, userRouter } = require('./routes');
app.use('/api/users', userRouter);
app.use('/api/auth', authRouter);

const port = process.env.PORT || 8000;

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});