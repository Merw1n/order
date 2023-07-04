const express = require("express");
const router = express.Router();

const { upload } = require("../helpers/filehelpers");
const {
  singleFileUpload,
  multipleFileUpload,
} = require("../controllers/fileUploadController");

router.post("/singleFile", upload.array("file"), singleFileUpload);
router.post("/multipleFiles", upload.array("files"), multipleFileUpload);

module.exports = {
  routes: router,
};
