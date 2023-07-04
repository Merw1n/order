if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const express = require("express");
const app = express();
// const cors = require("cors");

const { createServer } = require("http");
const { Server } = require("socket.io");
const httpServer = createServer(app);
const { instrument } = require("@socket.io/admin-ui");
const port = process.env.PORT || 5000;

const expressSession = require("express-session");
const passport = require("passport");
const MongoStore = require("connect-mongo");

const ExpressError = require("./utils/ExpressError");

const User = require("./models/user");

const orderARoutes = require("./routes/api/order");
const userARoutes = require("./routes/api/user");
const companyARoutes = require("./routes/api/company");
const offerARoutes = require("./routes/api/offer");
const notificationRoutes = require("./routes/api/notification");
const fileRoutes = require("./routes/file");
const fileUploadRoutes = require("./routes/fileUploadRoutes");
const stripeRoutes = require("./routes/api/stripe");
const conversationsRoutes = require("./routes/api/conversation");
const messagesRoutes = require("./routes/api/message");

const contact = require("./controllers/contactController");
const mongoose = require("mongoose");
const path = require("path");

const conversation = require("./controllers/conversationController");
const logger = require("./logger");

main().catch((err) => {
  logger.error(err, { metadata: { message: err.message, stack: err.stack } });
});
async function main() {
  //
  // mongoose connection
  await mongoose.connect(process.env.DB_URL);
  logger.info("Mongoose Connected");
  //
  const sessionMiddleware = expressSession({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookies: {
      httpOnly: true,
      expires: Date.now() + 1000 * 60 * 60 * 24,
      maxAge: 1000 * 60 * 60 * 24,
    },
    store: MongoStore.create({ mongoUrl: process.env.DB_URL }),
  });

  // Socket.io
  const io = new Server(httpServer, {
    cors: {
      origin: ["*", "http://localhost:3000", "https://admin.socket.io"],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });
  global.io = io;
  instrument(io, {
    auth: false,
  });
  //

  app.use(
    express.urlencoded({ extended: true }),
    express.json({ extended: true })
  );

  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  app.use(logger.handleHttpLogs);

  passport.use(User.createStrategy());
  passport.serializeUser(User.serializeUser());
  passport.deserializeUser(User.deserializeUser());

  app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
  });

  app.use("/api/orders/", orderARoutes);
  app.use("/api/users/", userARoutes);
  app.use("/api/companies/", companyARoutes);
  app.use("/api/offers", offerARoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/conversations", conversationsRoutes);
  app.use("/api/messages", messagesRoutes);

  app.use("/api/file", fileUploadRoutes.routes);
  app.use("/files/", fileRoutes);
  app.use("/api/stripe", stripeRoutes);

  app.post("/api/contact", contact.sendEmail);
  //
  if (process.env.NODE_ENV === "production") {
    app.use(express.static("client/build"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
    });
  } else {
    app.all("*", (req, res, next) => {
      next(new ExpressError("Page not found!", 404));
    });
  }
  //

  const wrap = (middleware) => (socket, next) =>
    middleware(socket.request, {}, next);
  io.use(wrap(sessionMiddleware));
  io.use(wrap(passport.initialize()));
  io.use(wrap(passport.session()));

  io.use((socket, next) => {
    // socket.onAny((eventName)=>{
    //   console.log(eventName, "fired")
    // })
    if (socket.request.user) {
      next();
    } else {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const companyId = socket.request.user.company.toString();
    const userId = socket.request.user._id.toString();
    // connect user (session) to a channel with his id - used for chat
    await socket.join(userId);
    // connect user (session) to a channel with his  company id - used for notifications
    await socket.join(companyId);

    // used for...?
    const session = socket.request.session;
    session.socketId = socket.id;
    session.save();

    socket.on("conversation-checked", (message) => {
      conversation.markChecked({
        conversationId: message.conversation._id,
        userId,
      });
    });
    socket.on("logout", () => {
      // disconnects all sockets with non loggedout sessions? can be problamatic
      io.in(companyId).disconnectSockets();
    });
  });

  app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    // console.error(err);
    if (Math.floor(statusCode / 100) !== 4) {
      console.log("Server Error");
      logger.error(err, {
        metadata: { message: err.message, stack: err.stack },
      });
    }
    return res
      .status(statusCode)
      .json({ status: "error", message: err.message });
  });

  httpServer.listen(port, () => {
    logger.info(`Listening on ${port}`);
  });
}
