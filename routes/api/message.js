const router = require("express").Router();

const { isLoggedIn } = require("../../middleware");
const catchAsync = require("../../utils/catchAsync");
const message = require("../../controllers/messageController");
const { messageSchema } = require("../../joiSchemas");
const { validateObjectId } = require("../../middleware");

const validateMessage = (req, res, next) => {
  const { error } = messageSchema.validate(req.body);
  if (error) {
    const msg = error.details.map((el) => el.message).join(",");
    // throw new ExpressError(msg, 400);
    res.status(400).json({ status: "error", message: msg });
  } else {
    next();
  }
};

//add

router.post("/", isLoggedIn(), validateMessage, catchAsync(message.addOne));

//get

router.get(
  "/:id",
  isLoggedIn(),
  validateObjectId,
  catchAsync(message.getConversationAllMessages)
);

module.exports = router;
