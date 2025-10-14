// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import cytoscape, { EdgeSingular, NodeSingular } from "cytoscape";
import fcose from "cytoscape-fcose";
import {
  createEdge,
  createNode,
  deleteEdge,
  deleteNode,
  updateEdge,
  updateNode,
  updateNodePosition,
} from "./lib/database";
import { NodePositionManager } from "./lib/positioning";
import { ContextMenu } from "./components/ContextMenu";
import { EdgeContextMenu } from "./components/EdgeContextMenu";
import { EdgeNoteForm } from "./components/EdgeNoteForm";
import { JsonMigrationButton } from "./components/JsonMigrationButton";
import { NodeForm } from "./components/NodeForm";
cytoscape.use(fcose);

const PREVIEW_NODE_ID = "__edge-preview-node";
const PREVIEW_EDGE_ID = "__edge-preview-edge";

const normalizeNote = (value?: string | null) => (value ? value.trim() : "");

export function ExploreView({ graph, setGraph, query, setQuery, courses }) {
  const TAG_FILTER_OPTIONS = courses?.map((course) => course.name) || [];

  const throttle = (func, limit) => {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  }

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  const tagFilterRef = useRef<string>("");
  const tagColorMapRef = useRef<Map<string, string>>(new Map());
  const graphRef = useRef(graph);
  const edgeCreationRef = useRef({ active: false, sourceId: null as string | null });
  const nodeDeletionModeRef = useRef(false);
  const previewRef = useRef<{ node: NodeSingular | null; edge: EdgeSingular | null }>({ node: null, edge: null });

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
  const [edgeCreation, setEdgeCreation] = useState({ active: false, sourceId: null as string | null });
  const [edgeError, setEdgeError] = useState("");
  const [nodeDeletionMode, setNodeDeletionMode] = useState(false);
  const [searchScope, setSearchScope] = useState("both");
  const [hoveredNode, setHoveredNode] = useState<{ title: string; x: number; y: number } | null>(null);
  const [nodeSize, setNodeSize] = useState(() => Number(localStorage.getItem("node-size") || 26));
  const [labelSize, setLabelSize] = useState(() => Number(localStorage.getItem("label-size") || 11));

  useEffect(() => {
    localStorage.setItem("node-size", String(nodeSize));
    localStorage.setItem("label-size", String(labelSize));
    applyStyles();
  }, [nodeSize, labelSize]);

  const zoom = (factor: number) => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.zoom(cy.zoom() * factor);
  };

  const resetView = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.fit(undefined, 40);
  }, []);

  const saveView = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const view = { pan: cy.pan(), zoom: cy.zoom() };
    localStorage.setItem("cytoscape-view", JSON.stringify(view));
  }, []);

  const restoreView = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const savedView = localStorage.getItem("cytoscape-view");
    if (savedView) {
      const view = JSON.parse(savedView);
      cy.viewport(view);
    }
  }, []);

  useEffect(() => {
    tagFilterRef.current = tagFilter;
  }, [tagFilter]);

  const tagColorMap = useMemo(() => {
    const map = new Map<string, string>();
    courses?.forEach((course) => {
      map.set(course.name, course.color);
    });
    tagColorMapRef.current = map;
    return map;
  }, [courses]);

  useEffect(() => {
    graphRef.current = graph;
  }, [graph]);

  useEffect(() => {
    edgeCreationRef.current = edgeCreation;
  }, [edgeCreation]);

  useEffect(() => {
    nodeDeletionModeRef.current = nodeDeletionMode;
  }, [nodeDeletionMode]);

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
    cy?.nodes().removeClass("edge-creation-source edge-creation-target");
  }, []);

  const closeEdgeContextMenu = useCallback(() => {
    setEdgeContextMenu(null);
    setHoverEdge(null);
  }, []);

  const ensurePreview = useCallback(
    (sourceId: string) => {
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
        selectable: false,
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
    (sourceId: string | null = null) => {
      setEdgeCreation({ active: true, sourceId });
      edgeCreationRef.current = { active: true, sourceId };
      setEdgeError("");
      setContextMenu(null);
      closeEdgeContextMenu();
      if (sourceId) {
        ensurePreview(sourceId);
      } else {
        removePreview();
      }
    },
    [closeEdgeContextMenu, ensurePreview, removePreview]
  );

  const isDuplicateEdge = useCallback((sourceId: string, targetId: string) => {
    const edges = graphRef.current?.edges || [];
    return edges.some(
      (edge) =>
        (edge.source === sourceId && edge.target === targetId) ||
        (edge.source === targetId && edge.target === sourceId)
    );
  }, []);

  const handleNodeDeletion = useCallback(
    async (nodeId: string) => {
      if (!window.confirm("Delete this node and its connections?")) {
        return;
      }
      try {
        await deleteNode(nodeId);
        if (selected?.id === nodeId) {
          setSelected(null);
        }
        setGraph((prev) => ({
          ...prev,
          nodes: prev.nodes.filter((node) => node.id !== nodeId),
          edges: prev.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
        }));
      } catch (error) {
        console.error("Failed to delete node:", error);
      } finally {
        setNodeDeletionMode(false);
        nodeDeletionModeRef.current = false;
      }
    },
    [setGraph]
  );

  const handleEdgeNodeSelection = useCallback(
    async (nodeId: string) => {
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

  const applyStyles = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.style([
      {
        selector: "core",
        style: { "selection-box-color": "#60a5fa", "active-bg-opacity": 0 },
      },
      {
        selector: "node",
        style: {
          "background-color": (ele) => {
            const activeFilter = tagFilterRef.current;
            const colorMap = tagColorMapRef.current;
            if (activeFilter && !(ele.data("tags") || []).includes(activeFilter)) {
              return "#64748b";
            }
            const dataColor = ele.data("color");
            if (dataColor) return dataColor;
            const tags = ele.data("tags") || [];
            const first = tags[0];
            return first ? colorMap.get(first) || "#93c5fd" : "#93c5fd";
          },
          label: (ele) => ele.data("title") || ele.id(),
          "font-size": labelSize,
          "text-wrap": "wrap",
          "text-max-width": 140,
          "text-valign": "center",
          "text-halign": "center",
          color: "#ffffff",
          "border-width": 2,
          "border-color": "#0ea5e9",
          "border-opacity": 0.35,
          width: nodeSize,
          height: nodeSize,
          shape: "ellipse",
          "transition-property": "background-color opacity width height border-width",
          "transition-duration": 150,
        },
      },
      { selector: "node.hovered", style: { width: (ele) => ele.width() * 1.2, height: (ele) => ele.height() * 1.2, "border-width": 3 } },
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
      {
        selector: ".zoom-low node",
        style: {
          "font-size": Math.max(8, labelSize * 0.7),
          "text-opacity": 0.6,
        },
      },
      {
        selector: ".zoom-high node",
        style: {
          "font-size": Math.min(20, labelSize * 1.4),
          "text-max-width": 200,
        },
      },
    ]);
  }, []);
  useEffect(() => {
    applyStyles();
  }, [applyStyles, tagColorMap, tagFilter, nodeSize, labelSize]);


  useEffect(() => {
    if (!containerRef.current || cyRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      layout: { name: "preset", fit: true, animate: false },
      wheelSensitivity: 0.32,
    });

    cyRef.current = cy;
    applyStyles();

    const clearFocus = () => {
      cy.elements().removeClass("faded hovered");
      setSelected(null);
    };

    cy.on("tap", (event) => {
      if (event.target === cy) {
        if (edgeCreationRef.current.active) {
          exitEdgeMode();
        } else if (nodeDeletionModeRef.current) {
          setNodeDeletionMode(false);
        } else {
          clearFocus();
        }
      }
    });

    cy.on("tap", "node", (event) => {
      const node = event.target;
      const nodeId = node.id();
      if (nodeId === PREVIEW_NODE_ID) return;

      if (nodeDeletionModeRef.current) {
        event.preventDefault();
        void handleNodeDeletion(nodeId);
        return;
      }

      if (edgeCreationRef.current.active) {
        event.preventDefault();
        void handleEdgeNodeSelection(nodeId);
        return;
      }

      const neighborhood = node.closedNeighborhood();
      cy.elements().addClass("faded");
      neighborhood.removeClass("faded");
      setSelected(node.data());
    });

    cy.on("cxttap", "node", (event) => {
      if (edgeCreationRef.current.active || nodeDeletionModeRef.current) return;
      event.preventDefault();
      const node = event.target;
      const rendered = node.renderedPosition();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setContextMenu({
        x: rect.left + rendered.x,
        y: rect.top + rendered.y,
        nodeId: node.id(),
      });
      closeEdgeContextMenu();
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

    cy.on("grab", "node", () => {
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

    cy.on("mouseover", "node", (event) => {
      const node = event.target;
      node.addClass("hovered");
      const title = node.data("title");
      if (title) {
        const { x, y } = node.renderedPosition();
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setHoveredNode({ title, x: rect.left + x, y: rect.top + y });
        }
      }
    });

    cy.on("mouseout", "node", (event) => {
      event.target.removeClass("hovered");
      setHoveredNode(null);
    });

    cy.on("mouseout", "edge", (event) => {
      event.target.removeClass("hovered");
      setHoverEdge(null);
    });

    cy.on("mousemove", (event) => {
      if (!edgeCreationRef.current.active || !edgeCreationRef.current.sourceId) return;
      const previewNode = previewRef.current.node;
      if (previewNode && previewNode.length && event.position) {
        previewNode.position(event.position);
      }
    });

    cy.on("remove", "edge", (event) => {
      const removedId = event.target.id();
      if (removedId === PREVIEW_EDGE_ID) return;
      setHoverEdge((current) => (current?.id === removedId ? null : current));
    });

    const handleViewport = () => {
      const zoom = cy.zoom();
      const container = containerRef.current;
      if (!container) return;
      if (zoom < 0.6) {
        container.classList.add("zoom-low");
        container.classList.remove("zoom-high");
      } else if (zoom > 1.4) {
        container.classList.add("zoom-high");
        container.classList.remove("zoom-low");
      } else {
        container.classList.remove("zoom-low", "zoom-high");
      }
    };

    cy.on("viewport", throttle(handleViewport, 100));

    restoreView();

    return () => {
      removePreview();
      try {
        cy.destroy();
      } catch (error) {}
      cyRef.current = null;
    };
  }, [applyStyles, closeEdgeContextMenu, ensurePreview, exitEdgeMode, handleEdgeNodeSelection, handleNodeDeletion, removePreview]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.batch(() => {
      const desiredNodes = new Map(elements.nodes.map((node) => [node.data.id, node]));
      const desiredEdges = new Map(elements.edges.map((edge) => [edge.data.id, edge]));

      cy.nodes().forEach((node) => {
        const id = node.id();
        if (id === PREVIEW_NODE_ID) return;
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

      desiredNodes.forEach((node) => {
        cy.add({
          group: "nodes",
          data: { ...node.data },
          position: node.position,
        });
      });

      cy.edges().forEach((edge) => {
        const id = edge.id();
        if (id === PREVIEW_EDGE_ID) return;
        const desired = desiredEdges.get(id);
        if (!desired) {
          edge.remove();
          return;
        }
        edge.data({ ...desired.data });
        desiredEdges.delete(id);
      });

      desiredEdges.forEach((edge) => {
        cy.add({
          group: "edges",
          data: { ...edge.data },
        });
      });
    });

    if (edgeCreationRef.current.active && edgeCreationRef.current.sourceId) {
      const source = cy.getElementById(edgeCreationRef.current.sourceId);
      if (!source || source.empty()) {
        exitEdgeMode();
      } else {
        ensurePreview(edgeCreationRef.current.sourceId);
      }
    }
  }, [elements, ensurePreview, exitEdgeMode]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().removeClass("dimmed");
    const trimmed = query.trim().toLowerCase();
    if (!trimmed && !tagFilter) {
      return;
    }

    cy.nodes().forEach((node) => {
      const title = (node.data("title") || node.id() || "").toLowerCase();
      const keywords = (node.data("keywords") || []).join(" ").toLowerCase();

      let searchMatch = true;
      if (trimmed) {
        if (searchScope === "title") {
          searchMatch = title.includes(trimmed);
        } else if (searchScope === "keywords") {
          searchMatch = keywords.includes(trimmed);
        } else {
          searchMatch = title.includes(trimmed) || keywords.includes(trimmed);
        }
      }

      const tagMatch = !tagFilter || (node.data("tags") || []).includes(tagFilter);

      if (!(searchMatch && tagMatch)) {
        node.addClass("dimmed");
      }
    });
  }, [query, tagFilter, searchScope]);

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

  useEffect(() => {
    if (!nodeDeletionMode) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNodeDeletionMode(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [nodeDeletionMode]);

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
      closeEdgeContextMenu();
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [closeEdgeContextMenu]);

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
    setNodeDeletionMode(false);
    nodeDeletionModeRef.current = false;
    enterEdgeMode(contextMenu.nodeId);
    setContextMenu(null);
  }, [contextMenu, enterEdgeMode]);

  const handleAddEdgeButton = useCallback(() => {
    setNodeDeletionMode(false);
    nodeDeletionModeRef.current = false;
    if (edgeCreation.active) {
      exitEdgeMode();
    } else {
      enterEdgeMode();
    }
  }, [edgeCreation.active, enterEdgeMode, exitEdgeMode]);

  const handleDeleteNodeButton = useCallback(() => {
    const next = !nodeDeletionMode;
    setNodeDeletionMode(next);
    nodeDeletionModeRef.current = next;
    if (next) {
      exitEdgeMode();
      setContextMenu(null);
      closeEdgeContextMenu();
    }
  }, [closeEdgeContextMenu, exitEdgeMode, nodeDeletionMode]);

  const handleDeleteEdge = useCallback(async () => {
    if (!edgeContextMenu) return;
    if (!window.confirm("Delete this edge?")) {
      closeEdgeContextMenu();
      return;
    }
    try {
      const idToDelete = edgeContextMenu.edgeId;
      await deleteEdge(idToDelete);
      setGraph((prev) => ({
        ...prev,
        edges: prev.edges.filter((edge) => edge.id !== idToDelete),
      }));
      setHoverEdge((prev) => (prev?.id === idToDelete ? null : prev));
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
    async (nodeData) => {
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
        <div className="p-3 flex items-center gap-2 border-b border-slate-800">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search titles..."
            className="w-64 px-3 py-2 rounded-md bg-slate-900 border border-slate-700 outline-none focus:border-sky-500"
          />
          <div className="flex items-center rounded-md border border-slate-700">
            {(["Both", "Title", "Keywords"] as const).map((scope) => (
              <button
                key={scope}
                onClick={() => setSearchScope(scope.toLowerCase())}
                className={`px-3 py-1.5 text-sm first:rounded-l-md last:rounded-r-md border-r border-slate-700 last:border-r-0 ${
                  searchScope === scope.toLowerCase()
                    ? "bg-sky-500/20 text-sky-200"
                    : "hover:bg-slate-800"
                }`}
              >
                {scope}
              </button>
            ))}
          </div>
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

          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-400">Node</label>
              <input type="range" min="18" max="42" value={nodeSize} onChange={(e) => setNodeSize(Number(e.target.value))} className="w-24" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-400">Label</label>
              <input type="range" min="9" max="16" value={labelSize} onChange={(e) => setLabelSize(Number(e.target.value))} className="w-24" />
            </div>
            <button onClick={() => zoom(1.25)} className="px-3 py-1 rounded-md border border-slate-700 hover:bg-slate-800">Zoom In</button>
            <button onClick={() => zoom(0.8)} className="px-3 py-1 rounded-md border border-slate-700 hover:bg-slate-800">Zoom Out</button>
            <button onClick={resetView} className="px-3 py-1 rounded-md border border-slate-700 hover:bg-slate-800">Reset View</button>
            <button onClick={saveView} className="px-3 py-1 rounded-md border border-slate-700 hover:bg-slate-800">Save View</button>
            <button onClick={restoreView} className="px-3 py-1 rounded-md border border-slate-700 hover:bg-slate-800">Restore View</button>
          </div>
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

        {nodeDeletionMode && (
          <div className="px-3 pt-2">
            <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              Delete mode: click a node to remove it. Press Esc to cancel.
            </div>
          </div>
        )}

        {showMigration && (
          <div className="border-t border-slate-800 p-4">
            <JsonMigrationButton onComplete={() => window.location.reload()} />
          </div>
        )}

        <div ref={containerRef} className="h-[calc(100vh-8rem)]" />

        {hoveredNode && (
          <div
            style={{ position: 'fixed', left: hoveredNode.x, top: hoveredNode.y, transform: 'translate(10px, -100%)' }}
            className="max-w-xs rounded-md border border-slate-700 bg-slate-900/95 px-3 py-2 text-sm shadow-lg pointer-events-none"
          >
            {hoveredNode.title}
          </div>
        )}

        {hoverEdge && (
          <div
            style={{ position: "fixed", left: mousePos.x, top: mousePos.y }}
            className="max-w-xs rounded-xl border border-sky-600/40 bg-slate-900/95 p-3 text-sm shadow-xl"
          >
            <div className="mb-1 font-medium text-slate-300">Connection</div>
            <div>
              <strong>{hoverEdge.src}</strong> <strong>{hoverEdge.tgt}</strong>
            </div>
            {hoverEdge.note && <div className="mt-1 italic text-slate-300">{hoverEdge.note}</div>}
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
              {(selected.url || selected.url2) && (
                <div className="mt-3">
                  <div className="text-sm font-medium text-slate-300">Links</div>
                  {selected.url && (
                    <a
                      href={selected.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block text-sky-400 hover:underline"
                    >
                      Link 1
                    </a>
                  )}
                  {selected.url2 && (
                    <a
                      href={selected.url2}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block text-sky-400 hover:underline"
                    >
                      Link 2
                    </a>
                  )}
                </div>
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



