const mongoose = require("mongoose");
const Order = require("../models/order");
const Offer = require("../models/offer");
const User = require("../models/user");
const Company = require("../models/company");
const { materials, technologies, certificates } = require("../fixedInput");
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

const arrRand = function (arr) {
  let r = Math.floor(arr.length * Math.random());
  return arr[r];
};

const randomDate = function (start, end) {
  start = new Date(2001, 0, 1);
  end = new Date();
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
};
const alphabet = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
];
const seedDB = async () => {
  const start = new Date("1/1/2020");
  const end = new Date("5/5/2020");
  await Order.deleteMany({});
  await Offer.deleteMany({});
  await User.deleteMany({});
  await Company.deleteMany({});
  for (let i = 0; i < 20; i++) {
    const o = new Order({
      title: `Order ${arrRand(alphabet) + arrRand(alphabet)}`,
      description:
        "Lorem ipsum dolor sit amet consectetur adipisicing elit. Quidem quibusdam, ducimus voluptas reprehenderit debitis porro illo.",
      qty: Math.floor(Math.random() * 70) + 1,
      material: arrRand(materials),
      technology: arrRand(technologies),
      certificate: arrRand(certificates),
      deliveryDeadline: randomDate(),
      offersDeadline: randomDate(),
      creationDate: new Date(),
    });
    await o.save();
    console.log(o);
  }
};
seedDB().then(() => {
  console.log("seeding complete, closing connection");
  mongoose.connection.close();
});
