import React, { useCallback, useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import { getCytoscapeStyles } from "../lib/cytoscape-styles";

interface MapMagnifierProps {
  cyMain: cytoscape.Core | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  tagFilterRef: React.RefObject<string>;
  tagColorMapRef: React.RefObject<Map<string, string>>;
  magnificationFactor?: number;
  width?: number;
  height?: number;
}

/**
 * MapMagnifier component - displays a zoomed-in view of the graph
 * that follows the cursor position on the main graph
 */
export function MapMagnifier({
  cyMain,
  containerRef,
  tagFilterRef,
  tagColorMapRef,
  magnificationFactor = 3,
  width = 300,
  height = 200,
}: MapMagnifierProps) {
  const zoomContainerRef = useRef<HTMLDivElement | null>(null);
  const cyZoomRef = useRef<cytoscape.Core | null>(null);
  const mousePositionRef = useRef<{ x: number; y: number } | null>(null);
  const zoomMapImageRef = useRef<HTMLImageElement | null>(null);

  /**
   * Convert rendered cursor coordinates to model coordinates
   * Formula: model = (rendered - pan) / zoom
   */
  const renderedToModel = (
    cy: cytoscape.Core,
    renderedX: number,
    renderedY: number
  ): { x: number; y: number } => {
    const zoom = cy.zoom();
    const pan = cy.pan();
    return {
      x: (renderedX - pan.x) / zoom,
      y: (renderedY - pan.y) / zoom,
    };
  };

  /**
   * Synchronize world map with zoom Cytoscape viewport
   */
  const syncZoomMapWithViewport = useCallback(() => {
    const cyZoom = cyZoomRef.current;
    const mapImg = zoomMapImageRef.current;

    if (!cyZoom || !mapImg) return;

    const zoom = cyZoom.zoom();
    const pan = cyZoom.pan();

    // Simple direct mapping - same as main map
    mapImg.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
  }, []);

  /**
   * Update the zoom view to center on the cursor position
   */
  const updateZoomView = useCallback(() => {
    const mainCy = cyMainRef.current;
    const zoomCy = cyZoomRef.current;
    const mousePos = mousePositionRef.current;

    if (!mainCy || !zoomCy || !mousePos || !containerRef.current) return;

    // Get the container's bounding rect to convert client coordinates to Cytoscape container coordinates
    const rect = containerRef.current.getBoundingClientRect();
    const renderedX = mousePos.x - rect.left;
    const renderedY = mousePos.y - rect.top;

    // Convert to model coordinates
    const modelPos = renderedToModel(mainCy, renderedX, renderedY);

    // Get main graph's zoom and calculate zoom view's zoom
    const mainZoom = mainCy.zoom();
    const zoomZoom = mainZoom * magnificationFactor;

    // Center the zoom view on the model position
    const zoomContainer = zoomContainerRef.current;
    if (!zoomContainer) return;

    const zoomWidth = zoomContainer.clientWidth;
    const zoomHeight = zoomContainer.clientHeight;

    // Calculate pan to center the model position in the zoom view
    const panX = (zoomWidth / 2) - (modelPos.x * zoomZoom);
    const panY = (zoomHeight / 2) - (modelPos.y * zoomZoom);

    zoomCy.zoom(zoomZoom);
    zoomCy.pan({ x: panX, y: panY });
    
    // Sync map after updating zoom view
    requestAnimationFrame(syncZoomMapWithViewport);
  }, [magnificationFactor, syncZoomMapWithViewport]);

  // Keep a ref to cyMain to avoid stale closures
  const cyMainRef = useRef(cyMain);
  useEffect(() => {
    cyMainRef.current = cyMain;
  }, [cyMain]);

  // Initialize zoom Cytoscape instance
  useEffect(() => {
    if (!zoomContainerRef.current || cyZoomRef.current || !cyMain) return;

    // Get elements from main graph
    const mainJson = cyMain.json();
    const elements = mainJson.elements as cytoscape.ElementsDefinition;

    // Create zoom instance with same elements and styles
    const cyZoom = cytoscape({
      container: zoomContainerRef.current,
      elements,
      layout: { name: "preset", fit: false, animate: false },
      userZoomingEnabled: false,
      userPanningEnabled: false,
      boxSelectionEnabled: false,
      autoungrabify: true,
      wheelSensitivity: 0,
    });

    // Apply same styles as main graph
    const styles = getCytoscapeStyles(tagFilterRef, tagColorMapRef);
    cyZoom.style(styles);

    // Set initial zoom level
    cyZoom.zoom(cyMain.zoom() * magnificationFactor);

    cyZoomRef.current = cyZoom;

    return () => {
      try {
        cyZoom.destroy();
      } catch (error) {
        // Ignore errors during cleanup
      }
      cyZoomRef.current = null;
    };
  }, [cyMain, tagFilterRef, tagColorMapRef, magnificationFactor]);

  // Sync node positions from main to zoom instance
  useEffect(() => {
    if (!cyMain || !cyZoomRef.current) return;

    const cyZoom = cyZoomRef.current;

    const syncPositions = () => {
      cyMain.nodes().forEach((node) => {
        const zoomNode = cyZoom.getElementById(node.id());
        if (zoomNode.nonempty()) {
          const pos = node.position();
          zoomNode.position(pos);
        }
      });
    };

    // Sync on position changes
    cyMain.on("position", "node", syncPositions);
    cyMain.on("add", "node", syncPositions);
    cyMain.on("remove", "node", () => {
      // Remove will be handled by element sync
    });

    // Initial sync
    syncPositions();

    return () => {
      cyMain.off("position", "node", syncPositions);
      cyMain.off("add", "node", syncPositions);
    };
  }, [cyMain]);

  // Sync elements (nodes and edges) when main graph changes
  useEffect(() => {
    if (!cyMain || !cyZoomRef.current) return;

    const cyZoom = cyZoomRef.current;

    // Handle node addition
    const handleNodeAdd = (event: cytoscape.EventObject) => {
      const node = event.target;
      if (node.id().startsWith("__")) return; // Skip preview nodes

      const existing = cyZoom.getElementById(node.id());
      if (existing.empty()) {
        cyZoom.add({
          group: "nodes",
          data: node.data(),
          position: node.position(),
        });
      }
    };

    // Handle edge addition
    const handleEdgeAdd = (event: cytoscape.EventObject) => {
      const edge = event.target;
      if (edge.id().startsWith("__")) return; // Skip preview edges

      const existing = cyZoom.getElementById(edge.id());
      if (existing.empty()) {
        cyZoom.add({
          group: "edges",
          data: edge.data(),
        });
      }
    };

    // Handle element removal
    const handleRemove = (event: cytoscape.EventObject) => {
      const element = event.target;
      const zoomElement = cyZoom.getElementById(element.id());
      if (zoomElement.nonempty()) {
        zoomElement.remove();
      }
    };

    // Handle data updates
    const handleData = (event: cytoscape.EventObject) => {
      const element = event.target;
      const zoomElement = cyZoom.getElementById(element.id());
      if (zoomElement.nonempty()) {
        zoomElement.data(element.data());
      }
    };

    // Attach event listeners
    cyMain.on("add", "node", handleNodeAdd);
    cyMain.on("add", "edge", handleEdgeAdd);
    cyMain.on("remove", handleRemove);
    cyMain.on("data", handleData);

    // Initial sync - add all existing elements
    cyMain.nodes().forEach((node) => {
      if (node.id().startsWith("__")) return;
      const existing = cyZoom.getElementById(node.id());
      if (existing.empty()) {
        cyZoom.add({
          group: "nodes",
          data: node.data(),
          position: node.position(),
        });
      }
    });

    cyMain.edges().forEach((edge) => {
      if (edge.id().startsWith("__")) return;
      const existing = cyZoom.getElementById(edge.id());
      if (existing.empty()) {
        cyZoom.add({
          group: "edges",
          data: edge.data(),
        });
      }
    });

    return () => {
      cyMain.off("add", "node", handleNodeAdd);
      cyMain.off("add", "edge", handleEdgeAdd);
      cyMain.off("remove", handleRemove);
      cyMain.off("data", handleData);
    };
  }, [cyMain]);

  // Track mouse movement on main graph container
  useEffect(() => {
    if (!containerRef.current) return;

    const handleMouseMove = (event: MouseEvent) => {
      mousePositionRef.current = { x: event.clientX, y: event.clientY };
      updateZoomView();
    };

    const container = containerRef.current;
    container.addEventListener("mousemove", handleMouseMove);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
    };
  }, [containerRef, updateZoomView]);

  // Update zoom view when main graph pan/zoom changes
  useEffect(() => {
    if (!cyMain) return;

    const handleViewportChange = () => {
      requestAnimationFrame(updateZoomView);
    };

    cyMain.on("pan", handleViewportChange);
    cyMain.on("zoom", handleViewportChange);
    cyMain.on("viewport", handleViewportChange);

    return () => {
      cyMain.off("pan", handleViewportChange);
      cyMain.off("zoom", handleViewportChange);
      cyMain.off("viewport", handleViewportChange);
    };
  }, [cyMain, updateZoomView]);

  // Update zoom map when zoom instance pan/zoom changes
  useEffect(() => {
    const cyZoom = cyZoomRef.current;
    if (!cyZoom) return;

    const handleViewportChange = () => {
      requestAnimationFrame(syncZoomMapWithViewport);
    };

    cyZoom.on("pan", handleViewportChange);
    cyZoom.on("zoom", handleViewportChange);
    cyZoom.on("viewport", handleViewportChange);

    // Initial sync
    syncZoomMapWithViewport();

    return () => {
      cyZoom.off("pan", handleViewportChange);
      cyZoom.off("zoom", handleViewportChange);
      cyZoom.off("viewport", handleViewportChange);
    };
  }, [syncZoomMapWithViewport]);

  // Update zoom view when styles change (tag filter, etc.)
  useEffect(() => {
    if (!cyZoomRef.current) return;

    const styles = getCytoscapeStyles(tagFilterRef, tagColorMapRef);
    cyZoomRef.current.style(styles);
  }, [tagFilterRef, tagColorMapRef]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 16,
        right: 16,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: 10,
        border: "2px solid rgba(148, 163, 184, 0.5)",
        borderRadius: "8px",
        overflow: "hidden",
        backgroundColor: "#0f172a",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.3)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "4px 8px",
          backgroundColor: "rgba(15, 23, 42, 0.9)",
          borderBottom: "1px solid rgba(148, 163, 184, 0.3)",
          fontSize: "11px",
          color: "#cbd5e1",
          zIndex: 11,
        }}
      >
        Zoomed view (follows cursor)
      </div>
      {/* Map background image for zoom view - positioned to match Cytoscape coordinate space */}
      <div
        style={{
          position: "absolute",
          top: "24px",
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "calc(100% - 24px)",
          pointerEvents: "none",
          overflow: "hidden",
          zIndex: 0,
        }}
      >
        <img
          ref={zoomMapImageRef}
          src={`${import.meta.env.BASE_URL}world-map.svg`}
          alt="World map background"
          style={{
            position: "absolute",
            top: 0,
            left: "0",
            width: "7100px",
            height: "auto",
            maxWidth: "none",
            maxHeight: "none",
            opacity: 0.3,
            transformOrigin: "0 0",
            willChange: "transform",
          }}
          onLoad={syncZoomMapWithViewport}
        />
      </div>
      {/* Zoom Cytoscape canvas */}
      <div
        ref={zoomContainerRef}
        style={{
          position: "absolute",
          top: "24px",
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "calc(100% - 24px)",
          zIndex: 1,
        }}
      />
      {/* Crosshair indicator */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "20px",
          height: "20px",
          pointerEvents: "none",
          zIndex: 12,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            height: "2px",
            backgroundColor: "white",
            transform: "translateY(-50%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: 0,
            width: "2px",
            backgroundColor: "white",
            transform: "translateX(-50%)",
          }}
        />
      </div>
    </div>
  );
}

