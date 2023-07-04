const express = require("express");
const router = express.Router();
const { upload } = require("../../helpers/filehelpers");
const { isLoggedIn, validateObjectId } = require("../../middleware");
const catchAsync = require("../../utils/catchAsync");
const company = require("../../controllers/companyController");

// read specific company
router.get("/:id", isLoggedIn(), validateObjectId, catchAsync(company.getOne));

// update company contact data
router.patch("/my", isLoggedIn(), catchAsync(company.updateContactData));

// update company logo
router.patch(
  "/my/logo",
  isLoggedIn(),
  upload.single("newLogo"),
  catchAsync(company.updateLogo)
);

module.exports = router;
