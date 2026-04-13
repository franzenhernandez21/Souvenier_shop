const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Product = require('../models/Product');

// Get all reviews
router.get('/', async (req, res) => {
  try {
    const reviews = await Review.find();
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get reviews by product
router.get('/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add review — ✅ auto-update product rating + emit socket event
router.post('/', async (req, res) => {
  try {
    const review = await Review.create(req.body);

    // ✅ Recalculate average rating ng product
    const allReviews = await Review.find({ productId: req.body.productId });
    const avgRating =
      allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    const updatedProduct = await Product.findByIdAndUpdate(
      req.body.productId,
      { rating: Math.round(avgRating * 10) / 10 },
      { new: true }
    );

    // ✅ Emit socket event — para mag-refresh ang home/shop screens ng lahat ng users
    const io = req.app.get('io');
    if (io) io.emit('review_submitted', { productId: req.body.productId, rating: updatedProduct?.rating });

    res.json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;