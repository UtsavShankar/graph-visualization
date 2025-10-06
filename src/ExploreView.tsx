// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
import { Course } from "./lib/supabase";
import { NodePositionManager } from "./lib/positioning";
import { createEdge, createNode, deleteEdge, updateEdge, updateNode, updateNodePosition } from "./lib/database";
import { NodeForm } from "./components/NodeForm";
import { ContextMenu } from "./components/ContextMenu";
import { EdgeContextMenu } from "./components/EdgeContextMenu";
import { EdgeNoteForm } from "./components/EdgeNoteForm";
import { JsonMigrationButton } from "./components/JsonMigrationButton";
cytoscape.use(fcose);

const PREVIEW_NODE_ID = "__edge-preview-node";
const PREVIEW_EDGE_ID = "__edge-preview-edge";

const normalizeNote = (value?: string | null) => (value ? value.trim() : "");

export function ExploreView({ graph, setGraph, query, setQuery, courses }) {
  const TAG_FILTER_OPTIONS = courses?.map((course) => course.name) || [];
  const [tagFilter, setTagFilter] = useState("");
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  const [selected, setSelected] = useState(null);
  const [hoverEdge, setHoverEdge] = useState(null);
  const [showMigration, setShowMigration] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const [showNodeForm, setShowNodeForm] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  const [edgeContextMenu, setEdgeContextMenu] = useState(null);
  const [editingEdge, setEditingEdge] = useState(null);
  const [showEdgeForm, setShowEdgeForm] = useState(false);

  const [edgeCreation, setEdgeCreation] = useState({ active: false, sourceId: null });
  const [edgeError, setEdgeError] = useState("");
  const previewRef = useRef({ node: null, edge: null });

  const graphRef = useRef(graph);
  useEffect(() => {
    graphRef.current = graph;
  }, [graph]);

  const edgeCreationRef = useRef(edgeCreation);
  useEffect(() => {
    edgeCreationRef.current = edgeCreation;
  }, [edgeCreation]);

  const tagColorMap = useMemo(() => {
    const map = new Map();
    courses?.forEach((course) => {
      map.set(course.name, course.color);
    });
    return map;
  }, [courses]);

  const elements = useMemo(() => {
    const nodes = (graph.nodes || []).map((node) => {
      let position = node.pos;
      if (!position) {
        const courseName = (node.tags && node.tags[0]) || "other";
        position = NodePositionManager.findNonOverlappingPosition(
          (graph.nodes || []).filter((other) => other.id !== node.id).map((other) => ({ ...other, pos: other.pos })),
          courseName
        );
      }
      return {
        data: { ...node },
        position,
      };
    });

    const edges = (graph.edges || []).map((edge, index) => {
      const note = normalizeNote(edge.note ?? edge.relation);
      return {
        data: {
          id: edge.id || `e-${index}`,
          ...edge,
          note,
        },
      };
    });

    return { nodes, edges };
  }, [graph]);

  const onMouseMove = useCallback((event) => {
    setMousePos({ x: event.clientX + 16, y: event.clientY + 16 });
  }, []);

  const removePreview = useCallback(() => {
    const cy = cyRef.current;
    const { node, edge } = previewRef.current;
    if (edge && edge.length) {
      try {
        edge.remove();
      } catch (error) {}
    }
    if (node && node.length) {
      try {
        node.remove();
      } catch (error) {}
    }
    previewRef.current = { node: null, edge: null };
    if (cy) {
      cy.nodes().removeClass("edge-creation-source edge-creation-target");
    }
  }, []);

  const ensurePreview = useCallback(
    (sourceId) => {
      const cy = cyRef.current;
      if (!cy) return;
      removePreview();
      const source = cy.getElementById(sourceId);
      if (!source || source.empty()) return;

      source.addClass("edge-creation-source");

      const previewNode = cy.add({
        group: "nodes",
        data: { id: PREVIEW_NODE_ID },
        position: source.position(),
        selectable: false,
        pannable: false,
        grabbable: false,
        classes: "edge-preview-node",
      });

      previewNode.lock();

      const previewEdge = cy.add({
        group: "edges",
        data: {
          id: PREVIEW_EDGE_ID,
          source: sourceId,
          target: PREVIEW_NODE_ID,
        },
        classes: "edge-preview-edge",
      });

      previewRef.current = { node: previewNode, edge: previewEdge };
    },
    [removePreview]
  );

  const exitEdgeMode = useCallback(() => {
    setEdgeCreation({ active: false, sourceId: null });
    edgeCreationRef.current = { active: false, sourceId: null };
    setEdgeError("");
    removePreview();
  }, [removePreview]);

  const enterEdgeMode = useCallback(
    (sourceId = null) => {
      setEdgeCreation({ active: true, sourceId });
      edgeCreationRef.current = { active: true, sourceId };
      setEdgeError("");
      setEdgeContextMenu(null);
      if (sourceId) {
        ensurePreview(sourceId);
      } else {
        removePreview();
      }
    },
    [ensurePreview, removePreview]
  );

  useEffect(() => {
    if (!edgeCreation.active) return;
    const handleKey = (event) => {
      if (event.key === "Escape") {
        exitEdgeMode();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [edgeCreation.active, exitEdgeMode]);

  const isDuplicateEdge = useCallback((sourceId, targetId) => {
    const edges = graphRef.current?.edges || [];
    return edges.some(
      (edge) =>
        (edge.source === sourceId && edge.target === targetId) ||
        (edge.source === targetId && edge.target === sourceId)
    );
  }, []);

  const handleEdgeNodeSelection = useCallback(
    async (nodeId) => {
      setEdgeError("");
      const cy = cyRef.current;
      if (!cy) return;

      if (!edgeCreationRef.current.sourceId) {
        setEdgeCreation({ active: true, sourceId: nodeId });
        edgeCreationRef.current = { active: true, sourceId: nodeId };
        ensurePreview(nodeId);
        return;
      }

      const sourceId = edgeCreationRef.current.sourceId;
      if (nodeId === sourceId) {
        setEdgeError("Select a different node as the target.");
        return;
      }

      if (isDuplicateEdge(sourceId, nodeId)) {
        setEdgeError("An edge between these nodes already exists.");
        return;
      }

      try {
        const edgeId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `edge-${Date.now()}-${Math.random().toString(16).slice(2)}`;

        const newEdge = await createEdge({
          id: edgeId,
          source: sourceId,
          target: nodeId,
          relation: null,
          weight: 1,
        });

        const note = normalizeNote(newEdge.note ?? newEdge.relation);
        setGraph((prev) => ({
          ...prev,
          edges: [...prev.edges, { ...newEdge, note }],
        }));
        exitEdgeMode();
      } catch (error) {
        console.error("Failed to create edge:", error);
        setEdgeError("Failed to create edge. Please try again.");
      }
    },
    [ensurePreview, exitEdgeMode, isDuplicateEdge, setGraph]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    if (cyRef.current) {
      try {
        cyRef.current.destroy();
      } catch (error) {}
      cyRef.current = null;
    }

    const style = [
      {
        selector: "core",
        style: { "selection-box-color": "#60a5fa", "active-bg-opacity": 0 },
      },
      {
        selector: "node",
        style: {
          "background-color": (ele) => {
            if (tagFilter && !(ele.data("tags") || []).includes(tagFilter)) {
              return "#64748b";
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
          "transition-property": "background-color opacity width height border-width",
          "transition-duration": 150,
        },
      },
      { selector: "node.hovered", style: { width: 34, height: 34, "border-width": 3 } },
      { selector: "node.dimmed", style: { opacity: 0.15 } },
      {
        selector: "node.edge-creation-source",
        style: {
          "border-color": "#f97316",
          "border-width": 4,
          "border-opacity": 0.9,
          "shadow-blur": 12,
          "shadow-color": "#f97316",
        },
      },
      {
        selector: "node.edge-preview-node",
        style: {
          opacity: 0,
          events: "no",
        },
      },
      {
        selector: "edge",
        style: {
          width: (ele) => Math.max(1.5, ((ele.data("weight") || 1) as number) * 1.2),
          "line-color": "#94a3b8",
          opacity: 0.7,
          "curve-style": "bezier",
          "target-arrow-shape": "none",
          "source-arrow-shape": "none",
          "line-cap": "round",
          "transition-property": "opacity line-color width",
          "target-arrow-color": "#94a3b8",
          "arrow-scale": 0.8,
          "transition-duration": 120,
        },
      },
      {
        selector: "edge.edge-preview-edge",
        style: {
          "line-color": "#38bdf8",
          "target-arrow-color": "#38bdf8",
          "line-style": "dashed",
          "arrow-scale": 0.8,
          width: 3,
          opacity: 0.9,
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
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      layout: { name: "preset", fit: true, animate: false },
      wheelSensitivity: 0.32,
      style,
    });

    cyRef.current = cy;

    if (edgeCreationRef.current.active && edgeCreationRef.current.sourceId) {
      ensurePreview(edgeCreationRef.current.sourceId);
    }

    const clearFocus = () => {
      cy.elements().removeClass("faded hovered");
      setSelected(null);
    };

    cy.on("tap", (event) => {
      if (event.target === cy) {
        if (edgeCreationRef.current.active) {
          exitEdgeMode();
        } else {
          clearFocus();
        }
      }
    });

    cy.on("tap", "node", (event) => {
      const node = event.target;
      if (node.id() === PREVIEW_NODE_ID) return;

      if (edgeCreationRef.current.active) {
        event.preventDefault();
        handleEdgeNodeSelection(node.id());
        return;
      }

      const neighborhood = node.closedNeighborhood();
      cy.elements().addClass("faded");
      neighborhood.removeClass("faded");
      setSelected(node.data());
    });

    cy.on("cxttap", "node", (event) => {
      event.preventDefault();
      if (edgeCreationRef.current.active) return;
      const node = event.target;
      const renderedPosition = node.renderedPosition();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setContextMenu({
        x: rect.left + renderedPosition.x,
        y: rect.top + renderedPosition.y,
        nodeId: node.id(),
      });
      setEdgeContextMenu(null);
    });

    cy.on("cxttap", "edge", (event) => {
      event.preventDefault();
      const edge = event.target;
      if (edge.id() === PREVIEW_EDGE_ID) return;
      const rendered = event.renderedPosition || edge.midpoint();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setEdgeContextMenu({
        x: rect.left + rendered.x,
        y: rect.top + rendered.y,
        edgeId: edge.id(),
      });
      setContextMenu(null);
    });

    cy.on("grab", "node", (event) => {
      setSelected((prev) => prev);
    });

    cy.on("free", "node", async (event) => {
      const node = event.target;
      const nodeId = node.id();
      if (nodeId === PREVIEW_NODE_ID) return;
      const position = node.position();
      try {
        await updateNodePosition(nodeId, { x: position.x, y: position.y });
        setGraph((prev) => ({
          ...prev,
          nodes: prev.nodes.map((n) =>
            n.id === nodeId ? { ...n, pos: { x: position.x, y: position.y } } : n
          ),
        }));
      } catch (error) {
        console.error("Failed to update node position:", error);
      }
    });

    cy.on("mouseover", "edge", (event) => {
      const edge = event.target;
      if (edge.id() === PREVIEW_EDGE_ID) return;
      edge.addClass("hovered");
      const src = edge.source().data("title") || edge.source().id();
      const tgt = edge.target().data("title") || edge.target().id();
      const note = normalizeNote(edge.data("note") ?? edge.data("relation"));
      const weight = edge.data("weight");
      if (!note) {
        setHoverEdge(null);
        return;
      }
      setHoverEdge({ id: edge.id(), src, tgt, note, weight });
    });

    cy.on("mouseout", "edge", (event) => {
      const edge = event.target;
      edge.removeClass("hovered");
      setHoverEdge(null);
    });

    cy.on("mousemove", (event) => {
      if (!edgeCreationRef.current.active || !edgeCreationRef.current.sourceId) return;
      const previewNode = previewRef.current.node;
      if (previewNode && previewNode.length && event.position) {
        previewNode.position(event.position);
      }
    });

    const timeoutId = setTimeout(() => {
      if (cy && !cy.destroyed()) {
        cy.fit(undefined, 40);
        cy.zoom(1.2);
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      removePreview();
      try {
        cy.destroy();
      } catch (error) {}
      cyRef.current = null;
    };
  }, [elements, tagFilter, tagColorMap, ensurePreview, exitEdgeMode, handleEdgeNodeSelection, removePreview]);

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
      setEdgeContextMenu(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().removeClass("dimmed");
    const q = query.trim().toLowerCase();
    cy.nodes().forEach((node) => {
      const titleMatch = !q || (node.data("title") || node.id()).toLowerCase().includes(q);
      const tagMatch = !tagFilter || (node.data("tags") || []).includes(tagFilter);
      if (!(titleMatch && tagMatch)) {
        node.addClass("dimmed");
      }
    });
  }, [query, tagFilter]);

  const handleAddNode = useCallback(() => {
    setEditingNode(null);
    setShowNodeForm(true);
  }, []);

  const handleEditNode = useCallback(() => {
    if (!contextMenu) return;
    const node = graph.nodes.find((n) => n.id === contextMenu.nodeId);
    setEditingNode(node || null);
    setShowNodeForm(true);
    setContextMenu(null);
  }, [contextMenu, graph.nodes]);

  const handleAddEdgeFromContext = useCallback(() => {
    if (!contextMenu) return;
    enterEdgeMode(contextMenu.nodeId);
    setContextMenu(null);
  }, [contextMenu, enterEdgeMode]);

  const handleAddEdgeButton = useCallback(() => {
    if (edgeCreation.active) {
      exitEdgeMode();
    } else {
      enterEdgeMode();
    }
  }, [edgeCreation.active, enterEdgeMode, exitEdgeMode]);

  const handleDeleteEdge = useCallback(async () => {
    if (!edgeContextMenu) return;
    if (!window.confirm("Delete this edge?")) {
      setEdgeContextMenu(null);
      return;
    }
    try {
      await deleteEdge(edgeContextMenu.edgeId);
      setGraph((prev) => ({
        ...prev,
        edges: prev.edges.filter((edge) => edge.id !== edgeContextMenu.edgeId),
      }));
    } catch (error) {
      console.error("Failed to delete edge:", error);
    } finally {
      setEdgeContextMenu(null);
    }
  }, [edgeContextMenu, setGraph]);

  const handleEditEdge = useCallback(() => {
    if (!edgeContextMenu) return;
    const edge = graphRef.current?.edges.find((e) => e.id === edgeContextMenu.edgeId);
    if (!edge) {
      setEdgeContextMenu(null);
      return;
    }
    const note = normalizeNote(edge.note ?? edge.relation);
    setEditingEdge({ id: edge.id, note });
    setShowEdgeForm(true);
    setEdgeContextMenu(null);
  }, [edgeContextMenu]);

  const handleEdgeNoteSubmit = useCallback(
    async (note) => {
      if (!editingEdge) return;
      try {
        const trimmed = note.trim();
        const updated = await updateEdge(editingEdge.id, { relation: trimmed || null });
        const normalized = normalizeNote(updated.note ?? updated.relation);
        setGraph((prev) => ({
          ...prev,
          edges: prev.edges.map((edge) =>
            edge.id === editingEdge.id ? { ...edge, relation: updated.relation, note: normalized } : edge
          ),
        }));
        setShowEdgeForm(false);
        setEditingEdge(null);
      } catch (error) {
        console.error("Failed to update edge note:", error);
        throw error;
      }
    },
    [editingEdge, setGraph]
  );

  const handleCancelEdgeForm = useCallback(() => {
    setShowEdgeForm(false);
    setEditingEdge(null);
  }, []);

  const handleNodeSubmit = useCallback(
    async (nodeData) => {
      if (editingNode) {
        const updatedNode = await updateNode(editingNode.id, nodeData);
        setGraph((prev) => ({
          ...prev,
          nodes: prev.nodes.map((node) => (node.id === editingNode.id ? { ...node, ...updatedNode } : node)),
        }));
      } else {
        const courseName = nodeData.tags[0];
        const position = NodePositionManager.findNonOverlappingPosition(
          graph.nodes.map((node) => ({ ...node, pos: node.pos })),
          courseName
        );
        const newNode = await createNode({ ...nodeData, pos: position });
        setGraph((prev) => ({
          ...prev,
          nodes: [...prev.nodes, { ...newNode, pos: position }],
        }));
      }
      setShowNodeForm(false);
      setEditingNode(null);
    },
    [editingNode, graph.nodes, setGraph]
  );

  return (
    <div className={`grid gap-0 ${selected ? "grid-cols-12" : "grid-cols-1"}`}>
      <div
        className={`${selected ? "col-span-9 border-r border-slate-800" : "col-span-1"} relative`}
        onMouseMove={onMouseMove}
      >
        <div className="p-3 flex items-center gap-2 border-b border-slate-800">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search titles�"
            className="w-80 px-3 py-2 rounded-md bg-slate-900 border border-slate-700 outline-none focus:border-sky-500"
          />
          <select
            value={tagFilter}
            onChange={(event) => setTagFilter(event.target.value)}
            className="w-80 px-3 py-2 rounded-md bg-slate-900 border border-slate-700 outline-none focus:border-sky-500 text-slate-300"
            style={{ minWidth: 100 }}
          >
            <option value="">All tags</option>
            {TAG_FILTER_OPTIONS.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddNode}
            className="px-4 py-2 rounded-lg border border-sky-500/50 bg-sky-500/15 hover:bg-sky-500/25"
          >
            + Add Node
          </button>
          <button
            onClick={handleAddEdgeButton}
            className={`px-4 py-2 rounded-lg border ${
              edgeCreation.active
                ? "border-sky-500/60 bg-sky-500/20 text-sky-100"
                : "border-slate-700 hover:border-slate-600"
            }`}
          >
            {edgeCreation.active ? "Cancel Add Edge" : "Add Edge"}
          </button>
          <button
            onClick={() => setShowMigration(!showMigration)}
            className="px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-600"
          >
            Migrate JSON
          </button>
          <span className="text-xs text-slate-400 ml-2">Right-click nodes to edit | Drag to move</span>
        </div>

        {edgeCreation.active && (
          <div className="px-3 pt-2">
            <div className="flex items-center justify-between gap-3 rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
              <span>Add edge: click a source node, then a target node. Press Esc to cancel.</span>
              <button
                onClick={exitEdgeMode}
                className="rounded-md border border-sky-500/60 px-3 py-1 text-xs hover:bg-sky-500/20"
              >
                Exit
              </button>
            </div>
            {edgeError && <div className="px-1 pt-1 text-xs text-red-300">{edgeError}</div>}
          </div>
        )}

        {showMigration && (
          <div className="border-t border-slate-800 p-4">
            <JsonMigrationButton
              onComplete={() => {
                window.location.reload();
              }}
            />
          </div>
        )}

        <div ref={containerRef} className="h-[calc(100vh-8rem)]" />
        {hoverEdge && (
          <div
            style={{ position: "fixed", left: mousePos.x, top: mousePos.y }}
            className="max-w-xs rounded-xl border border-sky-600/40 bg-slate-900/95 p-3 text-sm shadow-xl"
          >
            <div className="mb-1 font-medium text-slate-300">Connection</div>
            <div>
              <strong>{hoverEdge.src}</strong>  <strong>{hoverEdge.tgt}</strong>
            </div>
            {hoverEdge.note && (
              <div className="mt-1 italic text-slate-300">{hoverEdge.note}</div>
            )}
            {hoverEdge.weight != null && (
              <div className="mt-1 text-slate-400">Weight: {hoverEdge.weight}</div>
            )}
          </div>
        )}
      </div>

      {selected && (
        <aside className="col-span-3 h-[calc(100vh-3.25rem)] overflow-auto">
          <div className="p-4">
            <h2 className="mb-2 text-lg font-semibold">Details</h2>
            <div className="space-y-2">
              <div className="text-xl font-semibold leading-tight">{selected.title || selected.id}</div>
              <div className="text-slate-300">
                {selected.author} {selected.year ? `- ${selected.year}` : ""}
              </div>
              {selected.tags?.length ? (
                <div className="flex flex-wrap gap-1">
                  {selected.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full border border-slate-700">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              {selected.abstract && <p className="mt-2 text-sm text-slate-200">{selected.abstract}</p>}
              {selected.notes && (
                <div className="mt-3">
                  <div className="text-sm font-medium text-slate-300">Notes</div>
                  <p className="whitespace-pre-wrap text-sm text-slate-200">{selected.notes}</p>
                </div>
              )}
              {selected.url && (
                <a
                  href={selected.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sky-400 hover:underline"
                >
                  Open link 
                </a>
              )}
            </div>
          </div>
        </aside>
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onEdit={handleEditNode}
          onAddEdge={handleAddEdgeFromContext}
          onClose={() => setContextMenu(null)}
        />
      )}

      {edgeContextMenu && (
        <EdgeContextMenu
          x={edgeContextMenu.x}
          y={edgeContextMenu.y}
          onEdit={handleEditEdge}
          onDelete={handleDeleteEdge}
          onClose={() => setEdgeContextMenu(null)}
        />
      )}

      <EdgeNoteForm
        isOpen={showEdgeForm}
        initialNote={editingEdge?.note || ""}
        onSubmit={handleEdgeNoteSubmit}
        onCancel={handleCancelEdgeForm}
      />

      <NodeForm
        node={editingNode}
        courses={courses}
        onSubmit={handleNodeSubmit}
        onCancel={() => {
          setShowNodeForm(false);
          setEditingNode(null);
        }}
        isOpen={showNodeForm}
      />
    </div>
  );
}








