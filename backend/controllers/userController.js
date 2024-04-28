const ErrorHandler = require("../utils/errorHandler");
const handleAsyncOperation = require("../middleware/handleAsyncError.js");
const sendEmail = require("../utils/sendEmail");
const User = require("../models/userSchema.js");
const sendToken = require("../utils/jwtToken.js");
const crypto = require("crypto");
const { isAuthenticatedUser } = require("../middleware/auth.js");
const cloudinary = require("cloudinary").v2;
// Register the User
exports.registerUser = handleAsyncOperation(async (req, res, next) => {
  if (!req.files || !req.files.avatar) {
    return res.status(400).json({ message: "Avatar file is missing" });
  }
  // Create a new user with the Cloudinary avatar information
  const myCloud = await cloudinary.uploader.upload(
    req.files.avatar.tempFilePath,
    {
      folder: "avatars",
      width: 150,
      crop: "scale",
    }
  );

  const { name, email, password } = req.body;

  const user = await User.create({
    name,
    email,
    password,
    avatar: {
      public_id: myCloud.public_id,
      url: myCloud.secure_url,
    },
  });

  // Send the authentication token as a response
  sendToken(user, 201, res);
});
// Login the User
exports.loginUser = handleAsyncOperation(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorHandler("Please Enter Email & password", 404));
  }
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return next(new ErrorHandler("Invalid Email or Password", 401));
  }
  const isPasswordMatched = await user.comparePassword(password);

  if (!isPasswordMatched) {
    return next(new ErrorHandler("Unauthorised email or password", 401));
  }
  sendToken(user, 200, res);
});
// Logout the User
exports.logOutUser = handleAsyncOperation(async (req, res, next) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });
  res.status(200).json({
    success: true,
    message: "logged Out",
  });
});

// Forget Password
exports.forgotPassword = handleAsyncOperation(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new ErrorHandler("user not found", 404));
  }
  const resetToken = await user.generateResetPassword();
  await user.save({ validateBeoreSave: false });
  // const resetPasswordUrl = `http://${req.get(
  //   "host"
  // )}/api/ecommerce/v1/password-reset/${resetToken}`;
  // const resetPasswordUrl = `${process.env.FRONTEND_URL}/reset/password/${resetToken}`;
  // const message = `your reset password token is :- \n\n ${resetPasswordUrl} \n\n if you have not requested this email then, please ignore this `;

  await user.save({ validateBeoreSave: false });
  const resetPasswordUrl = `${req.protocol}://${req.get(
    "host"
  )}/reset/password/${resetToken}`;
  const message = `your reset password token is :- \n\n ${resetPasswordUrl} \n\n if you have not requested this email then, please ignore this `;

  try {
    await sendEmail({
      email: user.email,
      subject: "Ecommerce Password Recovery",
      message,
    });
    res.status(200).json({
      success: true,
      message: `Email send to ${user.email} successfully`,
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeoreSave: false });

    if (next) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
});

// Reset Password function
exports.resetPassword = handleAsyncOperation(async (req, res, next) => {
  try {
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });
    if (!user) {
      return next(
        new ErrorHandler(
          "Reset Password Token is Invalid or has been expired",
          400
        )
      );
    }
    if (req.body.password !== req.body.confirmPassword) {
      return next(new ErrorHandler("Password does not match", 400));
    }
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    // sendToken(user, 200, res);
    res.status(200).json({
      success: true,
    });
  } catch (err) {
    return next(new ErrorHandler(err.message, 500));
  }
});
// Get User Profile
exports.getMyProfile = handleAsyncOperation(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({
    success: true,
    user,
  });
});
//  Update Password
exports.updatePassword = handleAsyncOperation(async (req, res, next) => {
  if (
    !req.body.oldPassword ||
    !req.body.newPassword ||
    !req.body.confirmPassword
  ) {
    return next(new ErrorHandler("required all fields"));
  }
  if (req.body.oldPassword === req.body.newPassword) {
    return next(
      new ErrorHandler("Please Change your Password You Entered Same as Old")
    );
  }
  const user = await User.findById(req.user.id).select("+password");
  const isPasswordMatched = await user.comparePassword(req.body.oldPassword);

  if (!isPasswordMatched) {
    return next(new ErrorHandler(" Incorrect old Password", 401));
  }

  if (req.body.newPassword !== req.body.confirmPassword) {
    return next(new ErrorHandler("password does not match"));
  }
  user.password = req.body.newPassword;
  await user.save();
  sendToken(user, 200, res);
});

// Update the profile

exports.updateMyProfile = handleAsyncOperation(async (req, res, next) => {
  try {
    if (!req.body.name && !req.body.email) {
      return next(new ErrorHandler("Name and Email are required", 400));
    }

    if (!req.body.name) {
      return next(new ErrorHandler("Name is required", 400));
    }
    if (!req.body.email) {
      return next(new ErrorHandler("Email is required", 400));
    }

    const newUserData = {
      name: req.body.name,
      email: req.body.email,
    };
    if (req.body.avatar !== "") {
      const user = await User.findById(req.user.id);
      const ImageId = user.avatar.public_id;
      await cloudinary.uploader.destroy(ImageId);
      const myCloud = await cloudinary.uploader.upload(
        req.files.avatar.tempFilePath,
        {
          folder: "avatars",
          width: 150,
          crop: "scale",
        }
      );
      newUserData.avatar = {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      };
    }
    const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    });
    await user.save();
    sendToken(user, 200, res);
  } catch (err) {
    return next(new ErrorHandler("Internal Server Error", 500));
  }
});
// Get All users ---- only (Admin) can get all the users
exports.getAllUsers = handleAsyncOperation(async (req, res, next) => {
  const users = await User.find();
  res.status(200).json({
    success: true,
    users,
  });
});

// Get single user details ---- only (Admin) can access
exports.getSingleUser = handleAsyncOperation(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  res.status(200).json({
    success: true,
    user,
  });
});
// Update user --- only (Admin) can update user
exports.updateUser = handleAsyncOperation(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorHandler("user does not exist", 404));
  }
  try {
    if (!req.body.name || !req.body.email || !req.body.role) {
      return next(new ErrorHandler("All fields are required", 400));
    }

    if (!req.body.name) {
      return next(new ErrorHandler("Name field is required", 400));
    }

    if (!req.body.email) {
      return next(new ErrorHandler("Email field is required", 400));
    }
    if (!req.body.role) {
      return next(new ErrorHandler("Role field is required", 400));
    }
    const newUserData = {
      name: req.body.name,
      email: req.body.email,
      role: req.body.role,
    };

    await User.findByIdAndUpdate(req.params.id, newUserData, {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    });

    res.status(200).json({
      success: true,
      message: `User Successfully update`,
    });
  } catch (err) {
    return next(new ErrorHandler("Internal Server Error", 500));
  }
});
exports.deleteUserProfile = handleAsyncOperation(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorHandler(`User does not exist with this id:${req.params.id}`, 404)
    );
  }
  // we delete here user Images on cloudnary
  const imageId = user.avatar.public_id;
  await cloudinary.uploader.destroy(imageId);
  await user.deleteOne();
  res.status(200).json({
    success: true,
    message: `Delete profile seccessfully`,
  });
});
