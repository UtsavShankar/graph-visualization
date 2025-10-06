import React, { useState, useEffect } from 'react';
import { Course } from '../lib/supabase';
import { slugify } from '../App';

interface NodeFormProps {
  node?: any; // Existing node for editing
  courses: Course[];
  onSubmit: (nodeData: any) => Promise<void>;
  onCancel: () => void;
  isOpen: boolean;
}

export function NodeForm({ node, courses, onSubmit, onCancel, isOpen }: NodeFormProps) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [year, setYear] = useState("");
  const [tags, setTags] = useState("");
  const [abstract, setAbstract] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (node) {
      setTitle(node.title || "");
      setAuthor(node.author || "");
      setYear(node.year ? node.year.toString() : "");
      setTags(node.tags ? node.tags.join(", ") : "");
      setAbstract(node.abstract || "");
      setUrl(node.url || "");
      setNotes(node.notes || "");
    } else {
      // Reset form for new node
      setTitle("");
      setAuthor("");
      setYear("");
      setTags("");
      setAbstract("");
      setUrl("");
      setNotes("");
    }
    setError("");
  }, [node, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const id = slugify(title);
      if (!id) {
        setError("Please enter a title.");
        return;
      }

      // Find the course for this node
      const courseName = tags ? tags.split(",")[0].trim() : "";
      const course = courses?.find(c => c.name === courseName);
      if (!course) {
        setError("Please enter a valid course tag (e.g., AN1101).");
        return;
      }

      const nodeData = {
        id,
        title: title.trim(),
        author: author.trim() || undefined,
        year: year ? Number(year) : undefined,
        tags: tags ? tags.split(",").map(s => s.trim()).filter(Boolean) : [],
        abstract: abstract.trim() || undefined,
        url: url.trim() || undefined,
        notes: notes.trim() || undefined,
        course_id: course.id,
        color: course.color
      };

      await onSubmit(nodeData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save node");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">
          {node ? "Edit Node" : "Add New Node"}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm text-slate-300 mb-1">Title *</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 outline-none focus:border-sky-500"
                placeholder="e.g., Society of the Spectacle"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm text-slate-300 mb-1">Author</label>
              <input
                value={author}
                onChange={e => setAuthor(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 outline-none focus:border-sky-500"
              />
            </div>
            
            <div>
              <label className="block text-sm text-slate-300 mb-1">Year</label>
              <input
                value={year}
                onChange={e => setYear(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 outline-none focus:border-sky-500"
                placeholder="e.g., 1967"
                type="number"
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm text-slate-300 mb-1">Tags (comma-separated) *</label>
              <input
                value={tags}
                onChange={e => setTags(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 outline-none focus:border-sky-500"
                placeholder="AN1101, theory, class"
                required
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm text-slate-300 mb-1">Abstract</label>
              <textarea
                value={abstract}
                onChange={e => setAbstract(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 outline-none focus:border-sky-500"
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm text-slate-300 mb-1">URL</label>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 outline-none focus:border-sky-500"
                placeholder="https://…"
                type="url"
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm text-slate-300 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 outline-none focus:border-sky-500"
                placeholder="Private or public notes about this book"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-sky-500/50 bg-sky-500/15 hover:bg-sky-500/25 disabled:opacity-50"
            >
              {loading ? "Saving..." : (node ? "Update" : "Add")}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-600"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
