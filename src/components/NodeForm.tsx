import React, { useState, useEffect } from 'react';
import { Course } from '../lib/supabase';
import { slugify } from '../lib/utils';

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
  const [urls, setUrls] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [color, setColor] = useState("");
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [showNewFieldForm, setShowNewFieldForm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (node) {
      setTitle(node.title || "");
      setAuthor(node.author || "");
      setYear(node.year ? node.year.toString() : "");
      setTags(node.tags ? node.tags.join(", ") : "");
      setAbstract(node.abstract || "");
      // Handle both legacy url and new urls array
      if (node.urls && node.urls.length > 0) {
        setUrls(node.urls);
      } else if (node.url) {
        setUrls([node.url]);
      } else {
        setUrls([]);
      }
      setNotes(node.notes || "");
      setColor(node.color || "");
      setMetadata(node.metadata || {});
    } else {
      setTitle("");
      setAuthor("");
      setYear("");
      setTags("");
      setAbstract("");
      setUrls([]);
      setNotes("");
      setColor("");
      setMetadata({});
    }
    setNewFieldKey("");
    setNewFieldValue("");
    setShowNewFieldForm(false);
    setError("");
  }, [node, isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const id = slugify(title);
      if (!id) {
        setError("Please enter a title.");
        return;
      }

      const courseName = tags ? tags.split(",")[0].trim() : "";
      const course = courses?.find((c) => c.name === courseName);
      if (!course) {
        setError("Please enter a valid course tag (e.g., AN1101).");
        return;
      }

      const colorValue = color?.trim() || undefined;

      const nodeData = {
        id,
        title: title.trim(),
        author: author.trim() || undefined,
        year: year ? Number(year) : undefined,
        tags: tags ? tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
        abstract: abstract.trim() || undefined,
        urls: urls.filter(url => url.trim() !== ""),
        notes: notes.trim() || undefined,
        course_id: course.id,
        color: colorValue,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-xl font-semibold mb-4">{node ? "Edit Node" : "Add New Node"}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm text-slate-300 mb-1">Title *</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 outline-none focus:border-sky-500"
                placeholder="e.g., Society of the Spectacle"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">Author</label>
              <input
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">Year</label>
              <input
                value={year}
                onChange={(event) => setYear(event.target.value)}
                className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 outline-none focus:border-sky-500"
                placeholder="e.g., 1967"
                type="number"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm text-slate-300 mb-1">Tags (comma-separated) *</label>
              <input
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

            <div className="col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm text-slate-300">Links</label>
                <button
                  type="button"
                  onClick={() => setUrls([...urls, ""])}
                  className="px-3 py-1 text-sm rounded-md border border-sky-500/50 bg-sky-500/15 hover:bg-sky-500/25"
                >
                  + Add Link
                </button>
              </div>
              {urls.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setUrls([""])}
                  className="w-full px-3 py-2 rounded-md border border-slate-700 hover:border-sky-500/50 text-slate-400 text-sm"
                >
                  Click to add a link
                </button>
              ) : (
                <div className="space-y-2">
                  {urls.map((url, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        value={url}
                        onChange={(e) => {
                          const newUrls = [...urls];
                          newUrls[index] = e.target.value;
                          setUrls(newUrls);
                        }}
                        className="flex-1 px-3 py-2 rounded-md bg-slate-800 border border-slate-700 outline-none focus:border-sky-500"
                        placeholder="https://..."
                        type="url"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newUrls = urls.filter((_, i) => i !== index);
                          setUrls(newUrls);
                        }}
                        className="px-3 py-2 rounded-md border border-red-500/50 bg-red-500/15 hover:bg-red-500/25 text-red-400"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
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

            <div className="col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm text-slate-300">Custom Information</label>
                <button
                  type="button"
                  onClick={() => setShowNewFieldForm(true)}
                  className="px-3 py-1 text-sm rounded-md border border-sky-500/50 bg-sky-500/15 hover:bg-sky-500/25"
                >
                  + Add New Info
                </button>
              </div>

              {/* New field form */}
              {showNewFieldForm && (
                <div className="mb-3 p-3 rounded-md border border-sky-500/40 bg-sky-500/5">
                  <div className="flex items-center gap-2">
                    <input
                      value={newFieldKey}
                      onChange={(e) => setNewFieldKey(e.target.value)}
                      placeholder="Field name (e.g., region, important page)"
                      className="flex-1 px-2 py-1.5 text-sm rounded bg-slate-700 border border-slate-600 outline-none focus:border-sky-500"
                      autoFocus
                    />
                    <span className="text-slate-500">:</span>
                    <input
                      value={newFieldValue}
                      onChange={(e) => setNewFieldValue(e.target.value)}
                      placeholder="Value (e.g., Cambodia, page 9)"
                      className="flex-1 px-2 py-1.5 text-sm rounded bg-slate-700 border border-slate-600 outline-none focus:border-sky-500"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newFieldKey.trim()) {
                          setMetadata({ ...metadata, [newFieldKey.trim()]: newFieldValue.trim() });
                          setNewFieldKey("");
                          setNewFieldValue("");
                          setShowNewFieldForm(false);
                        }
                      }}
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (newFieldKey.trim()) {
                          setMetadata({ ...metadata, [newFieldKey.trim()]: newFieldValue.trim() });
                          setNewFieldKey("");
                          setNewFieldValue("");
                          setShowNewFieldForm(false);
                        }
                      }}
                      className="px-3 py-1 text-xs rounded border border-sky-500/50 bg-sky-500/15 hover:bg-sky-500/25"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewFieldKey("");
                        setNewFieldValue("");
                        setShowNewFieldForm(false);
                      }}
                      className="px-3 py-1 text-xs rounded border border-slate-600 hover:border-slate-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Existing fields */}
              {Object.keys(metadata).length > 0 && (
                <div className="space-y-2 bg-slate-800/50 p-3 rounded-md border border-slate-700">
                  {Object.entries(metadata).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <input
                        value={key}
                        onChange={(e) => {
                          const newKey = e.target.value;
                          const newMetadata = { ...metadata };
                          delete newMetadata[key];
                          newMetadata[newKey] = value;
                          setMetadata(newMetadata);
                        }}
                        placeholder="Field name"
                        className="flex-1 px-2 py-1 text-sm rounded bg-slate-700 border border-slate-600 outline-none focus:border-sky-500"
                      />
                      <span className="text-slate-500">:</span>
                      <input
                        value={value}
                        onChange={(e) => {
                          setMetadata({ ...metadata, [key]: e.target.value });
                        }}
                        placeholder="Value"
                        className="flex-1 px-2 py-1 text-sm rounded bg-slate-700 border border-slate-600 outline-none focus:border-sky-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newMetadata = { ...metadata };
                          delete newMetadata[key];
                          setMetadata(newMetadata);
                        }}
                        className="px-2 py-1 text-sm rounded border border-red-500/50 bg-red-500/15 hover:bg-red-500/25 text-red-400"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-1 text-xs text-slate-500">
                Add custom fields like region, important pages, or any other information.
              </p>
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
