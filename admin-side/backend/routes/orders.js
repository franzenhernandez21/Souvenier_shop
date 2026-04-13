const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');

// Get all orders
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add order
router.post('/', async (req, res) => {
  try {
    const order = await Order.create(req.body);

    // ✅ Notify lahat ng connected clients (admin + mobile)
    const io = req.app.get('io');
    io.emit('new_order', order);

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update order status
router.put('/:id', async (req, res) => {
  try {
    const prevOrder = await Order.findById(req.params.id);
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });

    // ✅ Pag naging 'completed' ang order, i-increment ang sold ng bawat product
    if (
      req.body.status === 'completed' &&
      prevOrder?.status !== 'completed' &&
      order.items?.length
    ) {
      await Promise.all(
        order.items.map((item) => {
          const productId = item._id || item.productId || item.id;
          if (!productId) return Promise.resolve();
          return Product.findByIdAndUpdate(productId, {
            $inc: { sold: item.quantity || 1 },
          });
        })
      );
    }

    // ✅ Notify lahat ng connected clients na na-update ang order
    const io = req.app.get('io');
    io.emit('order_updated', order);

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete order
router.delete('/:id', async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);

    // ✅ Notify lahat ng connected clients na na-delete ang order
    const io = req.app.get('io');
    io.emit('order_deleted', { id: req.params.id });

    res.json({ message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;