const router = require("express").Router();

const { isLoggedIn } = require("../../middleware");
const catchAsync = require("../../utils/catchAsync");
const conversation = require("../../controllers/conversationController");

//new conv

router.post("/", isLoggedIn(), catchAsync(conversation.createOne));

//get conv of a user

router.get("/:userId", isLoggedIn(), catchAsync(conversation.getOneUserAll));

// get conv includes two userId

// router.get("/find/:firstUserId/:secondUserId", async (req, res) => {
//   try {
//     const conversation = await Conversation.findOne({
//       members: { $all: [req.params.firstUserId, req.params.secondUserId] },
//     });
//     res.status(200).json(conversation);
//   } catch (err) {
//     res.status(500).json(err);
//   }
// });

module.exports = router;
