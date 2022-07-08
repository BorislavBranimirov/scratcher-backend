exports.tryCatchError = (res, err, errMessage) => {
  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    console.error(err);
  }
  return res.status(500).json({ err: errMessage });
};
