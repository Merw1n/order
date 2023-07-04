const mongoose = require("mongoose");
const Order = require("../models/order");

mongoose
  .connect("mongodb://localhost:27017/OrderScout", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then(() => {
    console.log("Mongoose Connection Open!");
  })
  .catch((err) => {
    console.log("Mongoose connection error!");
    console.log(err);
  });


  const randomDate = function (start, end) {
    start = new Date(2022, 0, 1);
    end = new Date(2023, 0, 1);
    return new Date(
      start.getTime() + Math.random() * (end.getTime() - start.getTime())
    );
  };

  const fixDeliveryDates=async()=>{
      const orders=await Order.find({})
      for (const order of orders) {
          order.deliveryDeadline=randomDate()
          await order.save()
      }
  }


fixDeliveryDates().then(() => {
    console.log("seeding complete, closing connection");
    mongoose.connection.close();
  });