const fileSizeFormatter = require("../utils/fileSizeFormatter");

// models
const Order = require("../models/order");
const Offer = require("../models/offer");
const Company = require("../models/company");

const { addNotification } = require("../helpers/notificationhelpers");

module.exports = {
  addOne: async (req, res) => {
    // accept only requests from Fertiger
    const { industryRole } = await Company.findById(req.user.company);
    if (industryRole !== "Fertiger") {
      return res.status(403).json({
        status: "error",
        message: "Verboten. Dieser Service ist nur für Fertiger verfügbar.",
      });
    }
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
    // get order
    const { id: orderID } = req.params;
    const order = await Order.findById(orderID);
    if (!order) {
      return res.status(400).json({
        status: "error",
        message: "Dieser Auftrag konnte nicht gefunden werden.",
      });
    }
    if (order.status !== "published") {
      return res.status(400).json({
        status: "error",
        message: "Dieser Auftrag ist nicht offen für Angebote.",
      });
    }
    // validate if user is the owner of the order
    if (order.company == req.user.company) {
      return res.status(400).json({
        status: "error",
        message: "Sie können kein Angebot an Ihre eigenen Aufträge senden.",
      });
    }
    if (order.offersDeadline < Date.now()) {
      return res.json({
        status: "error",
        message: "Die Angebotsfrist ist bereits abgelaufen.",
      });
    }
    // attach order, user, company, receviningCompany, and files to body
    req.body.order = order;
    req.body.user = req.user._id;
    req.body.company = req.user.company;
    req.body.receivingCompany = order.company;
    req.body.files = filesArray;
    req.body.status = "active";
    // create offer from the body
    const offer = new Offer(req.body);
    await offer.save();
    // attach offer to order. Save offer, and order.
    order.offers = [...order.offers, offer._id];
    await order.save();
    // send notification to receiving company
    const { name: companyName } = await Company.findById(req.user.company);
    const notificationBody = {
      type: "new_offer",
      info: {
        actorName: companyName,
        orderTitle: order.title,
      },
      entityId: offer._id,
      actor: offer.company,
      notifier: offer.receivingCompany,
    };
    await addNotification(notificationBody, order.company);
    //
    return res.json({ status: "success" });
  },

  //---------------------------------------------------------------------------//

  findAll: async (req, res) => {
    const trimOffers = (offers) =>
      offers.map((offer) => ({
        _id: offer._id,
        price: offer.price,
        deliveryDate: offer.deliveryDate,
        status: offer.status,
        createdAt: offer.createdAt,
        order: {
          title: offer.order.title,
        },
        receivingCompany: {
          name: offer.receivingCompany.name,
        },
        company: {
          name: offer.company.name,
        },
      }));
    // all sent
    if (req.query.company) {
      if (req.query.receivingCompany) {
        return res.status(400).json({
          status: "error",
          message:
            "Ungültige Anfrage. Abfrage nach Firma und Empfängerfirma nicht möglich.",
        });
      }
      const { company } = req.query;
      if (req.user.company.toString() !== company) {
        return res
          .status(403)
          .json({ status: "error", message: "Unbefugte Anfrage" });
      }
      const offers = await Offer.find({ company }).populate([
        "order",
        "receivingCompany",
      ]);

      const trimmedOffers = trimOffers(offers);
      return res.json({ status: "success", data: { offers: trimmedOffers } });
    }
    // all received
    if (req.query.receivingCompany) {
      const { receivingCompany } = req.query;
      if (req.user.company.toString() !== receivingCompany) {
        return res
          .status(403)
          .json({ status: "error", message: "Unbefugte Anfrage" });
      }
      const offers = await Offer.find({ receivingCompany }).populate([
        "order",
        "company",
      ]);
      // const trimmedOffers = trimOffers(offers);
      const currentDate = new Date();
      const trimmedOffers = trimOffers(
        await Promise.all(
          offers.map(async (offer) => {
            if (
              offer.deliveryDate < currentDate &&
              offer.status !== "expired"
            ) {
              await updateOffer({
                id: offer._id,
                status: "expired",
                updatedAt: new Date(),
              });
            } else if (
              offer.deliveryDate >= currentDate &&
              offer.status === "expired"
            ) {
              await updateOffer({
                id: offer._id,
                status: "active",
                updatedAt: new Date(),
              });
            }
            return offer;
          })
        )
      );

      return res.json({ status: "success", data: { offers: trimmedOffers } });
    }
    return res
      .status(400)
      .json({ status: "error", message: "schlechte Anfrage" });
  },
  //  ------------------------------------------------------------------//
  findOne: async (req, res) => {
    const { id: offerId } = req.params;
    const offer = await Offer.findById(offerId).populate([
      "order",
      "company",
      "receivingCompany",
    ]);

    if (!offer) {
      return res.json({
        status: "error",
        message: "Ungültige Angebots-ID. Es wurde kein Angebot gefunden",
      });
    }

    if (
      !(
        req.user.company.toString() === offer.company._id.toString() ||
        req.user.company.toString() === offer.receivingCompany._id.toString()
      )
    ) {
      return res
        .status(403)
        .json({ status: "error", message: "Unbefugte Anfrage" });
    }

    const trimmedOffer = {
      _id: offer._id,
      status: offer.status,
      price: offer.price,
      deliveryDate: offer.deliveryDate,
      message: offer.message,
      files: offer.files,
      order: {
        _id: offer.order._id,
        offersDeadline: offer.order.offersDeadline,
        deliveryDeadline: offer.order.deliveryDeadline,
        qty: offer.order.qty,
        title: offer.order.title,
      },
      company: {
        _id: offer.company._id,
        name: offer.company.name,
        phoneNumber: offer.company.phoneNumber,
        website: offer.company.website,
        logo: offer.company.logo,
      },
      receivingCompany: {
        _id: offer.receivingCompany._id,
        name: offer.receivingCompany.name,
        phoneNumber: offer.receivingCompany.phoneNumber,
        website: offer.receivingCompany.website,
        logo: offer.receivingCompany.logo,
      },
    };
    return res.json({ status: "success", data: { offer: trimmedOffer } });
  },

  updateOffer: async (req, res) => {
    const { id } = req.params;
    const updateFields = req.body;
    updateFields.updatedAt = new Date();

    try {
      const order = await Offer.findByIdAndUpdate({ _id: id }, updateFields, {
        new: true,
        runValidators: true,
      }).populate(["order", "receivingCompany"]);

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
  //   ------------------Accept And Reject Offers----------------------------//
  updateResponse: async (req, res) => {
    const { id: offerId } = req.params;
    const offer = await Offer.findById(offerId).populate([
      "order",
      "receivingCompany",
    ]);

    // validation
    if (!offer) {
      return res.status(400).json({
        status: "error",
        message:
          "Angebot nicht gefunden. Bitte stellen Sie sicher, dass die ID korrekt ist.",
      });
    }
    if (offer.receivingCompany._id.toString() !== req.user.company.toString()) {
      return res
        .status(403)
        .json({ status: "error", message: "Unbefugte Anfrage" });
    }

    if (offer.status !== "open") {
      return res.status(400).json({
        status: "error",
        message: "Über dieses Angebot wurde bereits entschieden.",
      });
    }

    //checking the status of the request
    if (req.body.status === "rejected") {
      offer.status = "rejected";
      await offer.save();
      return res.json({ status: "success" });
    } else if (req.body.status === "accepted") {
      offer.status = "accepted";
      await offer.save();

      const notificationBody = {
        type: "offer_accepted",
        entityId: offer._id,
        info: {
          actorName: offer.receivingCompany.name,
          orderTitle: offer.order.title,
        },
        actor: req.user.company,
        notifier: offer.company,
      };

      addNotification(notificationBody, offer.company);

      const otherOffers = await Offer.find({
        receivingCompany: req.user.company,
        order: offer.order,
        _id: { $ne: offerId },
      });
      otherOffers.forEach(async (otherOffer) => {
        otherOffer.status = "rejected";
        await otherOffer.save();
      });
      await Order.findByIdAndUpdate(offer.order, { status: "allocated" });
      return res.json({ status: "success" });
    } else {
      return res
        .status(400)
        .json({ status: "error", message: "Ungültige Anfrage" });
    }
  },
};
