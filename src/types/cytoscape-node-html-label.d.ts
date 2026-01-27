/// <reference types="cytoscape" />

declare module "cytoscape-node-html-label" {
  import cytoscape from "cytoscape";
  const ext: (cytoscape: typeof cytoscape) => void;
  export default ext;
}

// Augment the cytoscape namespace to add nodeHtmlLabel method to Core
// This uses namespace merging to extend the existing cytoscape namespace
declare namespace cytoscape {
  interface Core {
    nodeHtmlLabel?: (configs: Array<any>) => any;
  }
}

