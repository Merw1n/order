const Notification = require("../models/notification");
const Company = require("../models/company");

const getCompanyNotifications = async (req, res) => {
  // find all the notifications of the user.
  const { notifications } = await Company.findById(req.user.company).populate(
    "notifications"
  );
  // send the notificaitons
  res.json({ status: "success", data: { notifications } });
};

const markAllRead = async (req, res) => {
  const dateNow = new Date();
  await Notification.updateMany(
    {
      notifier: req.user.company,
      readDate: null,
    },
    { readDate: dateNow }
  );
  res.json({ status: "success" });
};

module.exports = { getCompanyNotifications, markAllRead };
