const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  model: { type: String, required: true },
  brand: { type: String, required: true },
  processor: { type: String, required: true },
  ram: { type: String, required: true },
  storage: { type: String, required: true },
  screen: { type: String, required: true },
  condition: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, default: 0 }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
