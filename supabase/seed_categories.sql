-- Seed common categories for development
-- Run this in Supabase Dashboard -> SQL editor (it runs with admin privileges)

INSERT INTO public.categories (name, description)
SELECT 'Electronics', 'Electronic devices and accessories'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Electronics');

INSERT INTO public.categories (name, description)
SELECT 'Office Supplies', 'Stationery, paper, pens, and office materials'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Office Supplies');

INSERT INTO public.categories (name, description)
SELECT 'Food & Beverage', 'Perishable and non-perishable food items'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Food & Beverage');

INSERT INTO public.categories (name, description)
SELECT 'Cleaning', 'Cleaning supplies and chemicals'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Cleaning');

INSERT INTO public.categories (name, description)
SELECT 'Clothing', 'Garments and wearable items'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Clothing');

INSERT INTO public.categories (name, description)
SELECT 'Accessories', 'Small accessories and add-ons'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Accessories');

INSERT INTO public.categories (name, description)
SELECT 'Hardware', 'Tools, nuts, bolts, and hardware parts'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Hardware');

-- After running: sign in to the app, open Add Product modal, and click "Reload categories" to fetch them.
