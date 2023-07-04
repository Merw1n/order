const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["new_offer", "offer_accepted"],
      required: true,
    },
    entityId: {
      type: String,
      required: true,
    },
    info: { type: Object, required: true },
    readDate: { type: Date, default: null },
    actor: { type: Schema.Types.ObjectId, ref: "Company" },
    notifier: [{ type: Schema.Types.ObjectId, ref: "Company" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
