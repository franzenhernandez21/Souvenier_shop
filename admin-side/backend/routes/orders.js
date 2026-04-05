const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

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
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });

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