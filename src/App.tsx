// @ts-nocheck
import React, { useEffect, useState } from "react";
import { ExploreView } from "./ExploreView";
import { EditView } from "./EditView";

// --- Minimal fast prototype with two views: Explore (graph) and Edit (admin) ---
// - Local-only data (persisted to localStorage)
// - Click nodes to open details
// - Hover edges to see an overlay with relation + endpoints
// - Add/update books on Edit tab, including connections and notes
// - Import/Export JSON for quick demos

export const TAG_COLORS = ["#93c5fd", "#a7f3d0", "#fca5a5", "#fcd34d", "#c4b5fd", "#f9a8d4", "#86efac", "#fda4af", "#93c5fd"];

// Simple slugify for IDs
export function slugify(text) {
  return (text || "").toString().toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "").replace(/\-+/g, "-").replace(/^-+|-+$/g, "");
}

import SEED_GRAPH from './seed/book-graph-120.json';

// (Optional) add a type if you’re using TS
type NodeData = { id: string; title: string; author?: string; year?: number; tags?: string[]; abstract?: string; url?: string; notes?: string };
type EdgeData = { id?: string; source: string; target: string; relation?: string; weight?: number };
type GraphData = { nodes: NodeData[]; edges: EdgeData[] };

const STORAGE_KEY = 'bookGraph:v4:123';

function useGraph() {
  const [graph, setGraph] = React.useState<GraphData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : (SEED_GRAPH as GraphData);
  });

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(graph));
  }, [graph]);

  return [graph, setGraph] as const;
}

function useLocalGraph() {
  const [graph, setGraph] = useState(() => {
    const stored = localStorage.getItem("bookGraph");
    return stored ? JSON.parse(stored) : DEFAULT_GRAPH;
  });
  useEffect(() => {
    localStorage.setItem("bookGraph", JSON.stringify(graph));
  }, [graph]);
  return [graph, setGraph];
}

export default function App() {
  const [tab, setTab] = useState("explore"); // "explore" | "edit"
  const [graph, setGraph] = useGraph();
  const [query, setQuery] = useState("");

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between px-5 py-3 border-b border-slate-800 sticky top-0 bg-slate-950/80 backdrop-blur z-10">
        <h1 className="text-xl font-semibold tracking-tight">BookGraph – V1</h1>
        <nav className="flex gap-2">
          <button onClick={() => setTab("explore")} className={`px-3 py-1.5 rounded-lg border ${tab === "explore" ? "bg-sky-500/20 border-sky-500/40" : "border-slate-700 hover:border-slate-600"}`}>Explore</button>
          <button onClick={() => setTab("edit")} className={`px-3 py-1.5 rounded-lg border ${tab === "edit" ? "bg-sky-500/20 border-sky-500/40" : "border-slate-700 hover:border-slate-600"}`}>Edit</button>
        </nav>
      </header>

      {tab === "explore" ? (
        <ExploreView graph={graph} setQuery={setQuery} query={query} />
      ) : (
        <EditView graph={graph} setGraph={setGraph} />
      )}
    </div>
  );
}

