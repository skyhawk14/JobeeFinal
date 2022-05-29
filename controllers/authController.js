const User = require("../models/users");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const ErrorHandler = require("../utils/errorHandler");
const sendToken = require("../utils/jwtToken");
const sendEmail = require("../utils/sendEmail");
// built in package
const crypto = require("crypto");
// Register a new user => /api/v1/register
exports.registerUser = catchAsyncErrors(async (req, res, next) => {
  const { name, email, password, role } = req.body;
  console.log(req.body);
  const user = await User.create({
    name,
    email,
    password,
    role,
  });
  sendToken(user, 200, res);
});

//login user => /api/v1/login
exports.loginUser = catchAsyncErrors(async (req, res, next) => {
  const { email, password } = req.body;

  // check if email or password is entered by the user
  if (!email || !password) {
    return next(new ErrorHandler("Please enter email & password", 400));
  }

  // finding user in the database
  const user = await User.findOne({ email }).select("+password");
  console.log(user);
  if (!user) {
    // unauthorized error
    return next(new ErrorHandler("Invalid email or password", 401));
  }

  // check if password is correct
  const isPasswordMatched = await user.comparePassword(password);

  if (!isPasswordMatched) {
    return next(new ErrorHandler("Invalid Email or password", 401));
  }
  //create JSON web token
  // const token = user.getJwtToken();
  // res.status(200).json({
  //   success: true,
  //   token,
  // });
  sendToken(user, 200, res);
});

// Forgot password => /api/v1/password/forgot
exports.forgotPassword = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  // check email exists
  if (!user) {
    return next(new ErrorHandler(`No user found with this email`, 404));
  }
  //get reset token
  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  // create reset password url
  const resetUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/password/reset/${resetToken}`;
  const message = `Your password reset link is as follow:\n\n${resetUrl}\n\n IF you have not request this , please ignore.`;
  try {
    await sendEmail({
      email: user.email,
      subject: "Password Recorvery Jobee",
      message,
    });
    res.status(200).json({
      success: true,
      message: `Email sent successfully to: ${user.email}`,
    });
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await User.save({ validateBeforeSave: false });
    return next(new ErrorHandler(`Email is not sent.`, 500));
  }
});

// reset password => /api/v1/password/reset/:token
exports.resetPassword = catchAsyncErrors(async (req, res, next) => {
  // Hash url token
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");
  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });
  if (!user) {
    return next(new ErrorHandler(`Password reset token is invalid`, 400));
  }

  // setup new password
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();
  sendToken(user, 200, res);
});

// Logout user => /api/v1/logout
exports.logout = catchAsyncErrors(async (req, res, next) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now()),
    httpOnly: true,
  });
  res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
});
