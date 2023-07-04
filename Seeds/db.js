const mongoose = require("mongoose");
const Order = require("../models/order");

main().catch((err) => console.log(err));

async function main() {
  //   await mongoose.connect(
  //     "mongodb+srv://arisha:U0nAj4Wep6weYa39@cluster0.lgzaq.mongodb.net/OrderScout?retryWrites=true&w=majority"
  //   );
  await mongoose
    .createConnection(
      "mongodb+srv://arisha:U0nAj4Wep6weYa39@cluster0.lgzaq.mongodb.net/OrderScout?retryWrites=true&w=majority"
    )
    .asPromise();
  console.log(1);
  const orders = await Order.find();
  console.log(2);
  console.log(orders);
}
