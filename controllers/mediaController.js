const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../cloudinary');
const db = require('../db/db');
const { errorUtils } = require('../utils');

const storage = new CloudinaryStorage({
  cloudinary,
  params: { upload_preset: 'scratcher_preset' },
});

class WrongFileFormatError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    this.code = 'FILE_FORMAT_ERROR';
  }
}

const maxFileSizeInMB = 5;
const uploadMediaFileMulter = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * maxFileSizeInMB },
  fileFilter: (_, file, cb) => {
    let supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (supportedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new WrongFileFormatError('File format is not supported'));
    }
  },
}).single('file');

exports.uploadMediaFile = async (req, res) => {
  uploadMediaFileMulter(req, res, (err) => {
    if (err && err.code === 'FILE_FORMAT_ERROR') {
      return res.status(422).json({ err: err.message });
    }

    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res
        .status(422)
        .json({ err: `Maximum file size is ${maxFileSizeInMB} MB` });
    }

    if (err || !req.file) {
      return res
        .status(500)
        .json({ err: 'An error occurred while uploading media file' });
    }

    return res.json({ success: true, name: req.file.filename });
  });
};

exports.addProfileImage = async (req, res) => {
  const loggedUserId = res.locals.user.id;

  uploadMediaFileMulter(req, res, async (err) => {
    if (err && err.code === 'FILE_FORMAT_ERROR') {
      return res.status(422).json({ err: err.message });
    }

    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res
        .status(422)
        .json({ err: `Maximum file size is ${maxFileSizeInMB} MB` });
    }

    if (err || !req.file) {
      return res
        .status(500)
        .json({ err: 'An error occurred while uploading profile image' });
    }

    try {
      const userOld = await db('users')
        .select(['id', 'profileImageUrl'])
        .where({ id: loggedUserId })
        .first();
      if (userOld.profileImageUrl) {
        await cloudinary.uploader.destroy(userOld.profileImageUrl);
      }

      const [user] = await db('users')
        .where({ id: loggedUserId })
        .update({ profileImageUrl: req.file.filename })
        .returning(['id', 'profileImageUrl']);

      return res.json({ success: true, ...user });
    } catch (err) {
      return errorUtils.tryCatchError(
        res,
        err,
        'An error occurred while changing profile image'
      );
    }
  });
};

exports.deleteProfileImage = async (req, res) => {
  const loggedUserId = res.locals.user.id;

  try {
    const userOld = await db('users')
      .select(['id', 'profileImageUrl'])
      .where({ id: loggedUserId })
      .first();
    if (!userOld.profileImageUrl) {
      return res
        .status(400)
        .json({ err: 'User does not have a profile image' });
    }

    await cloudinary.uploader.destroy(userOld.profileImageUrl);

    const [user] = await db('users')
      .where({ id: loggedUserId })
      .update({ profileImageUrl: null })
      .returning(['id']);

    return res.json({ success: true, ...user });
  } catch (err) {
    return errorUtils.tryCatchError(
      res,
      err,
      'An error occurred while deleting profile image'
    );
  }
};

exports.addProfileBanner = async (req, res) => {
  const loggedUserId = res.locals.user.id;

  uploadMediaFileMulter(req, res, async (err) => {
    if (err && err.code === 'FILE_FORMAT_ERROR') {
      return res.status(422).json({ err: err.message });
    }

    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res
        .status(422)
        .json({ err: `Maximum file size is ${maxFileSizeInMB} MB` });
    }

    if (err || !req.file) {
      return res
        .status(500)
        .json({ err: 'An error occurred while uploading profile banner' });
    }

    try {
      const userOld = await db('users')
        .select(['id', 'profileBannerUrl'])
        .where({ id: loggedUserId })
        .first();
      if (userOld.profileBannerUrl) {
        await cloudinary.uploader.destroy(userOld.profileBannerUrl);
      }

      const [user] = await db('users')
        .where({ id: loggedUserId })
        .update({ profileBannerUrl: req.file.filename })
        .returning(['id', 'profileBannerUrl']);

      return res.json({ success: true, ...user });
    } catch (err) {
      return errorUtils.tryCatchError(
        res,
        err,
        'An error occurred while changing profile banner'
      );
    }
  });
};

exports.deleteProfileBanner = async (req, res) => {
  const loggedUserId = res.locals.user.id;

  try {
    const userOld = await db('users')
      .select(['id', 'profileBannerUrl'])
      .where({ id: loggedUserId })
      .first();
    if (!userOld.profileBannerUrl) {
      return res
        .status(400)
        .json({ err: 'User does not have a profile banner' });
    }

    await cloudinary.uploader.destroy(userOld.profileBannerUrl);

    const [user] = await db('users')
      .where({ id: loggedUserId })
      .update({ profileBannerUrl: null })
      .returning(['id']);

    return res.json({ success: true, ...user });
  } catch (err) {
    return errorUtils.tryCatchError(
      res,
      err,
      'An error occurred while deleting profile banner'
    );
  }
};
