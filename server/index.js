require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

const Category = require('./models/Category');
const Product = require('./models/Product');
const Warehouse = require('./models/Warehouse');
const StockReceipt = require('./models/StockReceipt');
const StockLedger = require('./models/StockLedger');
const Stock = require('./models/Stock');
const LowStockAlert = require('./models/LowStockAlert');
const User = require('./models/User');
const OTP = require('./models/OTP');
const Delivery = require('./models/Delivery');

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/stockmaster';

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Categories
app.get('/api/categories', async (req, res) => {
  try {
    const cats = await Category.find().sort('name');
    res.json(cats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const c = new Category(req.body);
    await c.save();
    res.status(201).json(c);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to create category' });
  }
});

// Products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().populate('category_id').sort('name');
    // Map to match previous shape (categories.name)
    const mapped = products.map((p) => ({
      id: p._id,
      name: p.name,
      sku: p.sku,
      category_id: p.category_id ? p.category_id._id : null,
      unit: p.unit,
      reorder_level: p.reorder_level,
      description: p.description,
      is_active: p.is_active,
      categories: p.category_id ? { name: p.category_id.name } : undefined,
    }));
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const payload = req.body;
    // If category_id is provided but looks like a local fallback id, ignore it
    if (payload.category_id && String(payload.category_id).startsWith('local:')) {
      payload.category_id = null;
      if (payload.description == null) payload.description = '';
      payload.description += `\nCategory (unsaved): ${payload._localCategoryName || 'unsaved'}`;
    }
    // If category_id is empty string or invalid, set to null
    if (payload.category_id === '' || payload.category_id === 'null' || payload.category_id === 'undefined') {
      payload.category_id = null;
    }
    // Validate category_id is a valid ObjectId if provided
    if (payload.category_id && !mongoose.Types.ObjectId.isValid(payload.category_id)) {
      return res.status(400).json({ error: 'Invalid category_id format', details: 'Category ID must be a valid MongoDB ObjectId' });
    }
    const p = new Product(payload);
    await p.save();
    res.status(201).json(p);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to create product', details: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updated = await Product.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Product not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await Product.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to delete product' });
  }
});

// CSV Upload for Products
app.post('/api/products/upload-csv', upload.single('file'), async (req, res) => {
  const filePath = req.file?.path;
  
  if (!filePath) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const results = [];
  const errors = [];
  let created = 0;
  let updated = 0;

  try {
    // Read and parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    // Process each row
    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      
      try {
        // Validate required fields
        if (!row.name || !row.sku) {
          errors.push({ row: i + 2, error: 'Missing required fields: name or sku' });
          continue;
        }

        // Prepare product data
        const productData = {
          name: row.name.trim(),
          sku: row.sku.trim(),
          category_id: row.category_id?.trim() || null,
          unit: row.unit?.trim() || 'pcs',
          reorder_level: parseInt(row.reorder_level) || 0,
          description: row.description?.trim() || '',
          is_active: row.is_active !== 'false',
        };

        // Validate category_id if provided
        if (productData.category_id && !mongoose.Types.ObjectId.isValid(productData.category_id)) {
          productData.category_id = null;
        }

        // Check if product exists by SKU
        const existingProduct = await Product.findOne({ sku: productData.sku });
        
        if (existingProduct) {
          // Update existing product
          await Product.findByIdAndUpdate(existingProduct._id, productData);
          updated++;
        } else {
          // Create new product
          const newProduct = new Product(productData);
          await newProduct.save();
          created++;
        }
      } catch (err) {
        errors.push({ 
          row: i + 2, 
          sku: row.sku, 
          error: err.message 
        });
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      message: 'CSV processed',
      created,
      updated,
      errors: errors.length,
      errorDetails: errors.length > 0 ? errors : undefined,
    });

  } catch (err) {
    // Clean up file on error
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    console.error('CSV upload error:', err);
    res.status(500).json({ 
      error: 'Failed to process CSV', 
      details: err.message 
    });
  }
});

// Serve a simple health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Warehouses
app.get('/api/warehouses', async (req, res) => {
  try {
    const list = await Warehouse.find().sort('name');
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load warehouses' });
  }
});

