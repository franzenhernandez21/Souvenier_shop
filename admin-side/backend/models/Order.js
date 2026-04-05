const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userEmail: { type: String },
  items: [{
    name: String,
    price: Number,
    quantity: Number,
    image: String,
    variant: String,
  }],
  grandTotal: { type: Number },
  status: { type: String, default: 'pending' },
  paymentMethod: { type: String },
  address: {
    street: String,
    barangay: String,
    city: String,
    province: String,
    zip: String,
  },
  confirmedAt: { type: Date },
  completedAt: { type: Date },
  dateReceived: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);