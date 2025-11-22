const mongoose = require('mongoose');

const StockReceiptSchema = new mongoose.Schema({
  receipt_number: { type: String },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  quantity: { type: Number, default: 0 },
  unit_cost: { type: Number, default: 0 },
  supplier_name: { type: String },
  notes: { type: String },
  status: { type: String, default: 'pending' },
  created_by: String,
  created_at: { type: Date, default: Date.now },
  completed_at: { type: Date },
});

module.exports = mongoose.model('StockReceipt', StockReceiptSchema);