app.post('/api/warehouses', async (req, res) => {
  try {
    const w = new Warehouse(req.body);
    await w.save();
    res.status(201).json(w);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to create warehouse' });
  }
});

app.put('/api/warehouses/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updated = await Warehouse.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Warehouse not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to update warehouse' });
  }
});

// Stock receipts (basic persistence)
app.get('/api/stock_receipts', async (req, res) => {
  try {
    const receipts = await StockReceipt.find()
      .populate('product_id', 'name unit')
      .populate('warehouse_id', 'name')
      .sort({ created_at: -1 });
    
    // Map to match expected shape with nested objects
    const mapped = receipts.map((r) => ({
      id: r._id,
      receipt_number: r.receipt_number,
      quantity: r.quantity,
      unit_cost: r.unit_cost,
      supplier_name: r.supplier_name,
      notes: r.notes,
      status: r.status,
      created_at: r.created_at,
      completed_at: r.completed_at,
      products: r.product_id ? { name: r.product_id.name, unit: r.product_id.unit } : null,
      warehouses: r.warehouse_id ? { name: r.warehouse_id.name } : null,
    }));
    
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load stock receipts' });
  }
});

app.post('/api/stock_receipts', async (req, res) => {
  try {
    const sr = new StockReceipt(req.body);
    await sr.save();
    // Add a ledger entry
    await new StockLedger({
      product_id: sr.product_id,
      quantity_change: sr.quantity,
      quantity_after: sr.quantity,
      type: 'receipt',
      warehouse_id: sr.warehouse_id,
    }).save();
    res.status(201).json(sr);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to create stock receipt', details: err.message });
  }
});

// Stock deliveries (outgoing)
// Deliveries - 3-step workflow
// Get all deliveries
app.get('/api/deliveries', async (req, res) => {
  try {
    const deliveries = await Delivery.find()
      .populate('product_id')
      .populate('warehouse_id')
      .sort({ createdAt: -1 });
    res.json(deliveries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load deliveries' });
  }
});

// Step 1: Pick Items - Create delivery order with status "Picked"
app.post('/api/stock_deliveries', async (req, res) => {
  try {
    const { delivery_number, product_id, warehouse_id, quantity, notes } = req.body;
    
    // Validate ObjectIds
    if (!product_id || !mongoose.Types.ObjectId.isValid(product_id)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    
    if (!warehouse_id || !mongoose.Types.ObjectId.isValid(warehouse_id)) {
      return res.status(400).json({ error: 'Invalid warehouse ID' });
    }
    
    // Validate quantity
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }
    
    // Check if stock is sufficient
    const stockDoc = await Stock.findOne({ product_id, warehouse_id });
    const availableStock = stockDoc ? stockDoc.quantity : 0;
    
    if (availableStock < qty) {
      return res.status(400).json({ error: `Insufficient stock. Available: ${availableStock}` });
    }
    
    // Create delivery order with "Picked" status
    const delivery = new Delivery({
      delivery_number,
      product_id,
      warehouse_id,
      quantity: qty,
      notes,
      status: 'Picked',
      picked_at: new Date()
    });
    
    await delivery.save();
    
    const populatedDelivery = await Delivery.findById(delivery._id)
      .populate('product_id')
      .populate('warehouse_id');
    
    res.status(201).json(populatedDelivery);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Failed to create delivery' });
  }
});

// Step 2: Pack Items - Update status to "Packed"
app.post('/api/deliveries/:id/pack', async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    
    if (delivery.status !== 'Picked') {
      return res.status(400).json({ error: 'Delivery must be in Picked status to pack' });
    }
    
    delivery.status = 'Packed';
    delivery.packed_at = new Date();
    await delivery.save();
    
    const populatedDelivery = await Delivery.findById(delivery._id)
      .populate('product_id')
      .populate('warehouse_id');
    
    res.json(populatedDelivery);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to pack delivery' });
  }
});

