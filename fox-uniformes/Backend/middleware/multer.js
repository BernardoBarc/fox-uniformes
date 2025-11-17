// config/multer.js
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadFolder = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadFolder);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/\s+/g, "-");
    cb(null, `${timestamp}-${safeName}`);
  },
});

function fileFilter(req, file, cb) {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Tipo de arquivo inválido. Apenas imagens são permitidas."), false);
  }
}


const limits = {
  fileSize: 5 * 1024 * 1024,
};

const upload = multer({
  storage,
  fileFilter,
  limits,
});

export default upload;
