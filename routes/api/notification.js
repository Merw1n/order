const express = require("express");
const router = express.Router();
const Notification = require("../../models/notification");
const Company = require("../../models/company");
const { isLoggedIn } = require("../../middleware");
const catchAsync = require("../../utils/catchAsync");
const {
  getCompanyNotifications,
  markAllRead,
} = require("../../controllers/notificationsController");

// read all notifications
router.get(
  "/",
  isLoggedIn({ noSubNeeded: true }),
  catchAsync(getCompanyNotifications)
);

// find all the notifications of the user and mark them as seen
router.patch("/", isLoggedIn({ noSubNeeded: true }), catchAsync(markAllRead));

module.exports = router;
