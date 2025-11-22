const mongoose = require('mongoose');

const StockLedgerSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  quantity_change: Number,
  quantity_after: Number,
  type: String,
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('StockLedger', StockLedgerSchema);
