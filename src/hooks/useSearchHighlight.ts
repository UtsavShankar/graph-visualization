import { useEffect } from "react";
import cytoscape from "cytoscape";

const PREVIEW_PREFIX = "__";

function nodeMatchesSearch(node: cytoscape.NodeSingular, trimmed: string): boolean {
  const title = (node.data("title") || node.id() || "").toLowerCase();
  const author = (node.data("author") || "").toLowerCase();
  const tags = (node.data("tags") || []) as string[];
  const tagText = tags.join(" ").toLowerCase();
  const text = `${title} ${author} ${tagText}`;
  return text.includes(trimmed);
}

/**
 * Applies search dimming to the Cytoscape graph:
 * - Matching nodes keep normal styling; non-matching get class `search-dimmed`.
 * - `_searchDimmed` data drives HTML-label dimming (DOM class).
 * - Edges use the `search-dimmed` class (styled via the stylesheet).
 * - `searchHitIdsRef` is updated so useFisheyeMagnifier can boost hit nodes.
 */
export function useSearchHighlight({
  cyRef,
  query,
  searchHitIdsRef,
  elements,
}: {
  cyRef: React.RefObject<cytoscape.Core | null>;
  query: string;
  searchHitIdsRef: React.RefObject<Set<string>>;
  elements: { nodes: any[]; edges: any[] };
}) {
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const trimmed = query.trim().toLowerCase();
    const hasSearch = trimmed.length > 0;
    const hits = new Set<string>();

    if (hasSearch) {
      cy.nodes().forEach((node) => {
        if (node.id().startsWith(PREVIEW_PREFIX)) return;
        if (nodeMatchesSearch(node, trimmed)) hits.add(node.id());
      });
    }
    searchHitIdsRef.current = hits;

    cy.batch(() => {
      cy.nodes().removeClass("search-hit search-dimmed");
      cy.edges().removeClass("search-dimmed");

      if (hasSearch) {
        cy.nodes().forEach((node) => {
          if (node.id().startsWith(PREVIEW_PREFIX)) return;
          const isHit = hits.has(node.id());
          if (isHit) node.addClass("search-hit");
          else node.addClass("search-dimmed");
          node.data("_searchDimmed", !isHit);
        });

        cy.edges().forEach((edge) => {
          if (edge.id().startsWith(PREVIEW_PREFIX)) return;
          const sDim = !hits.has(edge.source().id());
          const tDim = !hits.has(edge.target().id());
          if (sDim || tDim) edge.addClass("search-dimmed");
        });
      } else {
        cy.nodes().forEach((node) => {
          if (node.id().startsWith(PREVIEW_PREFIX)) return;
          node.data("_searchDimmed", false);
        });
      }
    });

  }, [cyRef, query, elements]);
}

