const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  delivery_number: {
    type: String,
    required: true,
    unique: true
  },
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  warehouse_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['Picked', 'Packed', 'Delivered'],
    default: 'Picked'
  },
  notes: String,
  picked_at: Date,
  packed_at: Date,
  delivered_at: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('Delivery', deliverySchema);
