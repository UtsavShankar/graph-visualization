-- Row Level Security (RLS) Policies for Public Access
--
-- IMPORTANT: Apply these policies in your Supabase SQL Editor
-- to allow anonymous users to interact with the database.
--
-- This is required because your GitHub Pages site uses the Supabase
-- anonymous key without authentication.
--
-- How to apply:
-- 1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
-- 2. Copy and paste this entire file
-- 3. Click "Run" to execute
-- 4. Verify policies are created in the Authentication > Policies section

-- First, ensure RLS is enabled on all tables
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE edges ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public read access to courses" ON courses;
DROP POLICY IF EXISTS "Allow public read access to nodes" ON nodes;
DROP POLICY IF EXISTS "Allow public read access to edges" ON edges;
DROP POLICY IF EXISTS "Allow public insert to courses" ON courses;
DROP POLICY IF EXISTS "Allow public insert to nodes" ON nodes;
DROP POLICY IF EXISTS "Allow public insert to edges" ON edges;
DROP POLICY IF EXISTS "Allow public update to courses" ON courses;
DROP POLICY IF EXISTS "Allow public update to nodes" ON nodes;
DROP POLICY IF EXISTS "Allow public update to edges" ON edges;
DROP POLICY IF EXISTS "Allow public delete to courses" ON courses;
DROP POLICY IF EXISTS "Allow public delete to nodes" ON nodes;
DROP POLICY IF EXISTS "Allow public delete to edges" ON edges;

-- Create policies for public read access
CREATE POLICY "Allow public read access to courses" ON courses
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to nodes" ON nodes
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to edges" ON edges
  FOR SELECT USING (true);

-- Create policies for public insert access
CREATE POLICY "Allow public insert to courses" ON courses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public insert to nodes" ON nodes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public insert to edges" ON edges
  FOR INSERT WITH CHECK (true);

-- Create policies for public update access
CREATE POLICY "Allow public update to courses" ON courses
  FOR UPDATE USING (true);

CREATE POLICY "Allow public update to nodes" ON nodes
  FOR UPDATE USING (true);

CREATE POLICY "Allow public update to edges" ON edges
  FOR UPDATE USING (true);

-- Create policies for public delete access
CREATE POLICY "Allow public delete to courses" ON courses
  FOR DELETE USING (true);

CREATE POLICY "Allow public delete to nodes" ON nodes
  FOR DELETE USING (true);

CREATE POLICY "Allow public delete to edges" ON edges
  FOR DELETE USING (true);

-- Verification query - run this separately after applying policies above
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('courses', 'nodes', 'edges')
-- ORDER BY tablename, cmd;
