const mongoose = require("mongoose");
const Order = require("../models/order");
const Company = require("../models/company");
const User = require("../models/user");
const Offer = require("../models/offer");
const Notification = require("../models/notification");
require("dotenv").config();

const { deleteFile } = require("../helpers/filehelpers");

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

const deleteAllOrdersAndOffers = async () => {
  try {
    const orders = await Order.find({});
    orders.forEach(async (order) => {
      // if (order.offers) {
      //   try {
      //     orders.offers.forEach(async (offer) => {
      //       await Offer.findByIdAndDelete(offer._id);
      //       console.log("deleted offer", offer._id);
      //     });
      //   } catch (e) {
      //     console.log(e);
      //   }
      // }
      if (order.files) {
        try {
          order.files.forEach(async (file) => {
            await deleteFile(file.name);
            console.log("deleted file", file.name);
          });
        } catch (e) {
          console.log(e);
        }
      }

      await Order.deleteOne({ _id: order._id });
      console.log("deleted order", order._id);
    });
  } catch (e) {
    console.log(e);
  }
};

// const deleteAllOffers = async () => {
//   try {
//     const offers = await Offer.find({});
//     offers.forEach(async (offer) => {
//       if (offer.files) {
//         try {
//           offer.files.forEach(async (file) => {
//             await deleteFile(file.name);
//             console.log("deleted file", file.name);
//           });
//         } catch (e) {
//           console.log(e);
//         }
//       }
//       await Offer.findByIdAndDelete(offer._id);
//     });
//   } catch (e) {
//     console.log(e);
//   }
// };
// empties the orders array in all companies and users
// const cleanCompaniesAndUsers = async () => {
//   try {
//     const companies = await Company.find({});
//     companies.forEach(async (company) => {
//       company.orders = [];
//       await company.save();
//     });
//     const users = await User.find({});
//     users.forEach(async (user) => {
//       user.orders = [];
//       await user.save();
//     });
//   } catch (e) {
//     console.log(e);
//   }
// };

// adds a (random company) and user to orders, and adds the orders to the companies and user
// const addOrders = async () => {
//   try {
//     const companies = await Company.find({});
//     const orders = await Order.find({});
//     const randomCompany = () => {
//       return companies[Math.floor(Math.random() * companies.length)]._id;
//     };

//     for (i = 0; i < orders.length; i++) {
//       const order = orders[i];
//       order.company = randomCompany();
//       const company = order.company;
//       const foundCompany = await Company.findOne(company);
//       const user = await User.findOne({ company });
//       order.user = user;
//       await order.save();
//       foundCompany.orders.push(order);
//       user.orders.push(order);
//       await foundCompany.save();
//       await user.save();
//     }
//   } catch (e) {
//     console.log(e);
//   }
// };

// deletes companies that have no valid user
// const cleanCompanies = async () => {
//   try {
//     const companies = await Company.find({});
//     for (i = 0; i < companies.length; i++) {
//       const company = companies[i];
//       const user = await User.findOne({ company });
//       if (!user) {
//         const c = await Company.deleteOne(company);
//         console.log({ c: c.name });
//       }
//     }
//   } catch (e) {
//     console.log(e);
//   }
// };

// counts the number of orders in the orders array of each company/user
// const testCompanies = async () => {
//   try {
//     const companies = await User.find({});
//     let ordersCount = 0;
//     companies.forEach((company) => {
//       const count = company.orders.length;
//       ordersCount = ordersCount + count;
//     });
//     console.log(ordersCount);
//   } catch (e) {
//     console.log(e);
//   }
// };

// adds company names to Orders
// const addNames = async () => {
//   try {
//     const orders = await Order.find({}).populate("company");
//     orders.forEach(async (order) => {
//       order.companyName = order.company.name;
//       await order.save();
//     });
//   } catch (e) {
//     console.log(e);
//   }
// };
// const updateOrders = async () => {
//   try {
//     const orders = await Order.find({}).populate("company");
//     orders.forEach(async (order) => {
//       await Order.findByIdAndUpdate(order._id, { status: "published" });
//     });
//   } catch (e) {
//     console.log(e);
//   }
// };

// const updateIndustryRoles = async () => {
//   try {
//     const companies = await Company.find({});
//     companies.forEach(async (company) => {
//       const randNum = Math.random();
//       if (randNum > 0.5) {
//         company.industryRole = "Fertiger";
//       } else {
//         company.industryRole = "Einkäufer";
//       }
//       await company.save();
//     });
//   } catch (e) {
//     console.log(e);
//   }
// };

// const emptyNotifications = async () => {
//   try {
//     await Notification.deleteMany({});
//     console.log("done");
//   } catch (e) {
//     console.log(e);
//   }
// };

// const addTaxIds = async () => {
//   try {
//     const companies = await Company.find({});
//     companies.forEach(async (company) => {
//       if (!company.taxId) {
//         company.taxId = "DE123456789";
//         await company.save();
//       }
//     });
//   } catch (e) {
//     console.log(e);
//   }
// };

const verifyUsers = async () => {
  const res = await User.updateMany({}, { isVerified: true });
  console.log({ matched: res.matchedCount, modified: res.modifiedCount });
};

verifyUsers().then(() => {
  console.log("Done!");
});