// Step 3: Validate and Deliver - Mark as "Delivered" and reduce stock
app.post('/api/deliveries/:id/deliver', async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    
    if (delivery.status !== 'Packed') {
      return res.status(400).json({ error: 'Delivery must be in Packed status to deliver' });
    }
    
    // Check stock again before delivery
    const stockDoc = await Stock.findOne({ 
      product_id: delivery.product_id, 
      warehouse_id: delivery.warehouse_id 
    });
    
    const availableStock = stockDoc ? stockDoc.quantity : 0;
    
    if (availableStock < delivery.quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }
    
    // Reduce stock
    stockDoc.quantity = Math.max(0, stockDoc.quantity - delivery.quantity);
    stockDoc.updated_at = new Date();
    await stockDoc.save();
    
    // Create ledger entry
    await new StockLedger({
      product_id: delivery.product_id,
      warehouse_id: delivery.warehouse_id,
      quantity_change: -delivery.quantity,
      quantity_after: stockDoc.quantity,
      type: 'delivery',
      reference_number: delivery.delivery_number
    }).save();
    
    // Update delivery status
    delivery.status = 'Delivered';
    delivery.delivered_at = new Date();
    await delivery.save();
    
    const populatedDelivery = await Delivery.findById(delivery._id)
      .populate('product_id')
      .populate('warehouse_id');
    
    res.json(populatedDelivery);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to deliver' });
  }
});

// Delete delivery (only if not delivered)
app.delete('/api/deliveries/:id', async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    
    if (delivery.status === 'Delivered') {
      return res.status(400).json({ error: 'Cannot delete delivered orders' });
    }
    
    await Delivery.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to delete delivery' });
  }
});

// Stock transfers
app.post('/api/stock_transfers', async (req, res) => {
  try {
    const payload = req.body;
    const qty = Number(payload.quantity) || 0;
    // subtract from source
    let fromStock = await Stock.findOne({ product_id: payload.product_id, warehouse_id: payload.from_warehouse_id });
    if (fromStock) {
      fromStock.quantity = Math.max(0, (fromStock.quantity || 0) - qty);
      await fromStock.save();
    } else {
      fromStock = await new Stock({ product_id: payload.product_id, warehouse_id: payload.from_warehouse_id, quantity: 0 }).save();
    }
    // add to destination
    let toStock = await Stock.findOne({ product_id: payload.product_id, warehouse_id: payload.to_warehouse_id });
    if (toStock) {
      toStock.quantity = (toStock.quantity || 0) + qty;
      await toStock.save();
    } else {
      toStock = await new Stock({ product_id: payload.product_id, warehouse_id: payload.to_warehouse_id, quantity: qty }).save();
    }
    // ledger entries
    await new StockLedger({ product_id: payload.product_id, warehouse_id: payload.from_warehouse_id, quantity_change: -qty, quantity_after: fromStock.quantity, type: 'transfer_out' }).save();
    await new StockLedger({ product_id: payload.product_id, warehouse_id: payload.to_warehouse_id, quantity_change: qty, quantity_after: toStock.quantity, type: 'transfer_in' }).save();
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to create transfer' });
  }
});

// Stock adjustments
app.post('/api/stock_adjustments', async (req, res) => {
  try {
    const payload = req.body;
    const change = Number(payload.quantity_change || payload.quantity) || 0;
    let stockDoc = await Stock.findOne({ product_id: payload.product_id, warehouse_id: payload.warehouse_id });
    if (stockDoc) {
      stockDoc.quantity = (stockDoc.quantity || 0) + change;
      await stockDoc.save();
    } else {
      stockDoc = await new Stock({ product_id: payload.product_id, warehouse_id: payload.warehouse_id, quantity: change }).save();
    }
    await new StockLedger({ product_id: payload.product_id, warehouse_id: payload.warehouse_id, quantity_change: change, quantity_after: stockDoc.quantity, type: 'adjustment' }).save();
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to create adjustment' });
  }
});

