const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../cloudinary');

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