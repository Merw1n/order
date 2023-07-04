const passport = require("passport");
const nodemailer = require("nodemailer");
const fs = require("fs");
const Joi = require("joi");
const crypto = require("crypto");
// const stripe = require("stripe")(process.env.STRIPE_KEY);

const Company = require("../models/company");
const User = require("../models/user");
const fileSizeFormatter = require("../utils/fileSizeFormatter");
// const geoCoder = require("../helpers/geoCoder");
const axios = require("axios");
// const company = require("../models/company");
const { checkAbo } = require("../helpers/subscription");
// const company = require("../models/company");

const verifyEmailContent = require("../helpers/emailsContent/verifyEmail");
const changePassEmailContent = require("../helpers/emailsContent/changePass");
const passChangedEmailContent = require("../helpers/emailsContent/passChanged");

const geoCoderResponse = async (address) => {
  try {
    const response = await axios({
      method: "get",
      url: "https://maps.googleapis.com/maps/api/geocode/json",
      params: {
        address: address,
        //   `${cStreetName} ${cStreetNum}, ${cZip} ${cCity},${cProvince}, ${cCountry}`
        key: process.env.GOOGLE_KEY,
      },
    });
    if (response.data.status === "OK") {
      return response.data.results[0].geometry.location;
    }
    return response.data;
  } catch (e) {
    return e;
  }
};

const companySchema = Joi.object({
  name: Joi.string().required(),
  address: Joi.object({
    street: Joi.object({
      streetName: Joi.string().required(),
      streetNum: Joi.number().required(),
    }),
    zip: Joi.number().required(),
    city: Joi.string().required(),
    province: Joi.string().allow("", null),
    country: Joi.string().required(),
    geometry: Joi.object({
      type: Joi.string(),
      coordinates: Joi.array().items(Joi.number().required()),
    }),
  }),
  website: Joi.string().allow("", null),
  phoneNumber: Joi.string().allow("", null),
  faxNumber: Joi.string().allow("", null),
  taxId: Joi.string().required(),
  industryRole: Joi.string().required(),
  logo: Joi.object({
    name: Joi.string().required(),
    format: Joi.string().required(),
    originalName: Joi.string().required(),
    size: Joi.string().required(),
  }),
});
const userSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  salutation: Joi.string().required(),
  email: Joi.string().email().required(),
});

const emailCredentials = {
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
};

