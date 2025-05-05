import multer from "multer";
import path from "path";
import fs from "fs";

// Define the upload path relative to project root
const uploadPath = path.join(process.cwd(), "public/temp");

// Create the directory if it doesn't exist
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath); // use absolute path here
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // optionally add Date.now() for uniqueness
  }
});

export const upload = multer({ storage });
