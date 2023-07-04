const { createLogger, format, transports } = require("winston");
const { combine, timestamp, colorize, json, printf, errors, prettyPrint } =
  format;
require("dotenv").config();
require("winston-mongodb");

// const errorStackFormat = format((info) => {
//   if (info instanceof Error) {
//     return Object.assign({}, info, {
//   stack: info.stack,
//       message: info.message ,
//     });
//   }
//   return info;
// });

const logger = createLogger({
  //   exitOnError: false,
  //   level: "debug",
  //   format: errors({ stack: true }),
  // defaultMeta: { service: "user-service" },
  transports: [
    //
    // - Write all logs with importance level of `error` or less to `error.log`
    // - Write all logs with importance level of `info` or less to `combined.log`
    //
    // new winston.transports.File({ filename: "error.log", level: "error" }),
    // new winston.transports.File({ filename: "combined.log" }),
    new transports.Console({
      level: "debug",
      format: combine(
        errors({ stack: true }), // <-- use errors format
        colorize(),
        timestamp({ format: "HH:mm:ss:ms" }),
        printf(
          (info) =>
            `${info.timestamp} ${info.level}: ${info.message} ${
              info.metadata?.status || ""
            } ${info.stack || ""}`
        )
      ),
    }),
    new transports.MongoDB({
      level: "http",
      db: process.env.DB_URL,
      options: { useUnifiedTopology: true },
      collection: "logs",
      format: combine(
        errors({ stack: true }),
        // errorStackFormat(),
        timestamp(),
        // enumerateErrorFormat(),
        // format.errors({ stack: true }),
        json()
      ),
      leaveConnectionOpen: true,
    }),
  ],
});
// logger.format = combine(errors({ stack: true }));
// logger.stream = {
//   write: function (message, encoding) {
//     logger.info(message);
//   },
// };

module.exports = logger;
