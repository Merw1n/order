const Notification = require("../models/notification");
const Company = require("../models/company");
const catchAsync = require("../utils/catchAsync");

const sendNotificationsToSockets = (receivingCompanyId, notification) => {
  // check if there are online users
  // const onlineUsers=io.sockets.adapter.rooms.get(receivingCompanyId).size
  // if(onlineUsers){
  global.io
    .to(receivingCompanyId.toString())
    .emit("new-notification", notification);
  // }
};

const addNotification = catchAsync(async (body, receivingCompanyId) => {
  const notification = new Notification(body);
  await notification.save();

  const company = await Company.findById(receivingCompanyId);
  if (!company.notifications) {
    company.notifications = [];
  }
  company.notifications.unshift(notification);
  await company.save();
  sendNotificationsToSockets(receivingCompanyId, notification);
});

module.exports = { addNotification };
