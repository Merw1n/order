const fileSizeFormatter = require("../utils/fileSizeFormatter");

const singleFileUpload = async (req, res, next) => {
  try {
    const file = req.file;
    res.json({ status: "success" });
  } catch (error) {
    res.status(400).send({ status: "error", message: err.message });
  }
};

const multipleFileUpload = async (req, res, next) => {
  try {
    let filesArray = [];
    req.files.forEach((element) => {
      const file = {
        name: element.filename,
        path: element.path,
        format: element.mimetype,
        originalName: element.originalname,
        size: fileSizeFormatter(element.size, 2),
      };
      filesArray.push(file);
    });
    res.json({ status: "success" });
  } catch (error) {
    res.status(400).json(error.message);
  }
};

// const singleFileUpload = async (req, res, next) => {
//   try {
//     let filesArray = [];
//     req.files.forEach((element) => {
//       const file = {
//         name: element.filename,
//         path: element.path,
//         format: element.mimetype,
//         originalName: element.originalname,
//         size: fileSizeFormatter(element.size, 2),
//       };
//       filesArray.push(file);
//     });
//     const files = req.files;
//     console.log(files);
//     res.json({ status: "success" });
//   } catch (err) {
//     res.status(400).json({ status: "error", message: err.message });
//   }
// };

module.exports = {
  singleFileUpload,
  multipleFileUpload,
};
