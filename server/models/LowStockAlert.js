const mongoose = require('mongoose');

const LowStockAlertSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  current_quantity: { type: Number, default: 0 },
  reorder_level: { type: Number, default: 0 },
  is_acknowledged: { type: Boolean, default: false },
  acknowledged_by: { type: String, default: null },
  acknowledged_at: { type: Date, default: null },
  message: String,
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('LowStockAlert', LowStockAlertSchema);
