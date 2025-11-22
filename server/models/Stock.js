const mongoose = require('mongoose');

const StockSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  quantity: { type: Number, default: 0 },
  updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Stock', StockSchema);
