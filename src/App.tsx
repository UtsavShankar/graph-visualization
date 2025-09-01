import React, { useEffect, useState } from "react";
import { ExploreView } from "./ExploreView";
import { EditView } from "./EditView";

// --- Minimal fast prototype with two views: Explore (graph) and Edit (admin) ---
// - Local-only data (persisted to localStorage)
// - Click nodes to open details
// - Hover edges to see an overlay with relation + endpoints
// - Add/update books on Edit tab, including connections and notes
// - Import/Export JSON for quick demos
//Default nodes for view purposes 
const DEFAULT_GRAPH = {
  nodes: [
    { id: "bourdieu-distinction", title: "Distinction", author: "Pierre Bourdieu", year: 1979, tags: ["theory", "class"], abstract: "Taste and social reproduction.", url: "https://en.wikipedia.org/wiki/Distinction_(book)", notes: "Classic in sociology of culture." },
    { id: "geertz-interpretation", title: "The Interpretation of Cultures", author: "Clifford Geertz", year: 1973, tags: ["anthropology", "symbolic"], abstract: "Thick description and meaning.", url: "https://en.wikipedia.org/wiki/The_Interpretation_of_Cultures", notes: "Symbolic anthropology." },
    { id: "foucault-discipline", title: "Discipline and Punish", author: "Michel Foucault", year: 1975, tags: ["theory", "power"], abstract: "Power/discipline, the panopticon.", url: "https://en.wikipedia.org/wiki/Discipline_and_Punish", notes: "Historical sociology of punishment." },
    { id: "latour-reassembling", title: "Reassembling the Social", author: "Bruno Latour", year: 2005, tags: ["STS", "method"], abstract: "Actor-Network Theory methods.", url: "https://en.wikipedia.org/wiki/Bruno_Latour", notes: "Methods primer for ANT." },
    { id: "anderson-imagined", title: "Imagined Communities", author: "Benedict Anderson", year: 1983, tags: ["nationalism"], abstract: "Nations as imagined communities.", url: "https://en.wikipedia.org/wiki/Imagined_Communities", notes: "Political communities & print capitalism." },
    { id: "butler-gender", title: "Gender Trouble", author: "Judith Butler", year: 1990, tags: ["gender", "theory"], abstract: "Gender performativity.", url: "https://en.wikipedia.org/wiki/Gender_Trouble", notes: "Foundational gender theory." },
  ],
  edges: [
    { id: "e1", source: "bourdieu-distinction", target: "geertz-interpretation", relation: "debates meaning vs. reproduction", weight: 3 },
    { id: "e2", source: "foucault-discipline", target: "bourdieu-distinction", relation: "influences power/habitus", weight: 4 },
    { id: "e3", source: "latour-reassembling", target: "geertz-interpretation", relation: "ANT vs. thick description", weight: 2 },
    { id: "e4", source: "anderson-imagined", target: "geertz-interpretation", relation: "shared focus on symbols", weight: 2 },
    { id: "e5", source: "butler-gender", target: "foucault-discipline", relation: "extends theories of power", weight: 5 },
  ],
};

export const TAG_COLORS = ["#93c5fd", "#a7f3d0", "#fca5a5", "#fcd34d", "#c4b5fd", "#f9a8d4", "#86efac", "#fda4af", "#93c5fd"];

// Simple slugify for IDs
export function slugify(text) {
  return (text || "").toString().toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "").replace(/\-+/g, "-").replace(/^-+|-+$/g, "");
}

//using a local graph to store data in local storage
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
  const [graph, setGraph] = useLocalGraph();
  const [query, setQuery] = useState("");

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between px-5 py-3 border-b border-slate-800 sticky top-0 bg-slate-950/80 backdrop-blur z-10">
        <h1 className="text-xl font-semibold tracking-tight">BookGraph – Prototype</h1>
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

