const Company = require("../models/company");
const Joi = require("joi");
const geoCoder = require("../helpers/geocoder");
const { deleteFile } = require("../helpers/filehelpers");
const fileSizeFormatter = require("../utils/fileSizeFormatter");

const company = {
  // ----------------get a specific company----------------------------
  getOne: async (req, res, next) => {
    let id = "";
    req.params.id === "my" ? (id = req.user.company) : ({ id } = req.params);
    try {
      const company = await Company.findById(id);
      // handle no company error resp
      if (!company) {
        return res.status(400).json({
          status: "error",
          message:
            "Bei der Suche nach der Firma ist ein Fehler aufgetreten. Bitte stellen Sie sicher, dass die ID korrekt ist oder versuchen Sie es später erneut.",
        });
      }
      // trimming
      const trimmedCompany = {
        _id: company._id,
        name: company.name,
        address: company.address,
        phoneNumber: company.phoneNumber,
        faxNumber: company.faxNumber,
        logo: company.logo,
        industryRole: company.industryRole,
        createdAt: company.createdAt,
        website: company.website,
      };
      return res
        .status(200)
        .json({ status: "success", data: { company: trimmedCompany } });
    } catch (e) {
      return next(e);
    }
  },
  // -------------------------------------end of getOne-------------------------------------------------------------------------

  updateContactData: async (req, res) => {
    const { address, website, phoneNumber, faxNumber } = req.body;
    const updatedBody = {
      address,
      website,
      phoneNumber: phoneNumber?.toString(),
      faxNumber: faxNumber?.toString(),
    };
    const formattedAddress = `${address.street.streetName} ${address.street.streetNum}, ${address.zip} ${address.city},${address.province}, ${address.country}`;
    const geoData = await geoCoder(formattedAddress);
    if (!geoData.lat || !geoData.lng) {
      return res.status(400).json({
        status: "error",
        message:
          "Es ist ein Fehler bei der Überprüfung der Adresse aufgetreten. Bitte stellen Sie sicher, dass die Adressdaten korrekt sind, und versuchen Sie es später noch einmal.",
      });
    }
    updatedBody.address.geometry = {
      type: "Point",
      coordinates: [geoData.lng, geoData.lat],
    };
    const companySchema = Joi.object({
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
    });
    const { error } = companySchema.validate(updatedBody);
    if (error) {
      const msg = error.details.map((el) => el.message).join(",");
      return res.status(400).json({ status: "error", message: msg });
    }
    const updatedCompany = await Company.findByIdAndUpdate(
      req.user.company,
      updatedBody,
      { returnDocument: "after" }
    );
    res.json({ status: "success", data: { updatedCompany } });
  },
  // ----------------- END OF UPDATE CONTACT-DATA
  //
  // ------------------- START OF UPDATE LOGO
  //
  updateLogo: async (req, res) => {
    const newLogo = req.file;
    // validate no logo
    if (!newLogo) {
      return res.status(400).json({
        status: "error",
        message: "Es wurde keine gültige Datei übermittelt.",
      });
    }
    // validate Logo Size
    if (newLogo.size > 4 * 1024 * 1024) {
      return res.status(400).json({
        status: "error",
        message: "Die Datei ist zu groß. Die maximale Dateigröße beträgt 4 MB.",
      });
    }
    await req.user.populate("company");
    const company = req.user?.company;
    // Delete Old Logo
    if (company.logo) {
      await deleteFile(company.logo.name);
      company.logo = undefined;
    }
    // Attach new logo to company and save.
    formattedLogo = {
      name: newLogo.key,
      format: newLogo.mimetype,
      originalName: newLogo.originalname,
      size: fileSizeFormatter(newLogo.size, 2),
    };
    company.logo = formattedLogo;
    await company.save();
    res.json({ status: "success", data: { newLogo: company.logo } });
  },
  // ----------------------- END OF UPDATE LOGO
};

module.exports = company;
