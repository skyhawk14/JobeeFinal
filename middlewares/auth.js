const jwt = require("jsonwebtoken");
const User = require("../models/users");
const catchAsyncErrors = require("./catchAsyncErrors");
const ErrorHandler = require("../utils/errorHandler");

// check if the user is authenticated or not
exports.isAuthenticatedUser = catchAsyncErrors(async (req, res, next) => {
  let token = null;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new ErrorHandler("Login first to access this resource", 401));
  }
  console.log("Token", token);
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log(decoded);
  req.user = await User.findById(decoded.id);
  next();
});

// handling user roles
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    console.log(req.user);
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandler(
          `Roles(${req.user.role}) is not allowed to access this resource`,
          403
        )
      );
    }
    next();
  };
};
