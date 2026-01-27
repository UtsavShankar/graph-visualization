import { useCallback, useRef, useState } from "react";
import cytoscape from "cytoscape";
import { deleteNode } from "../lib/database";

interface UseNodeDeletionProps {
  cyRef: React.RefObject<cytoscape.Core | null>;
  setGraph: React.Dispatch<React.SetStateAction<{ nodes: any[]; edges: any[] }>>;
  setSelected: React.Dispatch<React.SetStateAction<any>>;
}

/**
 * Custom hook for managing node deletion mode
 * Handles deletion mode state and node removal with confirmation
 */
export function useNodeDeletion({ cyRef, setGraph, setSelected }: UseNodeDeletionProps) {
  const [nodeDeletionMode, setNodeDeletionMode] = useState(false);
  const nodeDeletionModeRef = useRef(false);

  // Sync state to ref for event handlers
  const updateNodeDeletionMode = useCallback((mode: boolean) => {
    setNodeDeletionMode(mode);
    nodeDeletionModeRef.current = mode;

    const cy = cyRef.current;
    if (cy) {
      if (mode) {
        // Disable node dragging during deletion mode
        cy.nodes().forEach((node) => {
          if (!node.id().startsWith("__")) {
            node.grabify();
            node.ungrabify(); // Make nodes not grabbable
          }
        });
      } else {
        // Re-enable node dragging when exiting deletion mode
        cy.nodes().forEach((node) => {
          if (!node.id().startsWith("__")) {
            node.grabify(); // Make nodes grabbable again
          }
        });
      }
    }
  }, [cyRef]);

  /** Handle node deletion with confirmation */
  const handleNodeDeletion = useCallback(
    async (nodeId: string) => {
      if (!window.confirm("Delete this node and its connections?")) {
        return;
      }

      try {
        await deleteNode(nodeId);
        setGraph((prev) => ({
          ...prev,
          nodes: prev.nodes.filter((node) => node.id !== nodeId),
          edges: prev.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
        }));
        setSelected((prev: any) => (prev?.id === nodeId ? null : prev));
      } catch (error) {
        console.error("Failed to delete node:", error);
      } finally {
        updateNodeDeletionMode(false);
      }
    },
    [setGraph, setSelected, updateNodeDeletionMode]
  );

  return {
    nodeDeletionMode,
    nodeDeletionModeRef,
    updateNodeDeletionMode,
    handleNodeDeletion,
  };
}
