import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function makeStorage(folder) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const targetDir = path.resolve(__dirname, `../uploads/${folder}`);
      fs.mkdirSync(targetDir, { recursive: true });
      cb(null, targetDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${uuidv4()}${ext}`);
    }
  });
}

export const materialUpload = multer({ storage: makeStorage('materials') });
export const assignmentUpload = multer({ storage: makeStorage('assignments') });
