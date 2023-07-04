const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const OfferSchema = new Schema(
  {
    message: {
      type: String,
    },
    deliveryDate: {
      type: Date,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "rejected", "accepted", "archived"],
      default: "open",
    },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    company: { type: Schema.Types.ObjectId, ref: "Company" },
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    receivingCompany: { type: Schema.Types.ObjectId, ref: "Company" },
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
    status: {
      type: String,
      enum: ["active", "expired"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Offer", OfferSchema);
