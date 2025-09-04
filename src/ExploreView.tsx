// @ts-nocheck
import { TAG_COLORS } from "./App";
import React, { useEffect, useMemo, useRef, useState } from "react";
import cytoscape from "cytoscape";

// graph display view
export function ExploreView({ graph, query, setQuery }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [selected, setSelected] = useState(null); // node data
  const [hoverEdge, setHoverEdge] = useState(null); // {relation, src, tgt}
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const tagColorMap = useMemo(() => {
    const uniq = Array.from(
      new Set((graph.nodes || []).flatMap((n) => n.tags || []))
    );
    const map = new Map();
    uniq.forEach((tag, i) => map.set(tag, TAG_COLORS[i % TAG_COLORS.length]));
    return map;
  }, [graph.nodes]);

  // Build elements
  const elements = useMemo(() => {
    return {
      nodes: (graph.nodes || []).map((n) => ({ data: { ...n } })),
      edges: (graph.edges || []).map((e, i) => ({
        data: { id: e.id || `e-${i}`, ...e },
      })),
    };
  }, [graph]);

  // Recreate graph when data changes
  useEffect(() => {
    if (!containerRef.current) return;

    if (cyRef.current) {
      try {
        cyRef.current.destroy();
      } catch (e) {}
      cyRef.current = null;
    }
    // This is a cytoscape instance that controls the graph how/behavior, color, etc.
    const cy = cytoscape({
      container: containerRef.current,
      elements,
      layout: { name: "cose", animate: false },
      wheelSensitivity: 0.6,
      style: [
        {
          selector: "core",
          style: { "selection-box-color": "#60a5fa", "active-bg-opacity": 0 },
        },
        {
          selector: "node",
          style: {
            "background-color": (ele) => {
              const dataColor = ele.data("color");
              if (dataColor) return dataColor; // ← use per-node color from JSON
              const tags = ele.data("tags") || [];
              const first = tags[0];
              return first ? tagColorMap.get(first) || "#93c5fd" : "#93c5fd";
            },
            label: (ele) => ele.data("title") || ele.id(),
            "font-size": 11,
            "text-wrap": "wrap",
            "text-max-width": 140,
            "text-valign": "center",
            "text-halign": "center",
            color: "#ffffff",
            "border-width": 2,
            "border-color": "#0ea5e9",
            "border-opacity": 0.35,
            width: 26,
            height: 26,
            shape: "ellipse",
            "transition-property":
              "background-color opacity width height border-width",
            "transition-duration": 150,
          },
        },
        {
          selector: "node.hovered",
          style: { width: 34, height: 34, "border-width": 3 },
        },
        { selector: "node.dimmed", style: { opacity: 0.15 } },
        {
          selector: "edge",
          style: {
            width: (ele) => Math.max(1.5, (ele.data("weight") || 1) * 1.2),
            "line-color": "#94a3b8",
            opacity: 0.7,
            "curve-style": "bezier",
            "target-arrow-shape": "none",
            "source-arrow-shape": "none",

            // (optional polish)
            "line-cap": "round",
            "transition-property": "opacity line-color width",
            "target-arrow-color": "#94a3b8",
            "arrow-scale": 0.8,
            "transition-duration": 120,
          },
        },
        {
          selector: "edge.hovered",
          style: {
            "line-color": "#0ea5e9",
            opacity: 1,
            width: 5,
            "target-arrow-color": "#0ea5e9",
          },
        },
        { selector: ".faded", style: { opacity: 0.12 } },
      ],
    });

    cyRef.current = cy;

    const clearFocus = () => {
      cy.elements().removeClass("faded hovered dimmed");
      setSelected(null);
    };

    cy.on("tap", (e) => {
      if (e.target === cy) clearFocus();
    });

    cy.on("tap", "node", (evt) => {
      const node = evt.target;
      const neighborhood = node.closedNeighborhood();
      cy.elements().addClass("faded");
      neighborhood.removeClass("faded");
      setSelected(node.data());
    });
    // Edge hover - uses
    cy.on("mouseover", "edge", (evt) => {
      const edge = evt.target;
      edge.addClass("hovered");
      const src = edge.source().data("title") || edge.source().id();
      const tgt = edge.target().data("title") || edge.target().id();
      const relation = edge.data("relation") || "related";
      const weight = edge.data("weight");
      setHoverEdge({ src, tgt, relation, weight });
    });

    cy.on("mouseout", "edge", (evt) => {
      evt.target.removeClass("hovered");
      setHoverEdge(null);
    });

    return () => {
      try {
        cy.destroy();
      } catch (e) {}
    };
  }, [elements, tagColorMap]);

  const onMouseMove = (e) => {
    setMousePos({ x: e.clientX + 16, y: e.clientY + 16 });
  };

  // Simple search: fade non-matching nodes
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().removeClass("dimmed");
    if (!query.trim()) return;
    const q = query.toLowerCase();
    cy.nodes().forEach((n) => {
      const t = (n.data("title") || n.id()).toLowerCase();
      if (!t.includes(q)) n.addClass("dimmed");
    });
  }, [query]);

  return (
    <div className="grid grid-cols-12 gap-0">
      <div
        className="col-span-9 border-r border-slate-800 relative"
        onMouseMove={onMouseMove}
      >
        <div className="p-3 flex items-center gap-2 border-b border-slate-800">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles…"
            className="w-80 px-3 py-2 rounded-md bg-slate-900 border border-slate-700 outline-none focus:border-sky-500"
          />
          <span className="text-xs text-slate-400">
            Hover an edge to see the connection
          </span>
        </div>
        <div ref={containerRef} className="h-[calc(100vh-8rem)]" />
        {hoverEdge && (
          <div
            style={{ position: "fixed", left: mousePos.x, top: mousePos.y }}
            className="max-w-xs rounded-xl border border-sky-600/40 bg-slate-900/95 shadow-xl p-3 text-sm"
          >
            <div className="text-slate-300 mb-1 font-medium">Connection</div>
            <div>
              <strong>{hoverEdge.src}</strong> ↔{" "}
              <strong>{hoverEdge.tgt}</strong>
            </div>
            {hoverEdge.relation && (
              <div className="italic text-slate-300 mt-1">
                {hoverEdge.relation}
              </div>
            )}
            {hoverEdge.weight && (
              <div className="text-slate-400 mt-1">
                Weight: {hoverEdge.weight}
              </div>
            )}
          </div>
        )}
      </div>

      <aside className="col-span-3 h-[calc(100vh-3.25rem)] overflow-auto">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-2">Details</h2>
          {!selected && (
            <p className="text-slate-400">
              Click a node to see book details here.
            </p>
          )}
          {selected && (
            <div className="space-y-2">
              <div className="text-xl font-semibold leading-tight">
                {selected.title || selected.id}
              </div>
              <div className="text-slate-300">
                {selected.author} {selected.year ? `• ${selected.year}` : ""}
              </div>
              {selected.tags?.length ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selected.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-full border border-slate-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              {selected.abstract && (
                <p className="text-slate-200 text-sm mt-2">
                  {selected.abstract}
                </p>
              )}
              {selected.notes && (
                <div className="mt-3">
                  <div className="text-slate-300 text-sm font-medium mb-1">
                    Notes
                  </div>
                  <p className="text-slate-200 text-sm whitespace-pre-wrap">
                    {selected.notes}
                  </p>
                </div>
              )}
              {selected.url && (
                <a
                  href={selected.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-2 text-sky-400 hover:underline"
                >
                  Open link ↗
                </a>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
