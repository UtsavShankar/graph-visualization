// @ts-nocheck
import React, { useEffect, useState } from "react";
import { ExploreView } from "./ExploreView";
import { EditView } from "./EditView";
import { getGraphData, getCourses } from "./lib/database";
import { Node, Edge, Course } from "./lib/supabase";

// --- BookGraph with Supabase database ---
// - Database-backed data with courses and nodes
// - Click nodes to open details
// - Hover edges to see an overlay with relation + endpoints
// - Add/update books on Edit tab, including connections and notes
// - Course-based organization with colors

export const TAG_COLORS = ["#93c5fd", "#a7f3d0", "#fca5a5", "#fcd34d", "#c4b5fd", "#f9a8d4", "#86efac", "#fda4af", "#93c5fd"];

// Simple slugify for IDs
export function slugify(text) {
  return (text || "").toString().toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "").replace(/\-+/g, "-").replace(/^-+|-+$/g, "");
}

// Graph data types
type GraphData = { nodes: Node[]; edges: Edge[] };

// Custom hook for Supabase data
function useSupabaseGraph() {
  const [graph, setGraph] = useState<GraphData>({ nodes: [], edges: [] });
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [graphData, coursesData] = await Promise.all([
        getGraphData(),
        getCourses()
      ]);
      
      setGraph(graphData);
      setCourses(coursesData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return { graph, setGraph, courses, loading, error, refetch: loadData };
}

export default function App() {
  const { graph, setGraph, courses, loading, error, refetch } = useSupabaseGraph();
  const [query, setQuery] = useState("");

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading BookGraph...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-4">Error loading data</div>
          <p className="text-slate-400 mb-4">{error}</p>
          <button 
            onClick={refetch}
            className="px-4 py-2 rounded-lg border border-sky-500/50 bg-sky-500/15 hover:bg-sky-500/25"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between px-5 py-3 border-b border-slate-800 sticky top-0 bg-slate-950/80 backdrop-blur z-10">
        <h1 className="text-xl font-semibold tracking-tight">BookGraph – V2 (Supabase)</h1>
      </header>

      <ExploreView 
        graph={graph} 
        setGraph={setGraph}
        setQuery={setQuery} 
        query={query} 
        courses={courses} 
      />
    </div>
  );
}

