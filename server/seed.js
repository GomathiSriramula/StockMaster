require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Warehouse = require('./models/Warehouse');
const Stock = require('./models/Stock');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/stockmaster';

async function seed() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB for seeding');

  const categories = [
    { name: 'Electronics', description: 'Electronic devices and accessories' },
    { name: 'Office Supplies', description: 'Stationery, paper, pens, and office materials' },
    { name: 'Food & Beverage', description: 'Perishable and non-perishable food items' },
    { name: 'Cleaning', description: 'Cleaning supplies and chemicals' },
    { name: 'Clothing', description: 'Garments and wearable items' },
    { name: 'Accessories', description: 'Small accessories and add-ons' },
    { name: 'Hardware', description: 'Tools, nuts, bolts, and hardware parts' },
  ];

  for (const c of categories) {
    const exists = await Category.findOne({ name: c.name });
    if (!exists) {
      await new Category(c).save();
      console.log('Inserted category', c.name);
    }
  }

  // Insert sample product
  const general = await Category.findOne({ name: 'Food & Beverage' }) || await Category.findOne();
  const existing = await Product.findOne({ sku: 'BAN-002' });
  let product;
  if (!existing) {
    product = await new Product({
      name: 'Banana',
      sku: 'BAN-002',
      category_id: general ? general._id : null,
      unit: 'dozen',
      reorder_level: 5,
      description: 'Sample product inserted by seeder',
      is_active: true,
    }).save();
    console.log('Inserted sample product Banana');
  } else {
    product = existing;
  }

  // Create sample warehouse if it doesn't exist
  let warehouse = await Warehouse.findOne({ code: 'WH001' });
  if (!warehouse) {
    warehouse = await new Warehouse({
      name: 'Main Warehouse',
      code: 'WH001',
      location: '123 Main Street, New York|40.712800,-74.006000',
      manager_id: 'Admin',
      is_active: true
    }).save();
    console.log('Inserted sample warehouse');
  }

  // Create initial stock for the sample product
  const stockExists = await Stock.findOne({ product_id: product._id, warehouse_id: warehouse._id });
  if (!stockExists) {
    await new Stock({
      product_id: product._id,
      warehouse_id: warehouse._id,
      quantity: 100
    }).save();
    console.log('Inserted initial stock: 100 dozen bananas in Main Warehouse');
  }

  console.log('Seeding complete');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error', err);
  process.exit(1);
});
