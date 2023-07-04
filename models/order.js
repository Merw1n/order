const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Offer = require("./offer");
// const User = require("./user");
// const Company = require("./company");

const OrderSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["published", "allocated", "archived", "expired"],
      default: "published",
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    offersDeadline: {
      type: Date,
      required: true,
    },
    deliveryDeadline: {
      type: Date,
      required: true,
    },
    material: {
      type: String,
      required: true,
    },
    technology: {
      type: String,
      required: true,
    },
    certificate: {
      type: String,
    },
    qty: {
      type: Number,
      required: true,
    },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    company: { type: Schema.Types.ObjectId, ref: "Company" },
    companyName: {
      type: String,
    },
    files: [
      {
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
    ],
    offers: [
      {
        type: Schema.Types.ObjectId,
        ref: "Offer",
      },
    ],
  },
  { timestamps: true }
);
OrderSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    await Offer.deleteMany({
      _id: {
        $in: doc.offers,
      },
    });
  }
});
module.exports = mongoose.model("Order", OrderSchema);
