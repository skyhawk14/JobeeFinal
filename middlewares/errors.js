const ErrorHandler = require("../utils/errorHandler");
// Step2 Create errors middleware for handling errors
const errorMiddleware = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  if (process.env.NODE_ENV === "development") {
    res.status(err.statusCode).json({
      success: false,
      error: err,
      errMessage: err.message,
      stack: err.stack,
    });
  }
  if (process.env.NODE_ENV === "production") {
    let error = { ...err };
    error.message = err.message;
    console.log(err);

    // Wrong Mongoose object ID error
    if (err.name === "CastError") {
      const message = `Resource not found. Invalid ${err.path}`;
      error = new ErrorHandler(message, 404);
    }
    // Handling Mongoose validation error
    if (err.name === "ValidationError") {
      const message = Object.values(err.errors).map((val) => val.message);
      error = new ErrorHandler(message, 400);
    }
    // Handle mongoose duplicate key error
    if (err.code === 11000) {
      const message = `Duplicate ${Object.keys(err.keyValue)} entered.`;
      error = new ErrorHandler(message, 400);
    }

    // Handling wrong jwt token error
    if (err.name === "JsonWebTokenError") {
      const message = `JSON Web token is invalid. Try again!`;
      error = new ErrorHandler(message, 500);
    }

    // Handling expired JWT token error
    if (err.name === "TokenExpiredError") {
      const message = `JSON Web token is expired. Try again!`;
      error = new ErrorHandler(message, 500);
    }
    res.status(error.statusCode).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = errorMiddleware;
