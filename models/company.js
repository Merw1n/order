const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const User = require("./user");
const Order = require("./order");

const CompanySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    users: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    orders: [
      {
        type: Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
    notifications: [
      {
        type: Schema.Types.ObjectId,
        ref: "Notification",
      },
    ],

    address: {
      street: {
        streetName: {
          type: String,
          required: true,
        },
        streetNum: {
          type: Number,
          required: true,
        },
      },
      zip: {
        type: Number,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      province: {
        type: String,
      },
      country: {
        type: String,
        enum: {
          values: ["Deutschland", "Österreich", "Schweiz (die)"],
          message: "{VALUE} ist nicht unterstützt",
        },
        required: true,
      },
      geometry: {
        type: {
          type: String,
          enum: ["Point"],
        },
        coordinates: {
          type: [Number],
        },
      },
    },
    industryRole: {
      type: String,
      required: true,
    },
    website: {
      type: String,
    },
    phoneNumber: {
      type: String,
    },
    faxNumber: {
      type: String,
    },
    logo: {
      type: {
        name: {
          type: String,
          required: true,
        },
        format: {
          type: String,
          required: true,
        },
        originalName: {
          type: String,
          required: true,
        },
        size: {
          type: String,
          required: true,
        },
      },
      required: false,
    },
    foundationYear: {
      type: Number,
    },
    employeesQty: {
      type: String,
    },
    taxId: {
      type: String,
      required: true,
    },
    stripeId: {
      type: String,
    },
    purchases: [
      {
        id: String,
        object: String,
        name: String,
        createdAt: Date,
        currentPeriodEnd: Date,
        status: String,
      },
    ],
  },
  { timestamps: true }
);
CompanySchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    await User.deleteMany({
      _id: {
        $in: doc.users,
      },
    });
    await Order.deleteMany({
      _id: {
        $in: doc.orders,
      },
    });
  }
});
module.exports = mongoose.model("Company", CompanySchema);
