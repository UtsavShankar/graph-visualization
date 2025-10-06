import React from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onEdit: () => void;
  onAddEdge: () => void;
  onClose: () => void;
}

export function ContextMenu({ x, y, onEdit, onAddEdge, onClose }: ContextMenuProps) {
  return (
    <div
      className="fixed bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 py-1"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onEdit}
        className="w-full px-4 py-2 text-left text-sm hover:bg-slate-700 flex items-center gap-2"
      >
        <span>✏️</span>
        Edit Node
      </button>
      <button
        onClick={onAddEdge}
        className="w-full px-4 py-2 text-left text-sm hover:bg-slate-700 flex items-center gap-2"
      >
        <span>🔗</span>
        Add Edge
      </button>
    </div>
  );
}
