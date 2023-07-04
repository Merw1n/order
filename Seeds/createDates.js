const Company = require("../models/company");
const Order = require("../models/order");
const mongoose = require("mongoose");

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
  start = new Date(2001, 0, 1);
  end = new Date();
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
};

const findCompanies = async () => {
  try {
    const companies = await Order.find({});
    // // company.createdAt = randomDate();
    // // await company.save();
    // console.log(company);
    console.log(companies.length);
    for (i = 0; i < companies.length; i++) {
      companies[i].createdAt = randomDate();
      await companies[i].save();
      console.log(companies[i].createdAt);
    }
  } catch (e) {
    console.log(e);
  }
};
findCompanies().then(() => {
  console.log("Done!");
  //   mongoose.connection.close();
});
