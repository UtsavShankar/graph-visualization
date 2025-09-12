// @ts-nocheck
import { TAG_COLORS } from "./App";
import React, { useEffect, useMemo, useRef, useState } from "react";
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
cytoscape.use(fcose);

// graph display view
export function ExploreView({ graph, query, setQuery }) {
  // Tag filter options
  const TAG_FILTER_OPTIONS = ["SC2209", "AN1101", "AN2203", "SC3204"];
  const [tagFilter, setTagFilter] = useState("");
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

  // Build elements with manual positions for circular clusters by tag
  const TAG_CIRCLE_ORDER = ["AN2203", "AN1101", "SC2209", "SC3204"];
  const elements = useMemo(() => {
    // Group nodes by tag
    const tagGroups = {};
    (graph.nodes || []).forEach((n) => {
      const tag = (n.tags && n.tags[0]) || "other";
      if (!tagGroups[tag]) tagGroups[tag] = [];
      tagGroups[tag].push(n);
    });
  // Arrange each tag group in a circle, space circles horizontally
  const circleSpacing = 700;
  const circleRadius = 300;
    let colIdx = 0;
    const nodes = [];
    TAG_CIRCLE_ORDER.forEach((tag) => {
      const group = tagGroups[tag] || [];
      const N = group.length;
      const centerX = colIdx * circleSpacing;
      const centerY = 0;
      group.forEach((n, i) => {
        const angle = (2 * Math.PI * i) / N;
        const x = centerX + circleRadius * Math.cos(angle);
        const y = centerY + circleRadius * Math.sin(angle);
        nodes.push({
          data: { ...n },
          position: { x, y }
        });
      });
      colIdx++;
    });
    // Add any other tags not in the order
    Object.keys(tagGroups).forEach((tag) => {
      if (!TAG_CIRCLE_ORDER.includes(tag)) {
        const group = tagGroups[tag];
        const N = group.length;
        const centerX = colIdx * circleSpacing;
        const centerY = 0;
        group.forEach((n, i) => {
          const angle = (2 * Math.PI * i) / N;
          const x = centerX + circleRadius * Math.cos(angle);
          const y = centerY + circleRadius * Math.sin(angle);
          nodes.push({
            data: { ...n },
            position: { x, y }
          });
        });
        colIdx++;
      }
    });
    return {
      nodes,
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
      layout: {
        name: "preset",
        fit: true,
        animate: false,
      },
      wheelSensitivity: 0.32,
      style: [
        {
          selector: "core",
          style: { "selection-box-color": "#60a5fa", "active-bg-opacity": 0 },
        },
        {
          selector: "node",
          style: {
            "background-color": (ele) => {
              // If tagFilter is active, only color nodes with that tag, others gray
              if (tagFilter && !(ele.data("tags") || []).includes(tagFilter)) {
                return "#64748b"; // faded gray
              }
              const dataColor = ele.data("color");
              if (dataColor) return dataColor;
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

    // Set initial zoom and center
    setTimeout(() => {
      cy.fit(undefined, 40); // Fit all nodes with 40px padding
      cy.zoom(1.2); // Set zoom level to 2.5
    }, 100);
    return () => {
      try {
        cy.destroy();
      } catch (e) {}
    };
  }, [elements, tagColorMap]);

  const onMouseMove = (e) => {
    setMousePos({ x: e.clientX + 16, y: e.clientY + 16 });
  };

  // Combined search and tag filter: fade non-matching nodes
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().removeClass("dimmed");
    const q = query.trim().toLowerCase();
    cy.nodes().forEach((n) => {
      const titleMatch = !q || (n.data("title") || n.id()).toLowerCase().includes(q);
      const tagMatch = !tagFilter || (n.data("tags") || []).includes(tagFilter);
      if (!(titleMatch && tagMatch)) n.addClass("dimmed");
    });
  }, [query, tagFilter]);

  // Animate nodes when tagFilter changes
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    if (!tagFilter) return; // Only animate when a tag is selected
    const centerX = cy.width() / 2;
    const centerY = cy.height() / 2;
    const selectedNodes = cy.nodes().filter(n => (n.data("tags") || []).includes(tagFilter));
    const otherNodes = cy.nodes().filter(n => !(n.data("tags") || []).includes(tagFilter));
    // Arrange selected nodes in a circle at center
    const N = selectedNodes.length;
    const radius = 200;
    selectedNodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / N;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      n.animate({ position: { x, y } }, { duration: 600 });
    });
    // Move other nodes to the edges
    otherNodes.forEach((n, i) => {
      // Spread out along the border
      const angle = (2 * Math.PI * i) / otherNodes.length;
      const x = centerX + (cy.width() / 2 - 80) * Math.cos(angle);
      const y = centerY + (cy.height() / 2 - 80) * Math.sin(angle);
      n.animate({ position: { x, y } }, { duration: 600 });
    });
  }, [tagFilter]);

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
          <select
            value={tagFilter}
            onChange={e => setTagFilter(e.target.value)}
            className="w-80 px-3 py-2 rounded-md bg-slate-900 border border-slate-700 outline-none focus:border-sky-500 text-slate-300"
            style={{ minWidth: 100}}
          >
            <option value="">All tags</option>
            {TAG_FILTER_OPTIONS.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
          <span className="text-xs text-slate-400 ml-2">
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
