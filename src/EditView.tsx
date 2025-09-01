import React, { useState } from "react";
import { slugify } from "./App";

// adding and or remove graphs 
export function EditView({ graph, setGraph }) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [year, setYear] = useState("");
  const [tags, setTags] = useState("");
  const [abstract, setAbstract] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [connections, setConnections] = useState([]); // array of node ids
  const [relation, setRelation] = useState("");
  const [weight, setWeight] = useState(2);
  const [error, setError] = useState("");

  const nodeOptions = (graph.nodes || []).map(n => ({ id: n.id, label: n.title || n.id }));

  const handleAdd = () => {
    setError("");
    const id = slugify(title);
    if (!id) return setError("Please enter a title.");
    if (graph.nodes.find(n => n.id === id)) return setError("A book with this title/ID already exists.");

    const node = {
      id,
      title: title.trim(),
      author: author.trim() || undefined,
      year: year ? Number(year) : undefined,
      tags: tags ? tags.split(",").map(s => s.trim()).filter(Boolean) : [],
      abstract: abstract.trim() || undefined,
      url: url.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    const newEdges = (connections || []).map((targetId, i) => ({
      id: `${id}__${targetId}__${Date.now()}_${i}`,
      source: id,
      target: targetId,
      relation: relation.trim() || "related",
      weight: Number(weight) || 2,
    }));

    setGraph({
      nodes: [...graph.nodes, node],
      edges: [...graph.edges, ...newEdges],
    });

    // reset a few fields but keep relation/weight for rapid entry
    setTitle("");
    setAuthor("");
    setYear("");
    setTags("");
    setAbstract("");
    setUrl("");
    setNotes("");
    setConnections([]);
  };

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(graph, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", "book-graph.json");
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const importJSON = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) throw new Error("Bad schema");
        setGraph(parsed);
      } catch (e) {
        alert("Invalid JSON file. Expected { nodes: [], edges: [] }.");
      }
    };
    reader.readAsText(file);
  };

  const removeNode = (id) => {
    if (!confirm("Delete this node and its connected edges?")) return;
    const nodes = graph.nodes.filter(n => n.id !== id);
    const edges = graph.edges.filter(e => e.source !== id && e.target !== id);
    setGraph({ nodes, edges });
  };

  return (
    <div className="grid grid-cols-12 gap-0">
      <div className="col-span-7 border-r border-slate-800 p-4">
        <h2 className="text-lg font-semibold mb-3">Add a new book</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-sm text-slate-300">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 rounded-md bg-slate-900 border border-slate-700 outline-none focus:border-sky-500" placeholder="e.g., Society of the Spectacle" />
          </div>
          <div>
            <label className="text-sm text-slate-300">Author</label>
            <input value={author} onChange={e => setAuthor(e.target.value)} className="w-full px-3 py-2 rounded-md bg-slate-900 border border-slate-700 outline-none focus:border-sky-500" />
          </div>
          <div>
            <label className="text-sm text-slate-300">Year</label>
            <input value={year} onChange={e => setYear(e.target.value)} className="w-full px-3 py-2 rounded-md bg-slate-900 border border-slate-700 outline-none focus:border-sky-500" placeholder="e.g., 1967" />
          </div>
          <div className="col-span-2">
            <label className="text-sm text-slate-300">Tags (comma-separated)</label>
            <input value={tags} onChange={e => setTags(e.target.value)} className="w-full px-3 py-2 rounded-md bg-slate-900 border border-slate-700 outline-none focus:border-sky-500" placeholder="theory, class" />
          </div>
          <div className="col-span-2">
            <label className="text-sm text-slate-300">Abstract</label>
            <textarea value={abstract} onChange={e => setAbstract(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-md bg-slate-900 border border-slate-700 outline-none focus:border-sky-500" />
          </div>
          <div className="col-span-2">
            <label className="text-sm text-slate-300">URL</label>
            <input value={url} onChange={e => setUrl(e.target.value)} className="w-full px-3 py-2 rounded-md bg-slate-900 border border-slate-700 outline-none focus:border-sky-500" placeholder="https://…" />
          </div>
          <div className="col-span-2">
            <label className="text-sm text-slate-300">Notes (private or public blurb)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-md bg-slate-900 border border-slate-700 outline-none focus:border-sky-500" />
          </div>
          <div className="col-span-2 grid grid-cols-2 gap-3 items-start">
            <div>
              <label className="text-sm text-slate-300">Connect to (pick multiple)</label>
              <div className="max-h-40 overflow-auto mt-1 border border-slate-700 rounded-md">
                {nodeOptions.map(opt => (
                  <label key={opt.id} className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-800 last:border-b-0">
                    <input type="checkbox" checked={connections.includes(opt.id)} onChange={(e) => {
                      setConnections(prev => e.target.checked ? [...prev, opt.id] : prev.filter(id => id !== opt.id));
                    }} />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-300">Relation (edge label)</label>
              <input value={relation} onChange={e => setRelation(e.target.value)} className="w-full px-3 py-2 rounded-md bg-slate-900 border border-slate-700 outline-none focus:border-sky-500" placeholder="e.g., influences, debates" />
              <label className="text-sm text-slate-300 block mt-3">Weight (edge thickness)</label>
              <input type="number" min={1} max={8} value={weight} onChange={e => setWeight(e.target.value)} className="w-24 px-3 py-2 rounded-md bg-slate-900 border border-slate-700 outline-none focus:border-sky-500" />
            </div>
          </div>
        </div>

        {error && <div className="mt-3 text-red-400 text-sm">{error}</div>}
        <div className="mt-4 flex gap-2">
          <button onClick={handleAdd} className="px-4 py-2 rounded-lg border border-sky-500/50 bg-sky-500/15 hover:bg-sky-500/25">Add book</button>
          <button onClick={exportJSON} className="px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-600">Export JSON</button>
          <label className="px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-600 cursor-pointer">
            Import JSON
            <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importJSON(e.target.files[0])} />
          </label>
        </div>
      </div>

      <div className="col-span-5 p-4">
        <h2 className="text-lg font-semibold mb-3">Existing books</h2>
        <div className="space-y-2 max-h-[calc(100vh-9rem)] overflow-auto pr-1">
          {graph.nodes.map(n => (
            <div key={n.id} className="rounded-lg border border-slate-800 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{n.title}</div>
                  <div className="text-xs text-slate-400">{n.author} {n.year ? `• ${n.year}` : ""}</div>
                </div>
                <button onClick={() => removeNode(n.id)} className="text-red-400 text-xs hover:underline">Delete</button>
              </div>
              {n.tags?.length ? (
                <div className="flex flex-wrap gap-1 mt-2">
                  {n.tags.map(tag => <span key={tag} className="text-2xs px-2 py-0.5 rounded-full border border-slate-700">{tag}</span>)}
                </div>
              ) : null}
              {n.notes && <p className="text-sm text-slate-300 mt-2 line-clamp-3">{n.notes}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
