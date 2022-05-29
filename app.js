const express = require("express");
const app = express();

const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");

//for file uploading
const fileUpload = require("express-fileupload");

//rate limit
const rateLimit = require("express-rate-limit");

const helmet = require("helmet");

const mongoSanitize = require("express-mongo-sanitize");

const xssClean = require("xss-clean");
const hpp = require("hpp");
const cors = require("cors");
const bodyParser = require("body-parser");
const connectDatabase = require("./config/database");

app.use(bodyParser.urlencoded({ extended: true }));

//setup secrity headers
app.use(helmet());

const errorMiddleware = require("./middlewares/errors");
const ErrorHandler = require("./utils/errorHandler");
//set up path for config.env for dotenv
dotenv.config({ path: "./config/config.env" });

// Handling uncaught exception
// Make sure it is added at the top
process.on("uncaughtException", (err) => {
  console.log(`Error: ${err.message}`);
  console.log("Shutting down the server due to uncaught exception.");
  process.exit(1);
});

//connection to databse
connectDatabase();

// setup body parser
app.use(express.json());

// set cookie parser
app.use(cookieParser());

//handle file uploadds
app.use(fileUpload());

//sanitize data
app.use(mongoSanitize());

//prevent Xss attacks
app.use(xssClean());

//prevent parameter pollution
app.use(
  hpp({
    whitelist: [],
  })
);

//setup CORS - accessible by other domains
app.use(cors());

// Rate limiting
// user can send only 100 requests per 10min
const limited = rateLimit({
  windowMs: 10 * 60 * 1000, // 10mints
  max: 100,
});
// importing all routes
const jobs = require("./routes/jobs");
const auth = require("./routes/auth");
const user = require("./routes/user");
const { mongo } = require("mongoose");
app.use("/api/v1", jobs);
app.use("/api/v1", auth);
app.use("/api/v1", user);

// Handle all unhandled routes
app.all("*", (req, res, next) => {
  next(new ErrorHandler(`${req.originalUrl} route not found`, 404));
});
// Middleware to handle error
app.use(errorMiddleware);

const PORT = process.env.PORT;
const server = app.listen(PORT, () => {
  console.log(`Server started at ${PORT} in ${process.env.NODE_ENV} mode`);
});

// handling unhandled Promise rejectoins
process.on("unhandledRejection", (err) => {
  console.log(`Error: ${err.message}`);
  console.log("Shutting down the server due to unhandled promise rejectsions.");
  server.close(() => {
    process.exit(1);
  });
});

// uncaught exception (Reference error)
// console.log(adfsaf);
