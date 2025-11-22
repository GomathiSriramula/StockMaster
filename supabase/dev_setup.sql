-- Dev convenience SQL: create `categories` table if missing and permit SELECT for authenticated users
-- Run this in Supabase Dashboard -> SQL editor. WARNING: permissive policies below are for development only.

-- Ensure uuid extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Enable row level security (keeps parity with project migrations)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- DEV Policy: allow authenticated users to SELECT categories
-- This makes the dropdown work during development when users are signed in.
-- Remove or tighten before production.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE polname = 'auth_select_categories' AND polrelid = 'public.categories'::regclass
  ) THEN
    CREATE POLICY auth_select_categories ON public.categories
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END$$;

-- Optional: insert some sample categories if none exist
INSERT INTO public.categories (name, description)
SELECT 'General', 'General products'
WHERE NOT EXISTS (SELECT 1 FROM public.categories);

-- Example: after running this, your app should be able to SELECT categories
-- If you still see 404s in the app, check that the client is actually authenticated
-- (supabase.auth.getSession()) and that the request includes an Authorization header.
