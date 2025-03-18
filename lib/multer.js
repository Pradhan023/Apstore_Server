import multer from "multer";
import path from "path";
import fs from "fs";

// Check environment (development or production)
const isProduction = process.env.NODE_ENV === "production";

let storage;

// Use Memory Storage in Production because it's faster
if (isProduction) {
  storage = multer.memoryStorage();
} else {
  //  Use Disk Storage in Development
  const UPLOADS_FOLDER = "uploads/";

  if (!fs.existsSync(UPLOADS_FOLDER)) {
    fs.mkdirSync(UPLOADS_FOLDER);
  }

  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, UPLOADS_FOLDER);
    },
    filename: function (req, file, cb) {
      cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
    }
  });
}

// ✅ File Filter (Allow only images)
const checkFilterfile = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Not an image! Please upload an image"), false);
  }
};

//Final Multer Config
const upload = multer({
  storage,
  fileFilter: checkFilterfile,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

export default upload;
