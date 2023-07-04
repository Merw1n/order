const mongoose = require("mongoose");
const Order = require("../models/order");

require("dotenv").config();

mongoose
  // .connect("mongodb://localhost:27017/OrderScout", {
  .connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => {
    console.log("Mongoose Connection Open!");
  })
  .catch((err) => {
    console.log("Mongoose connection error!");
    console.log(err);
  });

const emptyFiles = async () => {
  try {
    const orders = await Order.find({});
    orders.forEach(async (order) => {
      order.files = [];
      await order.save();
    });
  } catch (e) {
    console.log(e);
  }
};

emptyFiles().then(() => {
  console.log("Done!");
});
