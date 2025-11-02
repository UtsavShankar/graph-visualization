/**
 * Application constants
 */

/** ID for the preview node used during edge creation */
export const PREVIEW_NODE_ID = "__edge-preview-node";

/** ID for the preview edge used during edge creation */
export const PREVIEW_EDGE_ID = "__edge-preview-edge";

// Cytoscape Configuration Constants
/** Default zoom level for Cytoscape graph */
export const CYTOSCAPE_ZOOM_DEFAULT = 1.2;

/** Padding around the graph when fitting to viewport */
export const CYTOSCAPE_FIT_PADDING = 40;

/** Mouse wheel sensitivity for zooming */
export const CYTOSCAPE_WHEEL_SENSITIVITY = 0.32;

/** Delay before initializing Cytoscape instance (allows DOM to settle) */
export const CYTOSCAPE_INIT_DELAY_MS = 100;

// Tag Filter Constants
/**
 * Tag excluded from tag filter dropdown
 * AN1101 is excluded because it's used as the default/base tag and filtering by it
 * would show most nodes, making the filter less useful
 */
export const EXCLUDED_TAG_FILTER = "AN1101";
