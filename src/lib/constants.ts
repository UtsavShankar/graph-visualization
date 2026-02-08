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


export const EXCLUDED_TAG_FILTER = "AN1101";

// Search hit (query match) constants
/** Node size multiplier when node matches search query */
export const SEARCH_HIT_NODE_SCALE = 1.6;
/** Font size (rem) for search-hit label text */
export const SEARCH_HIT_FONT_REM = 2.0;

// Fisheye magnifier tuning constants
export const FISHEYE_RADIUS_PX = 130;
/** Baseline label font size (rem) when cursor is away */
export const FISHEYE_BASE_LABEL_FONT_REM = 1.05;
/** Maximum label font size (rem) when cursor is directly over the node */
export const FISHEYE_MAX_LABEL_FONT_REM = 1.80;