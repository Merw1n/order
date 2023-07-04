const express = require("express");
const router = express.Router();
const { getFileStream } = require("../helpers/filehelpers");

router.get("/:key", (req, res, next) => {
  const { key } = req.params;
  try {
    const file = getFileStream(key, next);
    file.pipe(res);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
