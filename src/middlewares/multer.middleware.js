import multer from "multer";
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const filePath = path.join(__dirname,'my-uploads')
    if(!fs.existsSync(filePath))
    {
        fs.mkdirSync(filePath,{recursive:true})
    }
    cb(null,filePath)
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
})

export const upload = multer({ storage: storage })