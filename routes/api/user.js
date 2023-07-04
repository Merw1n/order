const express = require("express");
const router = express.Router();
// const passport = require("passport");
// const User = require("../../models/user");
const catchAsync = require("../../utils/catchAsync");
const { upload } = require("../../helpers/filehelpers");
const { lowerCaseEmail, isLoggedIn } = require("../../middleware");
const user = require("../../controllers/userController");

// const validateUser = (req, res, next) => {
//   const { error } = userSchema.validate(req.body);
//   if (error) {
//     const msg = error.details.map((el) => el.message).join(",");
//     throw new ExpressError(msg, 400);
//   } else {
//     next();
//   }
// };

router.post(
  "/register",
  upload.single("logo"),
  catchAsync(user.registerUserandCompany)
);

router.post(
  "/login",
  lowerCaseEmail,
  // passport.authenticate("local"),
  user.login
);

router.post("/changePass", isLoggedIn(), catchAsync(user.changePass));

router.post(
  "/verify/:token",
  isLoggedIn({ noSubNeeded: true }),
  catchAsync(user.verify)
);

router.get("/logout", user.logout);

// checks if email is in use
// router.get("/", catchAsync(user.emailInUse));

// Checks current user and sends it if it exists
router.get("/current", catchAsync(user.getCurrent));

// takes email from req & creates a forgotpassword token for a user and sends it via email
router.post("/forgot", catchAsync(user.forgotPW));

// takes in password and confirmation from req, resets it, & sends a confirmation email.
router.post("/reset/:token", catchAsync(user.resetPW));

module.exports = router;
