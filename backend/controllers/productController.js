const Product = require("../models/productSchema.js");
const BackgroundImages = require("../models/CreateImageSchema.js");
const ErrorHandler = require("../utils/errorHandler");
const handleAsyncOperation = require("../middleware/handleAsyncError.js");
const ApiFeatures = require("../utils/apiFeatures.js");
const { result } = require("lodash");
const { default: mongoose } = require("mongoose");
const cloudinary = require("cloudinary").v2;
// GET ALL PRODUCTS
exports.getProducts = handleAsyncOperation(async (req, res, next) => {
  let productsPerPage = 15;
  // return next(new ErrorHandler("there is an issue", 500));
  const productCount = await Product.countDocuments();

  const apiFeatures = new ApiFeatures(Product.find(), req.query)
    .search()
    .filter()
    .pagination(productsPerPage);
  const products = await apiFeatures.query; // Execute the query

  const filterProductsCount = await Product.countDocuments(
    apiFeatures.query.getFilter()
  ); // Count documents based on the filter

  res.status(200).json({
    success: true,
    products,
    productCount,
    productsPerPage,
    filterProductsCount,
  });
});

// Get all Products for Admin
exports.getAdminProducts = handleAsyncOperation(async (req, res, next) => {
  const products = await Product.find();
  if (!products) {
    return next(new ErrorHandler("No Products Available"));
  }
  res.status(200).json({
    success: true,
    products,
  });
});
// GET SINGLE PRODUCT
exports.getSingleProductDetails = handleAsyncOperation(
  async (req, res, next) => {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return next(new ErrorHandler("Product not found", 404));
    }
    res.status(200).json({
      success: true,
      product,
    });
  }
);
// Create Product Access only to  -- Admin
exports.createProduct = handleAsyncOperation(async (req, res, next) => {
  let images = [];
  if (typeof req.body.images === "string") {
    images.push(req.body.images);
  } else {
    images = req.body.images;
  }
  const imagesLinks = [];
  for (let i = 0; i < images.length; i++) {
    const result = await cloudinary.uploader.upload(images[i], {
      folder: "products",
      transformation: {
        width: 800,
        height: 600,
        quality: "auto:good",
      },
    });
    imagesLinks.push({
      public_id: result.public_id,
      url: result.secure_url,
    });
  }
  req.body.images = imagesLinks;
  req.body.user = req.user.id;
  const product = await Product.create(req.body);
  res.status(201).json({
    success: true,
    product,
  });
});
//  Delete Product Access to --Admin

exports.deleteProduct = handleAsyncOperation(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }
  for (let i = 0; i < product.images.length; i++) {
    await cloudinary.uploader.destroy(product.images[i].public_id);
  }
  await product.deleteOne();
  res.status(203).json({
    success: true,
    message: "product delete successfully",
  });
});
// Update Prtoduct Access to  -- Admin

exports.updateProduct = handleAsyncOperation(async (req, res, next) => {
  let product = await Product.findById(req.params.id);
  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }
  // first Set all Images to Update
  let images = [];
  if (typeof req.body.images === "string") {
    images.push(req.body.images);
  } else {
    images = req.body.images;
  }
  // check old Images of product if there then destory first
  if (images !== undefined) {
    for (let i = 0; i < images.length; i++) {
      await cloudinary.uploader.destroy(product.images[i].public_id);
    }
    const imagesLinks = [];
    for (let i = 0; i < images.length; i++) {
      const result = await cloudinary.uploader.upload(images[i], {
        folder: "products",
        transformation: {
          width: 800,
          height: 600,
          quality: "auto:good",
        },
      });
      imagesLinks.push({
        public_id: result.public_id,
        url: result.secure_url,
      });
    }
    req.body.images = imagesLinks;
  }
  product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
    product,
  });
});

// create new review or update the review
exports.reviewsProduct = handleAsyncOperation(async (req, res, next) => {
  const { rating, comment, productId, profile } = req.body;
  const review = {
    name: req.user.name,
    user: req.user._id,
    rating: Number(rating),
    comment,
    profile,
  };
  const product = await Product.findById(productId);
  const isReviewed = product.reviews.find(
    (rev) => rev.user.toString() === req.user._id.toString()
  );
  if (isReviewed) {
    // Update the existing review
    if (isReviewed.user.toString() === req.user._id.toString()) {
      isReviewed.rating = rating;
      isReviewed.comment = comment;
      isReviewed.profile = profile;
    }
  } else {
    // Add a new review
    product.reviews.push(review);
    product.NumOfReviews = product.reviews.length;
  }

  let avg = 0;
  if (product.reviews.length > 0) {
    avg =
      product.reviews.reduce((total, rev) => total + rev.rating, 0) /
      product.reviews.length;
  }

  // Check if avg is NaN, and set ratings accordingly
  product.ratings = isNaN(avg) ? 0 : avg;
  await product.save({ validateBeforeSave: false });
  res.status(200).json({
    success: true,
  });
});

// get all the reviews of the product
exports.getAllReviews = handleAsyncOperation(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.query.id)) {
    return next(new ErrorHandler("Provide a Valid Product Id", 400));
  }
  const product = await Product.findById(req.query.id);

  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  res.status(200).json({
    success: true,
    reviews: product.reviews,
  });
});
// asghlkour12354782154ghj1
// delete reviews of product
exports.deleteProductReviews = handleAsyncOperation(async (req, res, next) => {
  const product = await Product.findById(req.query.productId);
  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  const reviews = product.reviews.filter(
    (rev) => rev._id.toString() !== req.query.id.toString()
  );
  let avg = 0;
  let ratings = 0;
  if (reviews.length > 0) {
    ratings = 0;
  } else {
    avg =
      reviews.reduce((total, rev) => total + rev.rating, 0) / reviews.length;

    // Check if avg is NaN, and set ratings accordingly
    ratings = isNaN(avg) ? 0 : avg / reviews.length;
  }
  const NumOfReviews = reviews.length;
  await Product.findByIdAndUpdate(
    req.query.productId,
    {
      reviews,
      ratings,
      NumOfReviews,
    },
    {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    }
  );
  res.status(200).json({
    success: true,
  });
});
// Get Background Images
exports.getBackgroundImages = handleAsyncOperation(async (req, res) => {
  const images = await BackgroundImages.find();
  if (!images) {
    return next(new ErrorHandler("No Images Available", 404));
  }
  res.status(200).json({
    success: true,
    images,
  });
});
// Create Images for background only for Once Admin Can Access
exports.backgroundImages = handleAsyncOperation(async (req, res, next) => {
  let images = [];
  if (typeof req.body.images === "string") {
    images.push(req.body.images);
  } else {
    images = req.body.images;
  }
  const imagesLinks = [];
  for (let i = 0; i < images.length; i++) {
    const result = await cloudinary.uploader.upload(images[i], {
      folder: "images",
    });
    imagesLinks.push({
      public_id: result.public_id,
      url: result.secure_url,
    });
  }
  req.body.images = imagesLinks;
  req.body.user = req.user.id;
  const backImages = await BackgroundImages.create(req.body);
  res.status(201).json({
    success: true,
    backImages,
  });
});
