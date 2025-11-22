import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const categories = [
  { name: 'Electronics', description: 'Electronic devices and accessories' },
  { name: 'Office Supplies', description: 'Stationery, paper, pens, and office materials' },
  { name: 'Food & Beverage', description: 'Perishable and non-perishable food items' },
  { name: 'Cleaning', description: 'Cleaning supplies and chemicals' },
  { name: 'Clothing', description: 'Garments and wearable items' },
  { name: 'Accessories', description: 'Small accessories and add-ons' },
  { name: 'Hardware', description: 'Tools, nuts, bolts, and hardware parts' },
];

async function seed() {
  try {
    for (const cat of categories) {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name: cat.name, description: cat.description }])
        .select();

      if (error) {
        // If it's a conflict due to existing rows, continue
        console.error('Insert error for', cat.name, error.message || error);
      } else {
        console.log('Inserted category:', data[0].name);
      }
    }
    console.log('Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
