const nodemailer = require("nodemailer");
const Joi = require("joi");

const emailCredentials = {
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
};

const contactBodySchema = Joi.object({
  salutation: Joi.string().required().valid("Herr", "Frau"),
  name: Joi.string().required().max(70),
  email: Joi.string()
    .required()
    .email({ tlds: { allow: false } })
    .max(70),
  company: Joi.string().max(70),
  phoneNumber: Joi.string().max(70),
  message: Joi.string().required().max(5000),
  acceptedDataPolicy: Joi.boolean().required().valid(true),
});

const contact = {
  sendEmail: async (req, res) => {
    const {
      salutation,
      name,
      email,
      company,
      phoneNumber,
      message,
      acceptedDataPolicy,
    } = req.body;

    const { error } = contactBodySchema.validate({
      salutation,
      name,
      email,
      company,
      phoneNumber,
      message,
      acceptedDataPolicy,
    });
    if (error) {
      const msg = error.details.map((el) => el.message).join(",");
      return res.status(400).json({ status: "error", message: msg });
    }

    const smtpTransport = nodemailer.createTransport(emailCredentials);
    const mailOptions = {
      to: "kontakt@order-scout.com",
      from: "no-reply@order-scout.com",
      replyTo: email,
      subject: "Eine neue Nachricht vom Kontaktformular",
      text:
        `${phoneNumber ? `Rufnummer:${phoneNumber}\n` : ""}` +
        `${company ? `Firma:${company}\n` : ""}` +
        `${salutation} ${name} hat eine Nachricht geschickt.\n` +
        `Die Nachricht lautet wie folgt:\n` +
        `"${message}"`,
    };
    try {
      await smtpTransport.sendMail(mailOptions);
      return res.status(200).json({
        status: "success",
      });
    } catch (e) {
      return res.status(500).json({ status: "error", message: e });
    }
  },
};

module.exports = contact;
