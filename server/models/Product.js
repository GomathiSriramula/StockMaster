const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, unique: true, sparse: true },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  unit: String,
  reorder_level: { type: Number, default: 0 },
  description: String,
  is_active: { type: Boolean, default: true },
  created_by: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Product', ProductSchema);
