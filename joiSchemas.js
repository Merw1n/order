const Joi = require("joi");
module.exports.orderSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  material: Joi.string().required(),
  technology: Joi.string().required(),
  certificate: Joi.string(),
  qty: Joi.number().required().min(0),
  deliveryDeadline: Joi.date().required(),
  offersDeadline: Joi.date().required(),
}).required();
module.exports.offerSchema = Joi.object({
  message: Joi.string(),
  price: Joi.number().required().min(0),
  deliveryDate: Joi.date().required().greater(Date.now()),
}).required();
module.exports.userSchema = Joi.object({
  fullName: Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
  }),
  email: Joi.string().required(),
  password: Joi.string().required(),
  creationDate: Joi.date().required(),
}).required();
module.exports.messageSchema = Joi.object({
  conversation: Joi.string().required(),
  type: Joi.string().required(),
  body: Joi.string().required(),
}).required();
