const express = require("express");
const router = express.Router();

const catchAsync = require("../../utils/catchAsync");
const { orderSchema } = require("../../joiSchemas");
// const ExpressError = require("../../utils/ExpressError");
const {
  isLoggedIn,
  isOrderOwner,
  validateObjectId,
} = require("../../middleware");
const { upload } = require("../../helpers/filehelpers");

const order = require("../../controllers/orderController");

const validateOrder = (req, res, next) => {
  const { error } = orderSchema.validate(req.body);
  if (error) {
    const msg = error.details.map((el) => el.message).join(",");
    res
      .status(400)
      .json({ status: "error", message: "Validation Error" + msg });
  } else {
    next();
  }
};

// get all Orders or specific set of orders with a query
router.get("/", isLoggedIn(), catchAsync(order.findAll));

// Add an Order
router.post(
  "/",
  isLoggedIn(),
  upload.array("files"),
  validateOrder,
  catchAsync(order.addOne)
);

// test Route
// router.get(
//   "/test",
//   (req,res)=>{
//     global.io.emit("c")
//     console.log("EMITTED C FROM TEST ROUTE")
//     res.send("s")
//   }
// );

// Get Specific Order
router.get("/:id", isLoggedIn(), validateObjectId, catchAsync(order.getOne));

// Update Specific Order
router.put("/:id", isLoggedIn(), validateObjectId, catchAsync(order.updateOne));

// Delete Specific Order
router.delete(
  "/:id",
  isLoggedIn(),
  isOrderOwner,
  validateObjectId,
  catchAsync(order.deleteOne)
);

// Test Routes
// router.post(
//   "/test",
//   catchAsync(async (req, res, next) => {
//     console.log("hi");
//     res.send("hi");
//   })
// );

module.exports = router;
