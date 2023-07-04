const catchAsync = require("./utils/catchAsync");
const Order = require("./models/order");
const mongoose = require("mongoose");

module.exports.isLoggedIn =
  (params = {}) =>
  (req, res, next) => {
    if (!req.isAuthenticated()) {
      // req.session.returnTo=req.originalUrl
      return res.status(401).json({
        status: "error",
        message:
          "Unauthentifizierte Anfrage. Sie müssen zuerst eingeloggt sein.",
      });
    }
    if (!params.noSubNeeded) {
      if (!req.session.subscription) {
        return res.status(403).json({
          status: "error",
          message:
            "Verbotene Anfrage. Sie benötigen ein Abonnement, um diese Aktion durchzuführen.",
        });
      }
    }

    next();
  };

module.exports.hasFertigerAbo = (req, res, next) => {
  if (req.session.subscription !== "Fertiger Abo") {
    return res.status(403).json({
      status: "error",
      message:
        "Verbotene Anfrage. Sie benötigen ein Fertiger Abo, um diese Aktion durchzuführen.",
    });
  }
  next();
};
module.exports.hasAbo = (aboName) => {
  return (req, res, next) => {
    if (aboName) {
      if (req.session.subscription !== aboName) {
        return res.status(403).json({
          status: "error",
          message: `Verbotene Anfrage. Sie benötigen ein ${aboName}, um diese Aktion durchzuführen.`,
        });
      }
    } else {
      return res.status(403).json({
        status: "error",
        message:
          "Verbotene Anfrage. Sie benötigen ein Abonnement, um diese Aktion durchzuführen.",
      });
    }
    next();
  };
};
// Orders
module.exports.isOrderOwner = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const order = await Order.findById(id);
  if (!order) {
    return res
      .status(404)
      .json({ status: "error", data: "Auftrag nicht gefunden" });
  }
  res.locals.order = order;
  if (order.company.toString() !== req.user.company.toString()) {
    return res.status(406).json({
      status: "error",
      code: 406,
      message:
        "Unbefugte Anfrage. Sie sind nicht der Eigentümer dieses Auftrags",
    });
  }
  return next();
});
//
// use to avoid cast error (confusing for the response)
module.exports.validateObjectId = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id) && id.toLowerCase() !== "my") {
    return res.status(400).json({
      status: "error",
      message:
        "Ungültige ID, bitte stellen Sie sicher, dass die ID korrekt ist und versuchen Sie es erneut.",
    });
  }
  return next();
});

// others
module.exports.lowerCaseEmail = (req, res, next) => {
  if (req.body.email) {
    req.body.email = req.body.email.toLowerCase();
  }
  next();
};
