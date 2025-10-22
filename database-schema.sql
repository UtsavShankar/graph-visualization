-- Create courses table
CREATE TABLE courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create nodes table
CREATE TABLE nodes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT,
  author TEXT,
  year INTEGER,
  color TEXT,
  tags TEXT[] DEFAULT '{}',
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  abstract TEXT,
  notes TEXT,
  pos JSONB, -- Store position as {x: number, y: number}
  metadata JSONB, -- Store custom key-value pairs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create edges table
CREATE TABLE edges (
  id TEXT PRIMARY KEY,
  source TEXT REFERENCES nodes(id) ON DELETE CASCADE,
  target TEXT REFERENCES nodes(id) ON DELETE CASCADE,
  relation TEXT DEFAULT 'related',
  weight INTEGER DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_nodes_course_id ON nodes(course_id);
CREATE INDEX idx_nodes_title ON nodes(title);
CREATE INDEX idx_edges_source ON edges(source);
CREATE INDEX idx_edges_target ON edges(target);

-- Enable Row Level Security (RLS)
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE edges ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (since this is for GitHub Pages)
CREATE POLICY "Allow public read access to courses" ON courses
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to nodes" ON nodes
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to edges" ON edges
  FOR SELECT USING (true);

-- Allow public insert/update/delete for now (you may want to restrict this later)
CREATE POLICY "Allow public insert to courses" ON courses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public insert to nodes" ON nodes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public insert to edges" ON edges
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to courses" ON courses
  FOR UPDATE USING (true);

CREATE POLICY "Allow public update to nodes" ON nodes
  FOR UPDATE USING (true);

CREATE POLICY "Allow public update to edges" ON edges
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete to courses" ON courses
  FOR DELETE USING (true);

CREATE POLICY "Allow public delete to nodes" ON nodes
  FOR DELETE USING (true);

CREATE POLICY "Allow public delete to edges" ON edges
  FOR DELETE USING (true);

-- Insert initial courses based on your existing data
INSERT INTO courses (name, color) VALUES
  ('AN1101', '#22c55e'),
  ('AN2203', '#f97316'),
  ('SC2209', '#a855f7'),
  ('SC3204', '#ec4899');
