const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Company = require("../models/company");

const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    salutation: {
      type: String,
      required: true,
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
    },
    orders: [
      {
        type: Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
  },
  { timestamps: true }
);

userSchema.plugin(passportLocalMongoose, { usernameField: "email" });
module.exports = mongoose.model("User", userSchema);
