const express = require("express");
const router = express.Router();

// ctrler
const offer = require("../../controllers/offerController");
const {
  isLoggedIn,
  validateObjectId,
  hasFertigerAbo,
} = require("../../middleware");
const { upload } = require("../../helpers/filehelpers");
const { offerSchema } = require("../../joiSchemas");

const catchAsync = require("../../utils/catchAsync");

const validateOffer = (req, res, next) => {
  const { error } = offerSchema.validate(req.body);
  if (error) {
    const msg = error.details.map((el) => el.message).join(",");
    // throw new ExpressError(msg, 400);
    res.status(400).json({ status: "error", message: msg });
  } else {
    next();
  }
};

// Create Offer
router.post(
  "/order/:id",
  isLoggedIn(),
  hasFertigerAbo,
  validateObjectId,
  upload.array("files"),
  validateOffer,
  catchAsync(offer.addOne)
);

// Read Offers
router.get("/", isLoggedIn(), catchAsync(offer.findAll));

// Read specific offer
router.get(
  "/:id", //offerId
  isLoggedIn(),
  validateObjectId,
  catchAsync(offer.findOne)
);

router.put(
  "/offer/:id",
  isLoggedIn(),
  validateObjectId,
  catchAsync(offer.updateOffer)
);

// accept & reject offers
router.patch(
  "/:id", //offerId
  isLoggedIn(),
  validateObjectId,
  catchAsync(offer.updateResponse)
);

// Delete all
// router.delete('/',catchAsync(async(req,res)=>{
//   const offers=await Offer.deleteMany({})
//   res.send("deleted")

// }))

// TestRoute
// router.get('/', catchAsync(async (req, res) => {
//   const offers = await Offer.find({})
//   if (!offers) {
//     return res.status(400).json({ status: "error", message: "No offers were found" })
//   }
//   return res.json({ status: "success", data: { offers } })
// }))

module.exports = router;
