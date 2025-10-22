import { useEffect } from "react";
import cytoscape from "cytoscape";
import { getCytoscapeStyles } from "../lib/cytoscape-styles";
import { updateNodePosition } from "../lib/database";
import { normalizeNote } from "../lib/utils";
import { PREVIEW_EDGE_ID, PREVIEW_NODE_ID } from "../lib/constants";

interface UseCytoscapeGraphProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  cyRef: React.RefObject<cytoscape.Core | null>;
  tagFilterRef: React.RefObject<string>;
  tagColorMapRef: React.RefObject<Map<string, string>>;
  edgeCreationRef: React.RefObject<{ active: boolean; sourceId: string | null }>;
  nodeDeletionModeRef: React.RefObject<boolean>;
  setSelected: (data: any) => void;
  setContextMenu: (menu: { x: number; y: number; nodeId: string } | null) => void;
  setEdgeContextMenu: (menu: { x: number; y: number; edgeId: string } | null) => void;
  setHoverEdge: React.Dispatch<React.SetStateAction<{ id: string; src: string; tgt: string; note: string; weight?: number } | null>>;
  setGraph: React.Dispatch<React.SetStateAction<{ nodes: any[]; edges: any[] }>>;
  handleEdgeNodeSelection: (nodeId: string) => Promise<void>;
  handleNodeDeletion: (nodeId: string) => Promise<void>;
  updateNodeDeletionMode: (mode: boolean) => void;
  exitEdgeMode: () => void;
  closeEdgeContextMenu: () => void;
  updatePreviewPosition: (position: cytoscape.Position) => void;
}

/**
 * Custom hook for Cytoscape graph initialization and event handling
 * Sets up the graph instance and all event listeners
 */
export function useCytoscapeGraph(props: UseCytoscapeGraphProps) {
  const {
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
  } = props;

  useEffect(() => {
    if (!containerRef.current || cyRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      layout: { name: "preset", fit: true, animate: false },
      wheelSensitivity: 0.32,
    });

    cyRef.current = cy;

    // Apply styles
    const styles = getCytoscapeStyles(tagFilterRef, tagColorMapRef);
    cy.style(styles);

    const clearFocus = () => {
      cy.elements().removeClass("faded hovered");
      setSelected(null);
    };

    // Background tap - clear modes and selection
    cy.on("tap", (event) => {
      if (event.target === cy) {
        if (edgeCreationRef.current?.active) {
          exitEdgeMode();
        } else if (nodeDeletionModeRef.current) {
          updateNodeDeletionMode(false);
        } else {
          clearFocus();
        }
      }
    });

    // Node tap - handle different modes
    cy.on("tap", "node", (event) => {
      const node = event.target;
      const nodeId = node.id();

      if (nodeId === PREVIEW_NODE_ID) return;

      if (nodeDeletionModeRef.current) {
        event.preventDefault();
        void handleNodeDeletion(nodeId);
        return;
      }

      if (edgeCreationRef.current?.active) {
        event.preventDefault();
        void handleEdgeNodeSelection(nodeId);
        return;
      }

      // Normal selection - highlight neighborhood
      const neighborhood = node.closedNeighborhood();
      cy.elements().addClass("faded");
      neighborhood.removeClass("faded");
      setSelected(node.data());
    });

    // Node right-click - show context menu
    cy.on("cxttap", "node", (event) => {
      if (edgeCreationRef.current?.active || nodeDeletionModeRef.current) return;

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

    // Edge right-click - show edge context menu
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

    // Node drag - maintain selection
    cy.on("grab", "node", () => {
      setSelected((prev: any) => prev);
    });

    // Node drop - update position in database
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

    // Edge hover - show tooltip
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

    // Edge mouse out - hide tooltip
    cy.on("mouseout", "edge", (event) => {
      event.target.removeClass("hovered");
      setHoverEdge(null);
    });

    // Mouse move - update preview node position during edge creation
    cy.on("mousemove", (event) => {
      if (!edgeCreationRef.current?.active || !edgeCreationRef.current.sourceId) return;

      if (event.position) {
        updatePreviewPosition(event.position);
      }
    });

    // Edge removal - clear hover state
    cy.on("remove", "edge", (event) => {
      const removedId = event.target.id();
      if (removedId === PREVIEW_EDGE_ID) return;

      setHoverEdge((current) => (current?.id === removedId ? null : current));
    });

    // Initial fit and zoom
    const timeoutId = setTimeout(() => {
      if (!cy.destroyed()) {
        cy.fit(undefined, 40);
        cy.zoom(1.2);
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      try {
        cy.destroy();
      } catch (error) {
        // Ignore errors during cleanup
      }
      cyRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
