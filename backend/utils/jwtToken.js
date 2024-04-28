// const sendToken = (user, statusCode, res) => {
//   const token = user.getJWTToken();

//   //   opton for cookies
//   const option = {
//     expires: new Date(
//       Date.now() + process.env.EXPIRE_COOKIE * 24 * 60 * 60 * 1000
//     ),
//     httpOnly: true,
//   };
//   res.status(statusCode).cookie("token", token, option).json({
//     success: true,
//     user,
//     token,
//   });
// };

// module.exports = sendToken;
const sendToken = (user, statusCode, res) => {
  const token = user.getJWTToken(); // Simulate getting the JWT token

  res.setHeader("Authorization", `Bearer ${token}`);
  res.status(statusCode).json({
    success: true,
    user,
    token,
    auth: true,
  });
};

module.exports = sendToken;
