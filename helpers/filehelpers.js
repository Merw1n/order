const multer = require("multer");
const S3 = require("aws-sdk/clients/s3");
const multerS3 = require("multer-s3");
// const path = require("path");
require("dotenv").config();

const bucketName = process.env.AWS_BUCKKET_NAME;
const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;

const s3 = new S3({
  region,
  accessKeyId,
  secretAccessKey,
});

const storage = multerS3({
  s3: s3,
  bucket: bucketName,
  metadata: function (req, file, cb) {
    cb(null, { fieldName: file.fieldname });
  },
  key: function (req, file, cb) {
    cb(
      null,
      new Date().toISOString().replace(/:/g, "-") + "-" + file.originalname
    );
  },
});

const deleteFile = (key) => {
  return s3.deleteObject({ Bucket: bucketName, Key: key }).promise();
};

// Disk Storage
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "uploads");
//   },
//   filename: (req, file, cb) => {
//     cb(
//       null,
//       new Date().toISOString().replace(/:/g, "-") + "-" + file.originalname
//     );
//   },
// });

// const filefilter = (req, file, cb) => {
//   if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg'
//       || file.mimetype === 'image/jpeg'){
//           cb(null, true);
//       }else {
//           cb(null, false);
//       }
// }

const upload = multer({ storage });

// downloads a file from s3
function getFileStream(fileKey, next) {
  const downloadParams = {
    Key: fileKey,
    Bucket: bucketName,
  };
  return s3
    .getObject(downloadParams)
    .createReadStream()
    .on("error", (error) => {
      next(error);
    });
}

module.exports = { upload, getFileStream, deleteFile };