// Complete a stock receipt: update status, adjust stock and add ledger
app.post('/api/stock_receipts/:id/complete', async (req, res) => {
  try {
    const id = req.params.id;
    const sr = await StockReceipt.findById(id);
    if (!sr) return res.status(404).json({ error: 'Receipt not found' });
    sr.status = 'completed';
    sr.completed_at = new Date();
    await sr.save();

    // Adjust stock: find existing stock doc
    let stockDoc = await Stock.findOne({ product_id: sr.product_id, warehouse_id: sr.warehouse_id });
    if (stockDoc) {
      stockDoc.quantity = (stockDoc.quantity || 0) + (sr.quantity || 0);
      stockDoc.updated_at = new Date();
      await stockDoc.save();
    } else {
      stockDoc = await new Stock({
        product_id: sr.product_id,
        warehouse_id: sr.warehouse_id,
        quantity: sr.quantity || 0,
      }).save();
    }

    // Add ledger entry
    await new StockLedger({
      product_id: sr.product_id,
      warehouse_id: sr.warehouse_id,
      quantity_change: sr.quantity,
      quantity_after: stockDoc.quantity,
      type: 'receipt',
    }).save();

    res.json({ ok: true, receipt: sr });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to complete receipt', details: err.message });
  }
});

// Stock ledger: return recent entries
app.get('/api/stock_ledger', async (req, res) => {
  try {
    const entries = await StockLedger.find().sort({ created_at: -1 }).limit(50).populate('product_id warehouse_id');
    res.json(entries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load stock ledger' });
  }
});

// Stock summary (simple list of stock documents)
app.get('/api/stock', async (req, res) => {
  try {
    const list = await Stock.find().populate('product_id warehouse_id');
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load stock' });
  }
});

// Low stock alerts
app.get('/api/low_stock_alerts', async (req, res) => {
  try {
    const alerts = await LowStockAlert.find().sort({ created_at: -1 }).populate('product_id warehouse_id');
    res.json(alerts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load low stock alerts' });
  }
});

app.post('/api/low_stock_alerts/:id/acknowledge', async (req, res) => {
  try {
    const id = req.params.id;
    const alert = await LowStockAlert.findById(id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    
    alert.is_acknowledged = true;
    alert.acknowledged_at = new Date();
    // In production, extract user ID from auth token; for now use placeholder
    alert.acknowledged_by = req.body.user_id || 'system';
    await alert.save();
    
    res.json({ ok: true, alert });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// Authentication endpoints
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Sign up
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      full_name,
      is_active: true,
    });
    
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        is_active: user.is_active,
        created_at: user.created_at,
      },
      token,
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Failed to create user', details: err.message });
  }
});

// Sign in
app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is inactive' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        is_active: user.is_active,
        created_at: user.created_at,
      },
      token,
    });
  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ error: 'Failed to sign in', details: err.message });
  }
});

// Get current user (verify token)
app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        is_active: user.is_active,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error('Auth verification error:', err);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Password Reset - Request OTP
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({ message: 'If the email exists, an OTP has been sent' });
    }
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiry to 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    // Save OTP to database
    await OTP.create({
      email: email.toLowerCase(),
      otp,
      type: 'password_reset',
      expires_at: expiresAt,
    });
    
    // In a real application, send email here using nodemailer
    // For now, we'll just log it (in production, remove this)
    console.log(`OTP for ${email}: ${otp} (expires at ${expiresAt})`);
    
    // For development purposes, include OTP in response (REMOVE IN PRODUCTION!)
    res.json({ 
      message: 'OTP sent to email',
      // Remove this in production:
      dev_otp: otp,
      dev_note: 'OTP is included in response for development only. Check server console or implement email service.'
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Password Reset - Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }
    
    // Find valid OTP
    const otpRecord = await OTP.findOne({
      email: email.toLowerCase(),
      otp,
      type: 'password_reset',
      is_used: false,
      expires_at: { $gt: new Date() },
    });
    
    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    
    // Mark OTP as used
    otpRecord.is_used = true;
    await otpRecord.save();
    
    // Generate a temporary reset token (valid for 15 minutes)
    const resetToken = jwt.sign(
      { email: email.toLowerCase(), type: 'password_reset' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    res.json({ 
      message: 'OTP verified successfully',
      reset_token: resetToken,
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// Password Reset - Set New Password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { reset_token, new_password } = req.body;
    
    if (!reset_token || !new_password) {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }
    
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(reset_token, JWT_SECRET);
      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid token type');
      }
    } catch (err) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    // Find user
    const user = await User.findOne({ email: decoded.email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);
    
    // Update password
    user.password = hashedPassword;
    user.updated_at = new Date();
    await user.save();
    
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
