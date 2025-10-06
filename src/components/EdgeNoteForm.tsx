import React, { useEffect, useState } from "react";

type EdgeNoteFormProps = {
  isOpen: boolean;
  initialNote: string;
  onSubmit: (note: string) => Promise<void>;
  onCancel: () => void;
};

export function EdgeNoteForm({ isOpen, initialNote, onSubmit, onCancel }: EdgeNoteFormProps) {
  const [note, setNote] = useState(initialNote);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNote(initialNote);
      setError("");
      setLoading(false);
    }
  }, [isOpen, initialNote]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onSubmit(note.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save edge note.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-slate-100">Edit edge note</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
              placeholder="Add an optional note about this connection"
            />
          </div>
          {error && <div className="text-sm text-red-300">{error}</div>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-slate-700 px-4 py-2 text-slate-200 hover:border-slate-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md border border-sky-500/60 bg-sky-500/15 px-4 py-2 text-slate-100 hover:bg-sky-500/25 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
