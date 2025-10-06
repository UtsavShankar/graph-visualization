// scripts/import-json.ts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

type InputNode = {
  id: string;
  title: string;
  url?: string;
  author?: string;
  year?: number;
  course: string;   // e.g., 'an1101e'
  color?: string;   // node-level color
};
type InputEdge = {
  id?: string;
  source?: string;
  target?: string;
  source_id?: string;
  target_id?: string;
  relation?: string;
  weight?: number;
};
type InputJson = { nodes: InputNode[]; edges?: InputEdge[] };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || // preferred for migrations
  process.env.SUPABASE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL and/or Supabase key in env.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Get or create a course row by "name", return its UUID id
async function ensureCourseByName(name: string, color?: string): Promise<string> {
  // 1) try to find by name
  const { data: found, error: selErr } = await supabase
    .from('courses')
    .select('id, name, color')
    .eq('name', name)
    .maybeSingle();

  if (selErr) throw selErr;

  if (found?.id) {
    // Optionally update color if provided and changed
    if (color && found.color !== color) {
      const { error: updErr } = await supabase
        .from('courses')
        .update({ color })
        .eq('id', found.id);
      if (updErr) throw updErr;
    }
    return found.id as string;
  }

  // 2) insert new course; let DB generate UUID id
  const { data: inserted, error: insErr } = await supabase
    .from('courses')
    .insert([{ name, color: color ?? '#93c5fd' }])
    .select('id')
    .single();

  if (insErr) throw insErr;
  return inserted!.id as string;
}

async function main() {
  const jsonPath = process.argv[2] || 'data/combined.json';
  const full = path.resolve(jsonPath);
  const raw = fs.readFileSync(full, 'utf8');
  const data: InputJson = JSON.parse(raw);

  if (!Array.isArray(data.nodes)) {
    throw new Error('JSON must contain a "nodes" array.');
  }

  // Build distinct course codes and remember a representative color
  const courseColorByCode = new Map<string, string>();
  for (const n of data.nodes) {
    const code = n.course.toLowerCase();
    if (!courseColorByCode.has(code) && n.color) {
      courseColorByCode.set(code, n.color);
    }
  }

  // Ensure courses exist by NAME = uppercase(course code)
  const courseIdByCode = new Map<string, string>(); // code -> UUID
  for (const [code, color] of courseColorByCode.entries()) {
    const name = code.toUpperCase();
    const id = await ensureCourseByName(name, color);
    courseIdByCode.set(code, id);
    console.log(`→ Course ${name} = ${id}`);
  }

  // Also handle any course that had no color in the first pass
  for (const n of data.nodes) {
    const code = n.course.toLowerCase();
    if (!courseIdByCode.has(code)) {
      const name = code.toUpperCase();
      const id = await ensureCourseByName(name, n.color);
      courseIdByCode.set(code, id);
      console.log(`→ Course ${name} = ${id}`);
    }
  }

  // Prepare node rows with UUID course_id
  const nodesPayload = data.nodes.map((n) => {
    const code = n.course.toLowerCase();
    const course_id = courseIdByCode.get(code);
    if (!course_id) {
      throw new Error(`Missing course_id for code "${code}".`);
    }
    return {
      id: n.id,
      title: n.title,
      url: n.url ?? null,
      author: n.author ?? null,
      year: n.year ?? null,
      color: n.color ?? null,     // keep node override if present
      tags: [] as string[],       // your JSON doesn't include tags yet
      course_id,                  // ← UUID FK
      abstract: null,
      notes: null,
      pos: null                   // set later from UI if you store positions
      // omit created_at / updated_at to let DB defaults fill them
    };
  });

  console.log(`→ Upserting ${nodesPayload.length} nodes…`);
  await chunkedUpsert('nodes', nodesPayload, 'id');

  // Edges (optional—your JSON currently has none)
  const rawEdges = Array.isArray(data.edges) ? data.edges : [];
  if (rawEdges.length) {
    const edgesPayload = rawEdges.map((e) => ({
      id: e.id, // omit if your table auto-generates
      source: (e.source || e.source_id)!,
      target: (e.target || e.target_id)!,
      relation: e.relation ?? null,
      weight: e.weight ?? 1
      // omit created_at to use DB default
    }));
    console.log(`→ Inserting ${edgesPayload.length} edges…`);
    await chunkedInsert('edges', edgesPayload);
  } else {
    console.log('→ No edges in JSON. Skipping edges import.');
  }

  console.log('✅ Import complete.');
}

async function chunkedUpsert(
  table: 'nodes',
  rows: any[],
  onConflict: string,
  chunkSize = 200
) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const slice = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).upsert(slice, { onConflict });
    if (error) {
      console.error(`❌ Upsert failed on ${table} [${i}-${i + slice.length}]:`, error.message);
      throw error;
    }
    console.log(`   …${table} ${i + slice.length}/${rows.length}`);
  }
}

async function chunkedInsert(table: 'edges', rows: any[], chunkSize = 500) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const slice = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).insert(slice);
    if (error) {
      console.error(`❌ Insert failed on ${table} [${i}-${i + slice.length}]:`, error.message);
      throw error;
    }
    console.log(`   …${table} ${i + slice.length}/${rows.length}`);
  }
}

main().catch((e) => {
  console.error('Import error:', e);
  process.exit(1);
});
