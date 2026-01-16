import express from "express";
import bodyParser from "body-parser";
import connectDB from "./Db/Connectdb.js";
import admin from "./Routes/Admin.js";
import user from "./Routes/User.js";
import partner from "./Routes/Partner.js";
import advertisement from "./Routes/Advertisement.js";
import fileUpload from "express-fileupload";
import session from "express-session";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { swaggerUi, swaggerDocument } from "./swagger.js";
import { start as startTelegramBot } from "./Utils/telegramBot.js";
import { startMembershipExpiryCheck } from "./Utils/membershipCron.js";
import { initializeDefaultRates } from "./Utils/initializeRates.js";
import { initializeAdvertisementConfig } from "./Utils/initializeAdConfig.js";
import moment from "moment";

mongoose.set("strictQuery", false);
const app = express();
dotenv.config();
const port = process.env.PORT || "5665";
const DATABASE_URL = process.env.DB || "mongodb://127.0.0.1:27017";
app.use(bodyParser.urlencoded({ extended: true, limit: "500MB" }));
app.use(express.json({ extended: true, limit: "500MB" }));
app.use(bodyParser.json());

// Database Connection
connectDB(DATABASE_URL);
app.use(fileUpload());
app.set("views", "./Views");
app.set("view engine", "ejs");
app.locals.moment = moment;
app.use(
  session({
    secret: "keyboard cat",
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 172800000 }, // 48 hours in milliseconds
  })
);
app.use("/assets", express.static("assets"));
app.use(cors());

// Start Telegram bot
startTelegramBot();

// Start membership expiry cron job
startMembershipExpiryCheck();

// Initialize default advertisement rates
initializeDefaultRates();
// Ensure advertisement system config exists (ADVERTISEMENTS_COUNTRY_FILTER = 1 by default)
initializeAdvertisementConfig();

//custom logger
app.use((req, res, next) => {
  const now = new Date();
  console.log(
    `[${now.toISOString()}] ${req.method} request to ${req.url} from ${req.ip}`
  );
  next();
});

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept ,Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTION"
  );
  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});

app.use(express.urlencoded({ extended: false }));
app.use(express.json({ extended: false }));
app.use("/admin", admin);
app.use("/partner", partner);
app.use("/", user);
app.use("/", advertisement);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/", function (req, res) {
  if (req.url != "/admin") {
    res.redirect("/admin");
  }
});

// global error handler
// app.use(function (err, req, res) {
//   res.status(500).send({ message: err.message });
// });

http.createServer(app).listen(port, () => {
  console.log(`HTTP server listening at http://localhost:${port}`);
  console.log(
    `API documentation available at http://localhost:${port}/api-docs`
  );
});
