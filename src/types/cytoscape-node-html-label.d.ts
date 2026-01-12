declare module "cytoscape-node-html-label" {
  import cytoscape from "cytoscape";
  const ext: (cytoscape: typeof cytoscape) => void;
  export default ext;
}

declare module "cytoscape" {
  interface Core {
    nodeHtmlLabel: (configs: Array<any>) => any;
  }
  
  namespace cytoscape {
    interface Position {
      x: number;
      y: number;
    }
  }
}

