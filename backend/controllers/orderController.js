const Order = require("../models/orderSchema");
const ErrorHandler = require("../utils/errorHandler");
const handleAsyncError = require("../middleware/handleAsyncError");
const Product = require("../models/productSchema");
// Create a  new order

exports.createNewOrder = handleAsyncError(async (req, res, next) => {
  const {
    shippingInfo,
    orderItems,
    paymentInfo,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
  } = req.body;

  const order = await Order.create({
    shippingInfo,
    orderItems,
    paymentInfo,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
    paidAt: Date.now(),
    user: req.user._id,
  });

  res.status(201).json({
    success: true,
    order,
  });
});

// get Total Orders for users
exports.myOrders = handleAsyncError(async (req, res, next) => {
  const orders = await Order.find({ user: req.user._id });
  res.status(200).json({
    success: true,
    orders,
  });
});
// Get Single order
exports.getSingleOrder = handleAsyncError(async (req, res, next) => {
  // populate method is take id from field id: get the name and email of that user
  const order = await Order.findById(req.params.id).populate(
    "user",
    "name email"
  );

  if (!order) {
    return next(new ErrorHandler("Order not found with this Id", 404));
  }

  res.status(200).json({
    success: true,
    order,
  });
});

//  Get all the orders ---only (Admin) can access
exports.getAllOrders = handleAsyncError(async (req, res, next) => {
  const orders = await Order.find();
  const orderCount = await Order.countDocuments();
  let totalAmount = 0;
  totalAmount = orders.reduce((total, order) => total + order.totalPrice, 0);

  res.status(200).json({
    success: true,
    orderCount,
    orders,
    totalAmount,
  });
});
// Update the status of delivery and stock in product Controller
exports.updateStatus = handleAsyncError(async (req, res, next) => {
  if (req.body.status === "") {
    return next(new ErrorHandler("Please provide Proper Status ", 400));
  }
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new ErrorHandler("Order not found with this Id", 404));
  }

  if (order.orderStatus === "Delivered") {
    return next(new ErrorHandler("You have already delivered this order", 400));
  }

  if (req.body.status === "Shipped") {
    order.orderItems.forEach(async (o) => {
      await updateStock(o.productId, o.quantity);
    });
  }
  order.orderStatus = req.body.status;
  if (req.body.status === "Delivered") {
    order.deliveredAt = Date.now();
  }
  await order.save({ validateBeforeSave: false });
  res.status(200).json({
    success: true,
  });
});
async function updateStock(id, quantity) {
  const product = await Product.findById(id);
  product.stock -= quantity;

  await product.save({ validateBeforeSave: false });
}

exports.deleteOrder = handleAsyncError(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new ErrorHandler("Order is not found with this Id", 404));
  }
  await order.deleteOne();
  res.status(200).json({
    success: true,
  });
});
