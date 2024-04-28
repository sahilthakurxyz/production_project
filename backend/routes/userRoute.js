const express = require("express");
const {
  registerUser,
  loginUser,
  logOutUser,
  forgotPassword,
  resetPassword,
  updatePassword,
  updateMyProfile,
  getMyProfile,
  getSingleUser,
  getAllUsers,
  updateUser,
  deleteUserProfile,
} = require("../controllers/userController");
const { isAuthenticatedUser, authoriseRoles } = require("../middleware/auth");

const router = express.Router();

router.route("/register").post(registerUser);
router.route("/loginuser").post(loginUser);
router.route("/password/forgot").post(forgotPassword);
router.route("/logoutuser").get(logOutUser);
router.route("/reset/password/:token").put(resetPassword);
router.route("/profile").get(isAuthenticatedUser, getMyProfile);
router.route("/password/update").put(isAuthenticatedUser, updatePassword);
router.route("/profile/update").put(isAuthenticatedUser, updateMyProfile);
// access all users
// this route only admin can access all the users who register
router
  .route("/admin/users")
  .get(isAuthenticatedUser, authoriseRoles("admin"), getAllUsers);
router
  .route("/admin/user/:id")
  .get(isAuthenticatedUser, authoriseRoles("admin"), getSingleUser)
  .put(isAuthenticatedUser, authoriseRoles("admin"), updateUser)
  .delete(isAuthenticatedUser, authoriseRoles("admin"), deleteUserProfile);
module.exports = router;
