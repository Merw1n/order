const { createLogger, format, transports } = require("winston");
const { combine, timestamp, json, errors } = format;
require("dotenv").config();
require("winston-mongodb");

const logger = createLogger({
  transports: [
    new transports.MongoDB({
      level: "http",
      db: process.env.DB_URL,
      options: { useUnifiedTopology: true },
      collection: "logs",
      format: combine(errors({ stack: true }), timestamp(), json()),
      leaveConnectionOpen: true,
    }),
  ],
});
module.exports = logger;
