// For handling error Step1: Create Error Handler class
class ErrorHandler extends Error {
  constructor(message, statusCode) {
    // constructor of parent class ie. of Error class
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ErrorHandler;
