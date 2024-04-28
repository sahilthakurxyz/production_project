const express = require("express");
const {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getSingleProductDetails,
  reviewsProduct,
  getAllReviews,
  deleteProductReviews,
  getAdminProducts,
  backgroundImages,
  getBackgroundImages,
} = require("../controllers/productController");
const { isAuthenticatedUser, authoriseRoles } = require("../middleware/auth");
const router = express.Router();
router.route("/products").get(getProducts);
router
  .route("/admin/products")
  .get(isAuthenticatedUser, authoriseRoles("admin"), getAdminProducts);
router.route("/product/:id").get(getSingleProductDetails);
router
  .route("/admin/product/new")
  .post(isAuthenticatedUser, authoriseRoles("admin"), createProduct);
router
  .route("/admin/product/:id")
  .put(isAuthenticatedUser, authoriseRoles("admin"), updateProduct)
  .delete(isAuthenticatedUser, authoriseRoles("admin"), deleteProduct);
router.route("/review").put(isAuthenticatedUser, reviewsProduct);
router
  .route("/reviews")
  .get(getAllReviews)
  .delete(isAuthenticatedUser, deleteProductReviews);
router.route("/background/images").get(getBackgroundImages);
router
  .route("/admin/background/images/create/new")
  .post(isAuthenticatedUser, authoriseRoles("admin"), backgroundImages);
module.exports = router;
