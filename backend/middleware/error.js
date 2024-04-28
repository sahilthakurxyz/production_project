const ErrorHandler = require("../utils/errorHandler");

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal Server Error";

  // mongodb error id parameter error
  if (err.name == "CastError") {
    const message = `Resource not found. Invalid ${err.path}`;
    err.message = new ErrorHandler(message, 400);
  }
  // Mongodb Duplicate key error
  if (err.code === 11000) {
    const message = `Something went wrong : Duplicate ${Object.keys(
      err.keyValue
    )} Entered`;
    err = new ErrorHandler(message, 400);
  }
  // Json web token Error
  if (err.name == "jsonWebTokenError") {
    const message = `Json Web Token is Invalid,try again`;
    err.message = new ErrorHandler(message, 400);
  }
  // JWT Expire Error
  if (err.name == "jsonWebExpiredError") {
    const message = `Json Web Token is Expire,try again`;
    err.message = new ErrorHandler(message, 400);
  }
  res.status(err.statusCode).json({
    success: false,
    // error: err,
    message: err.message,
  });
};
