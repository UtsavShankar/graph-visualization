import React from "react";

type EdgeContextMenuProps = {
  x: number;
  y: number;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export function EdgeContextMenu({ x, y, onEdit, onDelete, onClose }: EdgeContextMenuProps) {
  return (
    <div
      className="fixed z-50 bg-slate-800 border border-slate-700 rounded-md shadow-lg py-1"
      style={{ left: x, top: y }}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <button
        onClick={onEdit}
        className="w-full px-4 py-2 text-left text-sm hover:bg-slate-700 text-slate-100"
      >
        Edit note
      </button>
      <button
        onClick={onDelete}
        className="w-full px-4 py-2 text-left text-sm hover:bg-red-600/20 text-red-300"
      >
        Delete edge
      </button>
    </div>
  );
}
