const Order = require("../models/order");
const User = require("../models/user");
const Company = require("../models/company");
const fileSizeFormatter = require("../utils/fileSizeFormatter");
const { deleteFile } = require("../helpers/filehelpers");

const order = {
  getOne: async (req, res) => {
    const { id } = req.params;
    const order = await Order.findById(id).populate(["company", "offers"]);
    if (!order) {
      return res.status(404).json({
        status: "error",
        message: "Dieser Auftrag konnte nicht gefunden werden.",
      });
    }

    // counts the offers sent to this order by the requesting company
    const sentOffersCount = order.offers.filter(
      (offer) => offer.company.toString() === req.user.company.toString()
    ).length;

    const formattedOrder = {
      ...order._doc,
      address: `${order.company.address.street.streetName} ${order.company.address.street.streetNum},${order.company.address.city},${order.company.address.country}`,
      geometry: order.company.address.geometry.coordinates,
      company: order.company._id,
      offers: null,
      hasSentOffer: Boolean(sentOffersCount),
    };
    return res
      .status(200)
      .json({ status: "success", data: { order: formattedOrder } });
  },

  // -----------------------------------------------------------

  findAll: async (req, res) => {
    const { industryRole } = await Company.findById(req.user.company);

    // Allow only manuf and "orders/my" requests
    if (
      industryRole !== "Fertiger" &&
      req.query.company !== req.user.company.toString()
    ) {
      return res.status(403).json({
        status: "error",
        message: "Verboten. Dieser Service ist nur für Fertiger verfügbar.",
      });
    }

    const orders = await Order.find(req.query).populate("company");

    const currentDate = new Date();
    const formattedOrders = await Promise.all(
      orders.map(async (order) => {
        if (
          order.offersDeadline &&
          order.offersDeadline < currentDate &&
          order.status !== "expired"
        ) {
          await Order.findByIdAndUpdate(
            order._id,
            { status: "expired", updatedAt: new Date() },
            {
              new: true,
              runValidators: true,
            }
          ).populate(["company", "offers"]);
        } else if (
          order.offersDeadline &&
          order.offersDeadline >= currentDate &&
          order.status !== "published"
        ) {
          await Order.findByIdAndUpdate(
            order._id,
            { status: "published", updatedAt: new Date() },
            {
              new: true,
              runValidators: true,
            }
          ).populate(["company", "offers"]);
        }

        return {
          ...order._doc,
          geometry: order.company.address.geometry.coordinates,
          company: order.company._id,
          offers: null,
        };
      })
    );

    if (orders) {
      return res.json({ status: "success", orders: formattedOrders });
    }
  },

  // --------------------------------
  // --------------------------------
  // --------------------------------
  addOne: async (req, res, next) => {
    // fill filesArray with files
    let filesArray = [];
    if (req.files) {
      if (req.files.length > 4) {
        return res.status(400).json({
          status: "error",
          message:
            "Zu viele Dateien. Die maximal zulässige Anzahl von Dateien beträgt 4 Dateien.",
        });
      }
      req.files.forEach((element) => {
        if (element.size > 25 * 1024 * 1024) {
          return res.status(400).json({
            status: "error",
            message:
              "Zu große Datei. Die maximale Dateigröße beträgt 25 MB pro Datei.",
          });
        }
        const file = {
          name: element.key,
          format: element.mimetype,
          originalName: element.originalname,
          size: fileSizeFormatter(element.size, 2),
        };
        filesArray.push(file);
      });
    }

    // get IDs
    const user = req.user;
    const company = req.user.company;
    let foundUser = null;
    let foundCompany = null;
    try {
      // find db docs
      foundUser = await User.findById(user);
      foundCompany = await Company.findById(company);
    } catch (e) {
      next(e);
    }
    const { name: companyName } = foundCompany;
    // create Order doc from body and add company,user, files to body
    const order = new Order(req.body);
    order.files = filesArray;
    order.user = user._id;
    order.company = company;
    order.companyName = companyName;
    order.status = "published";

    // add order to company and user
    foundCompany.orders.push(order);
    foundUser.orders.push(order);
    // save docs
    try {
      await order.save();
      await foundCompany.save();
      await foundUser.save();
    } catch (e) {
      next(e);
    }
    return res.json({
      status: "success",
      data: { order: { _id: order._id } },
    });
  },
  //
  //
  //
  updateOne: async (req, res) => {
    const { id } = req.params;
    const updateFields = req.body;
    updateFields.updatedAt = new Date();

    try {
      const order = await Order.findByIdAndUpdate(id, updateFields, {
        new: true,
        runValidators: true,
      }).populate(["company", "offers"]);

      if (!order) {
        return res.status(404).json({
          status: "error",
          message: "Dieser Auftrag konnte nicht gefunden werden.",
        });
      }

      return res.status(200).json({
        status: "success",
        data: { order },
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Beim Aktualisieren des Auftrags ist ein Fehler aufgetreten.",
      });
    }
  },
  //
  //
  //
  deleteOne: async (req, res) => {
    const order = res.locals.order;
    // order coming from isOrderOwner middleware.
    if (!order) {
      return res.status(404).json({
        status: "error",
        message: "Dieser Auftrag konnte nicht gefunden werden.",
      });
    }
    if (order.files) {
      const files = order.files;
      files.forEach(async (file) => {
        await deleteFile(file.name);
      });
    }
    await Order.findByIdAndDelete(order._id);

    // removes order from user orders list
    const user = await User.findById(order.user);
    user.orders = user.orders.filter((el) => el != order._id.toString());
    // removes order from company orders list
    const company = await Company.findById(order.company);
    company.orders = company.orders.filter((el) => el != order._id.toString());
    await user.save();
    await company.save();
    return res.status(200).json({
      status: "success",
    });
  },
};

module.exports = order;
