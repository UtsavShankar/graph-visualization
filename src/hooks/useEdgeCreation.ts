import { useCallback, useRef, useState } from "react";
import cytoscape from "cytoscape";
import type { EdgeSingular, NodeSingular } from "cytoscape";
import { createEdge } from "../lib/database";
import { normalizeNote } from "../lib/utils";
import { PREVIEW_EDGE_ID, PREVIEW_NODE_ID } from "../lib/constants";
import type { Edge } from "../lib/supabase";

interface EdgeCreationState {
  active: boolean;
  sourceId: string | null;
}

interface UseEdgeCreationProps {
  cyRef: React.RefObject<cytoscape.Core | null>;
  graphRef: React.RefObject<{ nodes: any[]; edges: Edge[] }>;
  setGraph: React.Dispatch<React.SetStateAction<{ nodes: any[]; edges: Edge[] }>>;
}

/**
 * Custom hook for managing edge creation mode
 * Handles preview nodes/edges and the two-click edge creation workflow
 */
export function useEdgeCreation({ cyRef, graphRef, setGraph }: UseEdgeCreationProps) {
  const [edgeCreation, setEdgeCreation] = useState<EdgeCreationState>({
    active: false,
    sourceId: null,
  });
  const [edgeError, setEdgeError] = useState("");

  const edgeCreationRef = useRef(edgeCreation);
  const previewRef = useRef<{ node: NodeSingular | null; edge: EdgeSingular | null }>({
    node: null,
    edge: null,
  });

  // Sync state to ref for event handlers
  const updateEdgeCreation = useCallback((state: EdgeCreationState) => {
    setEdgeCreation(state);
    edgeCreationRef.current = state;
  }, []);

  /** Remove preview node and edge from the graph */
  const removePreview = useCallback(() => {
    const cy = cyRef.current;
    const { node, edge } = previewRef.current;

    if (edge?.length) {
      try {
        edge.remove();
      } catch (error) {
        // Ignore errors during removal
      }
    }

    if (node?.length) {
      try {
        node.remove();
      } catch (error) {
        // Ignore errors during removal
      }
    }

    previewRef.current = { node: null, edge: null };
    cy?.nodes().removeClass("edge-creation-source edge-creation-target");
  }, [cyRef]);

  /** Create preview node and edge from source node */
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
    [cyRef, removePreview]
  );

  /** Exit edge creation mode */
  const exitEdgeMode = useCallback(() => {
    updateEdgeCreation({ active: false, sourceId: null });
    setEdgeError("");
    removePreview();

    const cy = cyRef.current;
    if (cy) {
      // Re-enable node dragging when exiting edge creation mode
      cy.nodes().forEach((node) => {
        if (!node.id().startsWith("__")) {
          node.grabify(); // Make nodes grabbable again
        }
      });
    }
  }, [removePreview, updateEdgeCreation, cyRef]);

  /** Enter edge creation mode */
  const enterEdgeMode = useCallback(
    (sourceId: string | null = null) => {
      updateEdgeCreation({ active: true, sourceId });
      setEdgeError("");

      const cy = cyRef.current;
      if (cy) {
        // Disable node dragging during edge creation mode
        cy.nodes().forEach((node) => {
          if (!node.id().startsWith("__")) {
            node.grabify();
            node.ungrabify(); // Make nodes not grabbable
          }
        });
      }

      if (sourceId) {
        ensurePreview(sourceId);
      } else {
        removePreview();
      }
    },
    [ensurePreview, removePreview, updateEdgeCreation, cyRef]
  );

  /** Check if an edge already exists between two nodes */
  const isDuplicateEdge = useCallback(
    (sourceId: string, targetId: string) => {
      const edges = graphRef.current?.edges || [];
      return edges.some(
        (edge) =>
          (edge.source === sourceId && edge.target === targetId) ||
          (edge.source === targetId && edge.target === sourceId)
      );
    },
    [graphRef]
  );

  /** Handle node selection during edge creation */
  const handleEdgeNodeSelection = useCallback(
    async (nodeId: string) => {
      setEdgeError("");

      if (!edgeCreationRef.current.sourceId) {
        updateEdgeCreation({ active: true, sourceId: nodeId });
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
    [ensurePreview, exitEdgeMode, isDuplicateEdge, setGraph, updateEdgeCreation]
  );

  /** Update preview node position to follow mouse */
  const updatePreviewPosition = useCallback((position: cytoscape.Position) => {
    const previewNode = previewRef.current.node;
    if (previewNode?.length) {
      previewNode.position(position);
    }
  }, []);

  return {
    edgeCreation,
    edgeCreationRef,
    edgeError,
    previewRef,
    enterEdgeMode,
    exitEdgeMode,
    ensurePreview,
    removePreview,
    handleEdgeNodeSelection,
    updatePreviewPosition,
  };
}
