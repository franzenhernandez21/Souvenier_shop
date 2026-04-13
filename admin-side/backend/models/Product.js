const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  price:       { type: Number, required: true },
  category:    { type: String, required: true },
  description: { type: String },
  stock:       { type: Number, default: 0 },
  image:       { type: String },
  // ✅ ADD: Para mag-reflect ang rating at sold sa home/shop
  rating:      { type: Number, default: 0 },
  sold:        { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);