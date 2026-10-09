const multer = require("multer");
const path = require("path");

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
];

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(
        new Error(
          "Unsupported file extension. Only PDF, JPG, and PNG files are allowed."
        ),
        false
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(mime)) {
      return cb(
        new Error(
          "Unsupported file type. Only PDF, JPG, and PNG documents are allowed."
        ),
        false
      );
    }

    cb(null, true);
  },
});

module.exports = upload;
