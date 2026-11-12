import multer from "multer";
import { customAlphabet } from "nanoid";
import path from "node:path"
import fs from "node:fs"

export const fileValidation = {
     image: ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"],
     pdf: ["application/pdf"],
     video: ["video/mp4", "video/mpeg", "video/webm"],
     document: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
     zip: ["application/zip", "application/x-zip-compressed"],
};
fileValidation.all = [...fileValidation.image, ...fileValidation.pdf, ...fileValidation.video, ...fileValidation.document, ...fileValidation.zip];
export const localMulterUpload = ({ customPath = "general", validation = [] } = {}) => {
     let finalPath;

     const fileFilter = function (req, file, cb) {

          if (validation.includes(file.mimetype)) {
               return cb(null, true)
          }
          return cb(new Error("INVALID_FILE_FORMAT"), false)

     }

     const storage = multer.diskStorage({
          destination: function (req, file, cb) {
               let resolvedPath = typeof customPath === "function" ? customPath(req) : customPath;
               let basePath = `uploads/${resolvedPath}`;
               
               if (typeof customPath !== "function" && req.user?.user_id) {
                    basePath += `/${req.user?.user_id}`;
               }

               finalPath = basePath;
               const fullPath = path.resolve(`./${basePath}`)



               if (!fs.existsSync(fullPath)) {
                    fs.mkdirSync(fullPath, { recursive: true })
               }

               cb(null, path.resolve(fullPath))
          },
          filename: function (req, file, cb) {
               const uniqueFileName = `${customAlphabet("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 5)()}-${file.originalname}`;
               file.finalPath = `${finalPath}/${uniqueFileName}`
               cb(null, uniqueFileName)
          }
     })

     return multer({
          dest: "./temp",
          fileFilter,
          storage
     })
}






