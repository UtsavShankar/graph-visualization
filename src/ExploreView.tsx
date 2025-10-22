import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
import { updateEdge, updateNode, createNode, deleteEdge } from "./lib/database";
import { NodePositionManager } from "./lib/positioning";
import { normalizeNote } from "./lib/utils";
import { getCytoscapeStyles } from "./lib/cytoscape-styles";
import { PREVIEW_EDGE_ID } from "./lib/constants";
import { ContextMenu } from "./components/ContextMenu";
import { EdgeContextMenu } from "./components/EdgeContextMenu";
import { EdgeNoteForm } from "./components/EdgeNoteForm";
import { JsonMigrationButton } from "./components/JsonMigrationButton";
import { NodeForm } from "./components/NodeForm";
import { useEdgeCreation } from "./hooks/useEdgeCreation";
import { useNodeDeletion } from "./hooks/useNodeDeletion";
import { useCytoscapeGraph } from "./hooks/useCytoscapeGraph";

cytoscape.use(fcose);

interface ExploreViewProps {
  graph: { nodes: any[]; edges: any[] };
  setGraph: React.Dispatch<React.SetStateAction<{ nodes: any[]; edges: any[] }>>;
  query: string;
  setQuery: (query: string) => void;
  courses: any[];
}

export function ExploreView({ graph, setGraph, query, setQuery, courses }: ExploreViewProps) {
  const TAG_FILTER_OPTIONS = courses?.map((course) => course.name) || [];

  // Refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const tagFilterRef = useRef<string>("");
  const tagColorMapRef = useRef<Map<string, string>>(new Map());
  const graphRef = useRef(graph);

  // State
  const [tagFilter, setTagFilter] = useState("");
  const [showMigration, setShowMigration] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [showNodeForm, setShowNodeForm] = useState(false);
  const [editingNode, setEditingNode] = useState<any>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [edgeContextMenu, setEdgeContextMenu] = useState<{ x: number; y: number; edgeId: string } | null>(null);
  const [editingEdge, setEditingEdge] = useState<{ id: string; note: string } | null>(null);
  const [showEdgeForm, setShowEdgeForm] = useState(false);
  const [hoverEdge, setHoverEdge] = useState<{ id: string; src: string; tgt: string; note: string; weight?: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Custom hooks
  const {
    edgeCreation,
    edgeCreationRef,
    edgeError,
    enterEdgeMode,
    exitEdgeMode,
    ensurePreview,
    removePreview,
    handleEdgeNodeSelection,
    updatePreviewPosition,
  } = useEdgeCreation({ cyRef, graphRef, setGraph });

  const {
    nodeDeletionMode,
    nodeDeletionModeRef,
    updateNodeDeletionMode,
    handleNodeDeletion,
  } = useNodeDeletion({ setGraph, setSelected });

  // Sync refs with state
  useEffect(() => {
    tagFilterRef.current = tagFilter;
  }, [tagFilter]);

  useEffect(() => {
    graphRef.current = graph;
  }, [graph]);

  // Build tag color map
  const tagColorMap = useMemo(() => {
    const map = new Map<string, string>();
    courses?.forEach((course) => {
      map.set(course.name, course.color);
    });
    tagColorMapRef.current = map;
    return map;
  }, [courses]);

  // Build graph elements for Cytoscape
  const elements = useMemo(() => {
    const nodes = (graph.nodes || []).map((node) => {
      const courseName = (node.tags && node.tags[0]) || "other";
      let position = node.pos;

      if (!position) {
        position = NodePositionManager.findNonOverlappingPosition(
          (graph.nodes || [])
            .filter((other) => other.id !== node.id)
            .map((other) => ({ ...other, pos: other.pos })),
          courseName
        );
      }

      const fallbackColor = tagColorMap.get(courseName);
      return {
        data: { ...node, color: node.color ?? fallbackColor ?? undefined },
        position,
      };
    });

    const edges = (graph.edges || []).map((edge, index) => ({
      data: {
        id: edge.id || `e-${index}`,
        ...edge,
        note: normalizeNote(edge.note ?? edge.relation),
      },
    }));

    return { nodes, edges };
  }, [graph, tagColorMap]);

  const closeEdgeContextMenu = useCallback(() => {
    setEdgeContextMenu(null);
    setHoverEdge(null);
  }, []);

  // Initialize Cytoscape graph
  useCytoscapeGraph({
    containerRef,
    cyRef,
    tagFilterRef,
    tagColorMapRef,
    edgeCreationRef,
    nodeDeletionModeRef,
    setSelected,
    setContextMenu,
    setEdgeContextMenu,
    setHoverEdge,
    setGraph,
    handleEdgeNodeSelection,
    handleNodeDeletion,
    updateNodeDeletionMode,
    exitEdgeMode,
    closeEdgeContextMenu,
    updatePreviewPosition,
  });

  // Apply styles when tag filter or color map changes
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const styles = getCytoscapeStyles(tagFilterRef, tagColorMapRef);
    cy.style(styles);
  }, [tagColorMap, tagFilter]);

  // Sync graph elements with Cytoscape
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.batch(() => {
      const desiredNodes = new Map(elements.nodes.map((node) => [node.data.id, node]));
      const desiredEdges = new Map(elements.edges.map((edge) => [edge.data.id, edge]));

      // Update or remove existing nodes
      cy.nodes().forEach((node) => {
        const id = node.id();
        if (id.startsWith("__")) return; // Skip preview nodes

        const desired = desiredNodes.get(id);
        if (!desired) {
          node.remove();
          return;
        }

        node.data({ ...desired.data });
        if (desired.position) {
          const { x, y } = desired.position;
          const current = node.position();
          if (current.x !== x || current.y !== y) {
            node.position(desired.position);
          }
        }
        desiredNodes.delete(id);
      });

      // Add new nodes
      desiredNodes.forEach((node) => {
        cy.add({
          group: "nodes",
          data: { ...node.data },
          position: node.position,
        });
      });

      // Update or remove existing edges
      cy.edges().forEach((edge) => {
        const id = edge.id();
        if (id === PREVIEW_EDGE_ID) return; // Skip preview edges

        const desired = desiredEdges.get(id);
        if (!desired) {
          edge.remove();
          return;
        }

        edge.data({ ...desired.data });
        desiredEdges.delete(id);
      });

      // Add new edges
      desiredEdges.forEach((edge) => {
        cy.add({
          group: "edges",
          data: { ...edge.data },
        });
      });
    });

    // Restore edge creation preview if needed
    if (edgeCreationRef.current.active && edgeCreationRef.current.sourceId) {
      const source = cy.getElementById(edgeCreationRef.current.sourceId);
      if (!source || source.empty()) {
        exitEdgeMode();
      } else {
        ensurePreview(edgeCreationRef.current.sourceId);
      }
    }
  }, [elements, ensurePreview, exitEdgeMode, edgeCreationRef]);

  // Apply search and tag filters
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.nodes().removeClass("dimmed");
    const trimmed = query.trim().toLowerCase();

    cy.nodes().forEach((node) => {
      // Search across title, tags, and author
      const title = (node.data("title") || node.id()).toLowerCase();
      const tags = (node.data("tags") || []).map((t: string) => t.toLowerCase());
      const author = (node.data("author") || "").toLowerCase();

      const searchMatch = !trimmed ||
        title.includes(trimmed) ||
        tags.some((tag: string) => tag.includes(trimmed)) ||
        author.includes(trimmed);

      const tagMatch = !tagFilter || (node.data("tags") || []).includes(tagFilter);

      if (!(searchMatch && tagMatch)) {
        node.addClass("dimmed");
      }
    });
  }, [query, tagFilter]);

  // Keyboard shortcuts for edge creation
  useEffect(() => {
    if (!edgeCreation.active) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        exitEdgeMode();
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [edgeCreation.active, exitEdgeMode]);

  // Keyboard shortcuts for node deletion
  useEffect(() => {
    if (!nodeDeletionMode) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        updateNodeDeletionMode(false);
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [nodeDeletionMode, updateNodeDeletionMode]);

  // Click outside to close context menus
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
      closeEdgeContextMenu();
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [closeEdgeContextMenu]);

  // UI Event Handlers
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

    updateNodeDeletionMode(false);
    enterEdgeMode(contextMenu.nodeId);
    setContextMenu(null);
  }, [contextMenu, enterEdgeMode, updateNodeDeletionMode]);

  const handleAddEdgeButton = useCallback(() => {
    updateNodeDeletionMode(false);

    if (edgeCreation.active) {
      exitEdgeMode();
    } else {
      enterEdgeMode();
    }
  }, [edgeCreation.active, enterEdgeMode, exitEdgeMode, updateNodeDeletionMode]);

  const handleDeleteNodeButton = useCallback(() => {
    const next = !nodeDeletionMode;
    updateNodeDeletionMode(next);

    if (next) {
      exitEdgeMode();
      setContextMenu(null);
      closeEdgeContextMenu();
    }
  }, [closeEdgeContextMenu, exitEdgeMode, nodeDeletionMode, updateNodeDeletionMode]);

  const handleDeleteEdge = useCallback(async () => {
    if (!edgeContextMenu) return;

    if (!window.confirm("Delete this edge?")) {
      closeEdgeContextMenu();
      return;
    }

    try {
      await deleteEdge(edgeContextMenu.edgeId);
      setGraph((prev) => ({
        ...prev,
        edges: prev.edges.filter((edge) => edge.id !== edgeContextMenu.edgeId),
      }));
      setHoverEdge(null);
    } catch (error) {
      console.error("Failed to delete edge:", error);
    } finally {
      closeEdgeContextMenu();
    }
  }, [closeEdgeContextMenu, edgeContextMenu, setGraph]);

  const handleEditEdge = useCallback(() => {
    if (!edgeContextMenu) return;

    const edge = graphRef.current?.edges.find((e) => e.id === edgeContextMenu.edgeId);
    if (!edge) {
      closeEdgeContextMenu();
      return;
    }

    const note = normalizeNote(edge.note ?? edge.relation);
    setEditingEdge({ id: edge.id, note });
    setShowEdgeForm(true);
    closeEdgeContextMenu();
  }, [closeEdgeContextMenu, edgeContextMenu]);

  const handleEdgeNoteSubmit = useCallback(
    async (note: string) => {
      if (!editingEdge) return;

      const trimmed = note.trim();

      try {
        const updated = await updateEdge(editingEdge.id, { relation: trimmed || null });
        const normalized = normalizeNote(updated.note ?? updated.relation);

        setGraph((prev) => ({
          ...prev,
          edges: prev.edges.map((edge) =>
            edge.id === editingEdge.id
              ? { ...edge, relation: updated.relation, note: normalized }
              : edge
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
    async (nodeData: any) => {
      if (editingNode) {
        const updatedNode = await updateNode(editingNode.id, nodeData);
        setGraph((prev) => ({
          ...prev,
          nodes: prev.nodes.map((node) =>
            node.id === editingNode.id ? { ...node, ...updatedNode } : node
          ),
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

  const closeNodeForm = useCallback(() => {
    setShowNodeForm(false);
    setEditingNode(null);
  }, []);

  return (
    <div className={`grid gap-0 ${selected ? "grid-cols-12" : "grid-cols-1"}`}>
      <div
        className={`${selected ? "col-span-9 border-r border-slate-800" : "col-span-1"} relative`}
        onMouseMove={(event) => setMousePos({ x: event.clientX + 16, y: event.clientY + 16 })}
      >
        {/* Toolbar */}
        <div className="p-3 flex items-center gap-2 border-b border-slate-800">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search titles, tags, authors..."
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
                : "border-slate-700 hover:border-sky-500/60"
            }`}
          >
            {edgeCreation.active ? "Cancel Add Edge" : "Add Edge"}
          </button>
          <button
            onClick={handleDeleteNodeButton}
            className={`px-4 py-2 rounded-lg border ${
              nodeDeletionMode
                ? "border-red-500/60 bg-red-500/15 text-red-200"
                : "border-slate-700 hover:border-red-500/50"
            }`}
          >
            {nodeDeletionMode ? "Cancel Delete" : "Delete Node"}
          </button>
          <button
            onClick={() => setShowMigration(!showMigration)}
            className="px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-600"
          >
            Migrate JSON
          </button>
          <span className="text-xs text-slate-400 ml-2">Right-click nodes to edit | Drag to move</span>
        </div>

        {/* Edge creation banner */}
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

        {/* Node deletion banner */}
        {nodeDeletionMode && (
          <div className="px-3 pt-2">
            <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              Delete mode: click a node to remove it. Press Esc to cancel.
            </div>
          </div>
        )}

        {/* Migration tool */}
        {showMigration && (
          <div className="border-t border-slate-800 p-4">
            <JsonMigrationButton onComplete={() => window.location.reload()} />
          </div>
        )}

        {/* Cytoscape container */}
        <div ref={containerRef} className="h-[calc(100vh-8rem)]" />

        {/* Edge hover tooltip */}
        {hoverEdge && (
          <div
            style={{ position: "fixed", left: mousePos.x, top: mousePos.y }}
            className="max-w-xs rounded-xl border border-sky-600/40 bg-slate-900/95 p-3 text-sm shadow-xl"
          >
            <div className="mb-1 font-medium text-slate-300">Connection</div>
            <div>
              <strong>{hoverEdge.src}</strong> → <strong>{hoverEdge.tgt}</strong>
            </div>
            {hoverEdge.note && <div className="mt-1 italic text-slate-300">{hoverEdge.note}</div>}
            {hoverEdge.weight != null && (
              <div className="mt-1 text-slate-400">Weight: {hoverEdge.weight}</div>
            )}
          </div>
        )}
      </div>

      {/* Details sidebar */}
      {selected && (
        <aside className="col-span-3 h-[calc(100vh-3.25rem)] overflow-auto text-base">
          <div className="p-4">
            <h2 className="mb-2 text-xl font-semibold">Details</h2>
            <div className="space-y-2">
              <div className="text-2xl font-semibold leading-tight">{selected.title || selected.id}</div>
              <div className="text-slate-300 text-base">
                {selected.author} {selected.year ? `- ${selected.year}` : ""}
              </div>
              {selected.tags?.length ? (
                <div className="flex flex-wrap gap-1">
                  {selected.tags.map((tag: string) => (
                    <span key={tag} className="text-sm px-2 py-0.5 rounded-full border border-slate-700">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              {selected.abstract && <p className="mt-2 text-base text-slate-200">{selected.abstract}</p>}
              {selected.notes && (
                <div className="mt-3">
                  <div className="text-base font-medium text-white">Notes</div>
                  <p className="whitespace-pre-wrap text-base text-slate-200">{selected.notes}</p>
                </div>
              )}
              {selected.metadata && Object.keys(selected.metadata).length > 0 && (
                <div className="mt-3 space-y-2">
                  {Object.entries(selected.metadata as Record<string, string>).map(([key, value]) => (
                    <div key={key}>
                      <div className="text-base font-medium text-white">{key}</div>
                      <div className="text-base text-slate-200">{value}</div>
                    </div>
                  ))}
                </div>
              )}
              {/* Display URLs - handle both legacy url and new urls array */}
              {((selected.urls && selected.urls.length > 0) || selected.url) && (
                <div className="mt-3">
                  <div className="text-base font-medium text-white mb-2">Links</div>
                  <div className="space-y-1">
                    {selected.urls && selected.urls.length > 0 ? (
                      selected.urls.map((url: string, index: number) => (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-sky-400 hover:underline text-base truncate"
                          title={url}
                        >
                          {url}
                        </a>
                      ))
                    ) : selected.url ? (
                      <a
                        href={selected.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-sky-400 hover:underline text-base truncate"
                        title={selected.url}
                      >
                        {selected.url}
                      </a>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      )}

      {/* Context menus and modals */}
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
          onClose={closeEdgeContextMenu}
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
        onCancel={closeNodeForm}
        isOpen={showNodeForm}
      />
    </div>
  );
}
