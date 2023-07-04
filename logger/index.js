const morgan = require("morgan");
const developmentLogger = require("./developmentLogger");
const productionLogger = require("./productionLogger");

let logger = null;

if (process.env.NODE_ENV === "production") {
  logger = productionLogger;
} else {
  logger = developmentLogger;
}

logger.handleHttpLogs = morgan((tokens, req, res) => {
  const {
    password,
    uPassword,
    oldPass,
    newPass,
    newPassConfirm,
    confirm,
    ...filteredBody
  } = req.body;

  logger.log(
    tokens.status(req, res) >= 500 ? "error" : "http",

    `${tokens.method(req, res)} ${tokens.url(req, res)}`,
    {
      metadata: {
        method: tokens.method(req, res),
        path: tokens.url(req, res),
        status: tokens.status(req, res),
        responseTime: tokens["response-time"](req, res),
        ip: req.headers["x-forwarded-for"] || req.socket?.remoteAddress,
        reqBody: filteredBody,
        user: req.user?.id,
      },
    }
  );
  return null;
});

module.exports = logger;
