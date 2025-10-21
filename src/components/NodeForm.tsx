import React, { useState, useEffect } from 'react';
import { Course } from '../lib/supabase';
import { slugify } from '../App';

interface NodeFormProps {
  node?: any;
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
  const [links, setLinks] = useState<string[]>([]);
  const [details, setDetails] = useState<{ key: string; value: string }[]>([]);
  const [notes, setNotes] = useState("");
  const [color, setColor] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (node) {
      setTitle(node.title || "");
      setAuthor(node.author || "");
      setYear(node.year ? node.year.toString() : "");
      setTags(node.tags ? node.tags.join(", ") : "");
      setAbstract(node.abstract || "");
      setLinks(node.links || (node.url ? [node.url] : []));
      setDetails(node.details ? Object.entries(node.details).map(([key, value]) => ({ key, value: String(value) })) : []);
      setNotes(node.notes || "");
      setColor(node.color || "");
    } else {
      setTitle("");
      setAuthor("");
      setYear("");
      setTags("");
      setAbstract("");
      setLinks([""]);
      setDetails([{ key: "", value: "" }]);
      setNotes("");
      setColor("");
    }
    setError("");
  }, [node, isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!title) {
        setError("Please enter a title.");
        return;
      }

      const courseName = tags ? tags.split(",")[0].trim() : "";
      const courseRegex = /^[A-Z]{2}\d{4}$/i;
      if (!courseName || !courseRegex.test(courseName)) {
        setError("Please ensure the first tag is a valid course code (e.g., AN1101).");
        return;
      }

      const course = courses.find(c => c.name.toLowerCase() === courseName.toLowerCase());
      if (!course) {
        setError(`Course not found for tag: ${courseName}`);
        return;
      }

      const colorValue = color?.trim() || course.color;

      const detailsObject = details.reduce((obj, { key, value }) => {
        if (key && value) {
          obj[key.trim()] = value.trim();
        }
        return obj;
      }, {} as Record<string, string>);

      const nodeData = {
        title: title.trim(),
        author: author.trim() || undefined,
        year: year ? Number(year) : undefined,
        tags: tags ? tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
        abstract: abstract.trim() || undefined,
        links: links.map(link => link.trim()).filter(Boolean),
        details: detailsObject,
        notes: notes.trim() || undefined,
        color: colorValue,
        course_id: course.id,
      };

      // @ts-expect-error
      delete nodeData.url;

      await onSubmit(nodeData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save node");
    } finally {
      setLoading(false);
    }
  };

  const handleLinkChange = (index: number, value: string) => {
    const newLinks = [...links];
    newLinks[index] = value;
    setLinks(newLinks);
  };

  const addLink = () => {
    setLinks([...links, ""]);
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleDetailChange = (index: number, field: "key" | "value", value: string) => {
    const newDetails = [...details];
    newDetails[index][field] = value;
    setDetails(newDetails);
  };

  const addDetail = () => {
    setDetails([...details, { key: "", value: "" }]);
  };

  const removeDetail = (index: number) => {
    setDetails(details.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-xl font-semibold mb-4">{node ? "Edit Node" : "Add New Node"}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label htmlFor="node-title" className="block text-sm text-slate-300 mb-1">Title *</label>
              <input
                id="node-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 outline-none focus:border-sky-500"
                placeholder="e.g., Society of the Spectacle"
                required
              />
            </div>

            <div>
              <label htmlFor="node-author" className="block text-sm text-slate-300 mb-1">Author</label>
              <input
                id="node-author"
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label htmlFor="node-year" className="block text-sm text-slate-300 mb-1">Year</label>
              <input
                id="node-year"
                value={year}
                onChange={(event) => setYear(event.target.value)}
                className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 outline-none focus:border-sky-500"
                placeholder="e.g., 1967"
                type="number"
              />
            </div>

            <div className="col-span-2">
              <label htmlFor="node-tags" className="block text-sm text-slate-300 mb-1">Tags (comma-separated) *</label>
              <input
                id="node-tags"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 outline-none focus:border-sky-500"
                placeholder="AN1101, theory, class"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm text-slate-300 mb-1">Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#93c5fd'}
                  onChange={(event) => setColor(event.target.value)}
                  className="h-10 w-14 rounded border border-slate-700 bg-slate-800"
                />
                <input
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  placeholder="#93c5fd or leave blank"
                  className="flex-1 px-3 py-2 rounded-md bg-slate-800 border border-slate-700 outline-none focus:border-sky-500"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Provide a hex color (e.g., #1d4ed8) or leave blank to use the course/tag color.
              </p>
            </div>

            <div className="col-span-2">
              <label className="block text-sm text-slate-300 mb-1">Abstract</label>
              <textarea
                value={abstract}
                onChange={(event) => setAbstract(event.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 outline-none focus:border-sky-500"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <label className="block text-sm text-slate-300">Links</label>
              {links.map((link, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    value={link}
                    onChange={(e) => handleLinkChange(index, e.target.value)}
                    className="flex-grow px-3 py-2 rounded-md bg-slate-800 border border-slate-700"
                    placeholder="https://..."
                    type="url"
                  />
                  <button type="button" onClick={() => removeLink(index)} className="px-3 py-1 text-sm rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-200">
                    &times;
                  </button>
                </div>
              ))}
              <button type="button" onClick={addLink} className="text-sm text-sky-400 hover:underline">
                + Add Link
              </button>
            </div>

            <div className="col-span-2 space-y-2">
              <label className="block text-sm text-slate-300">Details</label>
              {details.map((detail, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    value={detail.key}
                    onChange={(e) => handleDetailChange(index, "key", e.target.value)}
                    className="w-1/3 px-3 py-2 rounded-md bg-slate-800 border border-slate-700"
                    placeholder="Key (e.g., ISBN)"
                  />
                  <input
                    value={detail.value}
                    onChange={(e) => handleDetailChange(index, "value", e.target.value)}
                    className="flex-grow px-3 py-2 rounded-md bg-slate-800 border border-slate-700"
                    placeholder="Value"
                  />
                  <button type="button" onClick={() => removeDetail(index)} className="px-3 py-1 text-sm rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-200">
                    &times;
                  </button>
                </div>
              ))}
              <button type="button" onClick={addDetail} className="text-sm text-sky-400 hover:underline">
                + Add Detail
              </button>
            </div>

            <div className="col-span-2">
              <label className="block text-sm text-slate-300 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 outline-none focus:border-sky-500"
                placeholder="Private or public notes about this book"
              />
            </div>
          </div>

          {error && <div className="text-sm text-red-400">{error}</div>}

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-sky-500/50 bg-sky-500/15 hover:bg-sky-500/25 disabled:opacity-50"
            >
              {loading ? "Saving..." : node ? "Update" : "Add"}
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
