import cytoscape from "cytoscape";
import { formatNodeLabel } from "./utils";

/**
 * Cytoscape.js graph stylesheet configuration
 * Defines visual styles for nodes, edges, and their various states
 */
export function getCytoscapeStyles(
  tagFilterRef: React.RefObject<string>,
  tagColorMapRef: React.RefObject<Map<string, string>>
): any[] {
  return [
    {
      selector: "core",
      style: {
        "selection-box-color": "#60a5fa",
        "active-bg-opacity": 0,
      },
    },
    {
      selector: "node",
      style: {
        "background-color": (ele: cytoscape.NodeSingular) => {
          const activeFilter = tagFilterRef.current;
          const colorMap = tagColorMapRef.current;

          if (activeFilter && !(ele.data("tags") || []).includes(activeFilter)) {
            return "#64748b";
          }

          const dataColor = ele.data("color");
          if (dataColor) return dataColor;

          const tags = ele.data("tags") || [];
          const first = tags[0];
          return first ? colorMap?.get(first) || "#93c5fd" : "#93c5fd";
        },
        label: "", // IMPORTANT: HTML labels are handled by cytoscape-node-html-label plugin
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
        events: "yes", // Ensure nodes can receive events
      },
    },
    {
      selector: "node.hovered",
      style: {
        width: 34,
        height: 34,
        "border-width": 3,
      },
    },
    {
      selector: "node.dimmed",
      style: {
        opacity: 0.8,
      },
    },
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
      selector: "node.edge-creation-target",
      style: {
        "border-color": "#10b981",
        "border-width": 3,
        "border-opacity": 0.7,
      },
    },
    {
      selector: "node.node-deletion-target",
      style: {
        "border-color": "#ef4444",
        "border-width": 3,
        "border-opacity": 0.8,
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
        width: (ele: cytoscape.EdgeSingular) =>
          Math.max(1.5, ((ele.data("weight") || 1) as number) * 1.2),
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
    {
      selector: ".faded",
      style: {
        opacity: 0.12,
      },
    },
  ];
}