const user = {
  registerUserandCompany: async (req, res, next) => {
    // check for registeration code
    // if (req.body.registerationCode?.toUpperCase() !== "OS101") {
    //   return res.status(400).json({
    //     status: "error",
    //     message:
    //       "Falscher Registrierungscode. Wenn Sie noch keinen haben und sich registrieren lassen möchten, kontaktieren Sie uns bitte.",
    //   });
    // }
    //
    if (!req.body.origin) {
      return res.status(400).json({ status: "error", message: "Origin fehlt" });
    }
    const origin = req.body.origin;
    // Format Bodies
    const userBody = {
      email: req.body.uEmail.toLowerCase(),
      firstName: req.body.uFirstName,
      lastName: req.body.uLastName,
      salutation: req.body.uSalutation,
    };
    const {
      cName,
      cStreetName,
      cStreetNum,
      cZip,
      cCity,
      cCountry,
      cIndustryRole,
      cProvince,
      cPhoneNumber,
      cFaxNumber,
      cWebsite,
      cTaxId,
    } = req.body;
    const logo = req.file;
    const formattedAddress = `${cStreetName} ${cStreetNum}, ${cZip} ${cCity},${cProvince}, ${cCountry}`;
    const geoData = await geoCoderResponse(formattedAddress);
    if (!geoData.lat || !geoData.lng) {
      return res.status(400).json({
        status: "error",
        message:
          "Es ist ein Fehler bei der Überprüfung der Adresse aufgetreten. Bitte stellen Sie sicher, dass die Adressdaten korrekt sind, und versuchen Sie es später noch einmal.",
      });
    }
    const companyBody = {
      name: cName,
      address: {
        street: {
          streetName: cStreetName,
          streetNum: cStreetNum,
        },
        zip: cZip,
        city: cCity,
        province: cProvince,
        country: cCountry,
        geometry: {
          type: "Point",
          coordinates: [geoData.lng, geoData.lat],
        },
      },
      industryRole: cIndustryRole,
      website: cWebsite,
      phoneNumber: cPhoneNumber,
      faxNumber: cFaxNumber,
      taxId: cTaxId,
    };
    // validate and attach logo to company body
    if (logo) {
      if (logo.size > 4 * 1024 * 1024) {
        return res.status(400).json({
          status: "error",
          message:
            "Die Datei ist zu groß. Die maximale Dateigröße beträgt 4 MB.",
        });
      }
      companyBody.logo = {
        name: logo.key,
        format: logo.mimetype,
        originalName: logo.originalname,
        size: fileSizeFormatter(logo.size, 2),
      };
    }

    // validate for existing users or companies
    try {
      const existingUser = await User.findOne({
        email: req.body.uEmail.toLowerCase(),
      });
      const existingCompany = await Company.findOne({
        name: cName,
        "address.zip": cZip,
        // "address.city": cCity,
      });
      if (existingUser) {
        return res.status(400).json({
          status: "error",
          message: "Ein Benutzer mit der angegebenen E-Mail existiert bereits.",
        });
      } else if (existingCompany) {
        return res.status(400).json({
          status: "error",
          message:
            "Ein Unternehmen mit diesem Namen und dieser Postleitzahl ist bereits registriert",
        });
      }
    } catch (e) {
      return next(e);
    }
    // validate company & user body
    const { error: cError } = companySchema.validate(companyBody);
    if (cError) {
      const msg = cError.details.map((el) => el.message).join(",");
      return res.status(400).json({ status: "error", message: msg });
    }
    const { error: uError } = userSchema.validate(userBody);
    if (uError) {
      const msg = uError.details.map((el) => el.message).join(",");
      return res.status(400).json({ status: "error", message: msg });
    }
    if (!req.body.uPassword.match(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/)) {
      res.status(400).json({
        status: "error",
        message:
          "Ihr Passwort muss 6-20 Zeichen, mindestens einen Großbuchstaben, mindestens einen Kleinbuchstaben, und mindestens eine Ziffer enthalten.",
      });
    }

    //
    const token = crypto.randomBytes(20).toString("hex");
    // const host = req.header("x-forwarded-host");

    // create a new company and user, and
    const company = new Company(companyBody);
    const user = new User(userBody);
    company.users.push(user);
    user.company = company;
    user.verificationToken = token;
    await company.save();
    await User.register(user, req.body.uPassword);
    // verifyUser
    const smtpTransport = nodemailer.createTransport(emailCredentials);
    const mailOptions = {
      to: user.email.toLowerCase(),
      from: "no-reply@order-scout.com",
      subject: "Order-Scout E-Mail Adresse verifizieren",
      // text:
      //   "Willkommen bei Order-Scout. \n\n" +
      //   "Bitte klicken Sie auf den folgenden Link, um Ihre E-Mail-Adresse zu verifizieren.\n" +
      //   `${origin}/verify/${token}`,
      html: verifyEmailContent(origin, token),
      attachments: [
        {
          filename: "logo.svg",
          content: fs.createReadStream("./assets/logo-norm.svg"),
          cid: "no-reply@order-scout.com",
        },
      ],
    };
    await smtpTransport.sendMail(mailOptions);
    // logs user in.
    req.login(user, (e) => {
      if (e) {
        return res.status(500).json({ status: "error", message: e });
      }
    });
    return res.json({
      status: "success",
      data: {
        user: {
          _id: user._id,
          isVerified: user.isVerified,
          company: user.company,
          subscription: null,
        },
      },
    });
  },
  // ----------------------------------end of registerUserandCompany--------------------------------------------

  //

  //-----------------------------------------login------------------------------
  login: (req, res, next) => {
    passport.authenticate("local", async (err, user, info) => {
      if (err) {
        return next(err); // will generate a 500 error
      }
      // Generate a JSON response reflecting authentication status
      if (!user) {
        return res.status(401).json({
          status: "error",
          message: "Passwort oder E-Mail-Adresse ist falsch",
        });
      }
      // ***********************************************************************
      // Note that authenticate() is called from within the route handler,
      //  rather than being used as route middleware.
      // This gives the callback access to the req and res objects through closure.

      // If authentication failed, user will be set to false. If an exception occurred,
      // err will be set. An optional info argument will be passed,
      // containing additional details provided by the strategy's verify callback.

      // The callback can use the arguments supplied to handle the authentication result as desired.
      // Note that when using a custom callback, it becomes the application's responsibility
      // to establish a session (by calling req.login()) and send a response.
      // Source: https://www.passportjs.org/docs/authenticate/
      // ***********************************************************************
      await user.populate("company");
      // TODO: handle /Validate for the case of stripe is offline
      const subscription = await checkAbo(user.company, req);
      //
      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        return res.json({
          status: "success",
          data: {
            user: {
              _id: user._id,
              isVerified: user.isVerified,
              company: user.company,
              subscription,
            },
          },
        });
      });
    })(req, res, next);
  },
  //------------------------------end of login---------------------------------------

  //

  //checks if email is in use
  // emailInUse: async (req, res) => {
  //   if (req.query) {
  //     const { email } = req.query;
  //     email = email.toLowerCase();
  //     const user = await User.findOne({ email });
  //     if (user) {
  //       return res.send(true);
  //     } else {
  //       return res.send(false);
  //     }
  //   }
  // },

  //---------------------------Get Current User---------------------------------------

  getCurrent: async (req, res) => {
    if (req.user) {
      const user = await User.findById(req.user._id).populate("company");
      return res.status(200).json({
        status: "success",
        data: {
          user: {
            _id: user._id,
            isVerified: user.isVerified,
            company: user.company,
            subscription: req.session.subscription || null,
          },
        },
      });
    }
    res
      .status(401)
      .json({ status: "error", message: "Unauthentifizierte Anfrage" });
  },
  // ---------------------------end of get current user----------------------

  //

  // reset password request: takes email from req & creates a forgotpassword token for a user and sends it via email
  forgotPW: async (req, res) => {
    if (!req.body.origin) {
      return res.status(400).json({ status: "error", message: "Origin fehlt" });
    }
    const origin = req.body.origin;
    // const host = req.header("x-forwarded-host");
    // creates a random 20 byte token
    const token = crypto.randomBytes(20).toString("hex");
    if (typeof req.body.email !== "string") {
      return res
        .status(400)
        .json({ status: "error", message: "E-Mail muss ein String sein." });
    }
    // find the user by email and token to it.
    const user = await User.findOne({ email: req.body.email.toLowerCase() });
    if (!user) {
      return res.status(400).json({
        status: "error",
        message: "Ein Benutzer mit dieser E-Mail-Adresse existiert nicht.",
      });
    }
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    try {
      await user.save();
    } catch (e) {
      return res.status(500).json({ status: "error", message: e });
    }
    // send an email to the user with the reset link
    const smtpTransport = nodemailer.createTransport(emailCredentials);
    const mailOptions = {
      to: user.email.toLowerCase(),
      from: "no-reply@order-scout.com",
      subject: "Order-Scout Konto Passwort Zurücksetzen",
      // text:
      //   "Sie erhalten diese Nachricht, weil Sie (oder eine andere Person) das Zurücksetzen des Passworts für Ihr Konto beantragt haben.\n\n" +
      //   "Bitte klicken Sie auf den folgenden Link, oder fügen Sie diesen in Ihren Browser ein, um den Vorgang abzuschließen:\n\n" +
      //   origin +
      //   "/reset/" +
      //   token +
      //   "\n\n" +
      //   "Wenn Sie dies nicht angefordert  haben, ignorieren Sie bitte diese E-Mail und Ihr Passwort bleibt unverändert.\n",
      html: changePassEmailContent(origin, token),
      attachments: [
        {
          filename: "logo.svg",
          content: fs.createReadStream("./assets/logo-norm.svg"),
          cid: "no-reply@order-scout.com",
        },
      ],
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
  // --------------------------------end of forgotPW-------------------------------------------------

  resetPW: async (req, res) => {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    }).populate("company");
    if (!user) {
      return res.status(400).json({
        status: "error",
        message:
          "Das Token zum Zurücksetzen des Passworts ist ungültig oder abgelaufen.",
      });
    }

    if (!req.body.password?.match(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/)) {
      return res.status(400).json({
        status: "error",
        message:
          "Ihr Passwort muss 6-20 Zeichen, mindestens einen Großbuchstaben, mindestens einen Kleinbuchstaben, und mindestens eine Ziffer enthalten.",
      });
    }
    if (req.body.password !== req.body.confirm) {
      return res.status(400).json({
        status: "error",
        message: "Die Passwörter stimmen nicht überein.",
      });
    }
    const passSchema = Joi.object({
      password: Joi.string().required(),
      confirm: Joi.string().required(),
    });
    const { error: joiError } = passSchema.validate({
      password: req.body.password,
      confirm: req.body.confirm,
    });
    if (joiError) {
      const msg = joiError.details.map((el) => el.message).join(",");
      return res.status(400).json({
        status: "error",
        message: msg,
      });
    }
    await user.setPassword(req.body.password);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    await req.login(user, (e) => {
      if (e) {
        return res.status(500).json({ status: "error", message: e });
      }
    });
    const smtpTransport = nodemailer.createTransport(emailCredentials);
    const mailOptions = {
      to: user.email.toLowerCase(),
      from: "no-reply@order-scout.com",
      subject: "Ihr Passwort wurde geändert",
      // text:
      //   "Hallo,\n\n" +
      //   "Dies ist eine Bestätigung, dass das Passwort für Ihr Konto " +
      //   user.email +
      //   " ist gerade geändert worden.\n",
      html: passChangedEmailContent(user.email),
      attachments: [
        {
          filename: "logo.svg",
          content: fs.createReadStream("./assets/logo-norm.svg"),
          cid: "no-reply@order-scout.com",
        },
      ],
    };
    await smtpTransport.sendMail(mailOptions);
    const subscription = await checkAbo(user.company, req);
    return res.status(200).send({
      status: "success",
      data: {
        user: user._id,
        isVerified: user.isVerified,
        company: user.company,
        subscription,
      },
    });
  },
  // ------------------------------------end of Reset PW-----------------------------------------

  //

  // ------------------------------------Change password------------------------------------
  changePass: async (req, res, next) => {
    const { oldPass, newPass, newPassConfirm } = req.body;
    req.body.email = req.user.email;
    req.body.password = oldPass;
    let errorHolder = undefined;

    const pwPattern = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;
    const passSchema = Joi.object({
      oldPass: Joi.string().required(),
      newPass: Joi.string()
        .pattern(pwPattern)
        .required()
        .min(6)
        .max(20)
        .messages({
          "string.pattern.base":
            "Ihr Passwort muss 6-20 Zeichen, mindestens einen Großbuchstaben, mindestens einen Kleinbuchstaben, und mindestens eine Ziffer enthalten.",
        }),
    });
    const { error: joiError } = passSchema.validate({ oldPass, newPass });
    if (joiError) {
      const msg = joiError.details.map((el) => el.message).join(",");
      errorHolder = { statusCode: 400, message: msg };
    }

    if (newPass !== newPassConfirm) {
      errorHolder = {
        statusCode: 400,
        message:
          "Das Bestätigungspasswort stimmt nicht mit dem gewünschten neuen Passwort überein.",
      };
    }
    if (!errorHolder) {
      passport.authenticate("local", async function (err, user, info) {
        if (err) {
          errorHolder = { statusCode: 500, message: err.message };
        }
        if (info) {
          errorHolder = {
            statusCode: 400,
            message:
              info.name === "IncorrectPasswordError"
                ? "Ungültiges altes Passwort"
                : info.message,
          };
        }
        if (user) {
          try {
            await user.setPassword(newPass); //returns user
            await user.save();
          } catch (e) {
            errorHolder = { statusCode: 500, message: e.message || e };
          }
        }
        if (!errorHolder) {
          return res.json({ status: "success" });
        } else {
          return next(errorHolder);
        }
      })(req, res, next);
    } else {
      next(errorHolder);
    }
  },
  // ---------------end of change password ----------------------------

  //

  //---------------------- verify user ------------------------------

  verify: async (req, res) => {
    const { token } = req.params;
    const user = await User.findById(req.user._id);
    if (token !== user.verificationToken) {
      return res.status(400).json({
        status: "error",
        message: "Ungültiges Verifizierungstoken",
        user,
      });
    }

    // future note: another option would be removeing verificationToken after verification.
    if (user.isVerified) {
      return res.status(400).json({
        status: "error",
        message: "Dieser Benutzer ist bereits verifiziert",
      });
    }
    user.isVerified = true;
    await user.save();
    res.json({ status: "success" });
  },

  // ---------------------end of verify user--------------------------

  //

  // logout
  logout: (req, res) => {
    req.logout();
    req.session.subscription = undefined;
    res.json({ status: "success" });
  },
  // -----------------------end of logout---------------------------------
};

module.exports = user;
