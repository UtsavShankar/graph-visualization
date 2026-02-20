import { useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import {
  FISHEYE_BASE_LABEL_FONT_REM,
  FISHEYE_MAX_LABEL_FONT_REM,
  FISHEYE_RADIUS_PX,
  SEARCH_HIT_FONT_REM,
  SEARCH_HIT_NODE_SCALE,
} from "../lib/constants";

interface UseFisheyeMagnifierProps {
  cyRef: React.RefObject<cytoscape.Core | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  enabledRef?: React.RefObject<boolean>;
  searchHitIdsRef: React.RefObject<Set<string>>;
  searchQueryRef?: React.RefObject<string>;
}

type MouseState = {
  mx: number;
  my: number;
  inside: boolean;
};

const BASE_NODE_SIZE = 26;
const SCALE_SCRATCH_KEY = "_fisheyeScale";

const cssEscape: (value: string) => string =
  (globalThis as any).CSS?.escape ??
  ((value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "\\$&"));

function applyNodeScale(node: cytoscape.NodeSingular, scale: number) {
  const base = (node.data("baseSize") as number | undefined) ?? BASE_NODE_SIZE;
  const size = base * scale;
  node.style("width", size);
  node.style("height", size);
}

function applyLabelScale(
  root: HTMLElement,
  nodeId: string,
  scale: number,
  isHit: boolean
) {
  const sel = `.cy-html-label[data-node-id="${cssEscape(nodeId)}"][data-label-variant="main"]`;
  const label = root.querySelector(sel) as HTMLElement | null;
  if (!label) return;

  label.style.setProperty("--bg-scale", String(scale));

  const base = FISHEYE_BASE_LABEL_FONT_REM;
  const scaled = base * scale;
  const finalFont = isHit ? Math.max(scaled, SEARCH_HIT_FONT_REM) : scaled;
  label.style.setProperty("--bg-font-rem", `${finalFont}rem`);
}

/**
 * Adds a fisheye magnifier interaction to a Cytoscape graph.
 * Enlarges nodes (and their HTML labels) near the mouse pointer with a smooth falloff.
 * Composes with search-hit scale: finalScale = max(fisheyeScale, searchScale).
 */
export function useFisheyeMagnifier({
  cyRef,
  containerRef,
  enabledRef,
  searchHitIdsRef,
}: UseFisheyeMagnifierProps) {
  const rafRef = useRef<number | null>(null);
  const mouseRef = useRef<MouseState>({ mx: 0, my: 0, inside: false });
  const lastActiveIdsRef = useRef<Set<string>>(new Set());
  const baseFontRef = useRef<number>(16);
  const targetFontPxRef = useRef<number>(16);

  useEffect(() => {
    const cy = cyRef.current;
    const container = (cy?.container?.() ?? containerRef.current) as HTMLElement | null;
    if (!cy || !container) return;

    const doc = container.ownerDocument ?? document;
    const rootFontPx = parseFloat(
      doc.defaultView?.getComputedStyle(doc.documentElement).fontSize || "16"
    );
    baseFontRef.current = FISHEYE_BASE_LABEL_FONT_REM * rootFontPx;
    targetFontPxRef.current = FISHEYE_MAX_LABEL_FONT_REM * rootFontPx;

    const getEnabled = () => (enabledRef ? enabledRef.current !== false : true);

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.mx = event.clientX - rect.left;
      mouseRef.current.my = event.clientY - rect.top;
      mouseRef.current.inside = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.inside = false;
    };

    const animationStep = () => {
      rafRef.current = window.requestAnimationFrame(animationStep);

      const hits = searchHitIdsRef.current;
      const baseMainFont = baseFontRef.current;
      const targetFontPx = targetFontPxRef.current;
      const { inside, mx, my } = mouseRef.current;
      const fisheyeActive = getEnabled() && inside;

      const currentActiveIds = new Set<string>();
      const nodes = cy.nodes(":visible");

      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        if (!node || node.empty()) continue;
        const nodeId = node.id();
        if (nodeId.startsWith("__")) continue;

        const isSearchHit = hits.has(nodeId);
        const searchScale = isSearchHit ? SEARCH_HIT_NODE_SCALE : 1;

        let fisheyeScale = 1;
        if (fisheyeActive && baseMainFont > 0) {
          const pos = node.renderedPosition();
          const distance = Math.hypot(pos.x - mx, pos.y - my);
          if (distance < FISHEYE_RADIUS_PX) {
            const t = Math.max(0, 1 - distance / FISHEYE_RADIUS_PX);
            const w = t * t * (3 - 2 * t);
            const fontPx = baseMainFont + w * (targetFontPx - baseMainFont);
            fisheyeScale = fontPx / baseMainFont;
            currentActiveIds.add(nodeId);
            node.scratch(SCALE_SCRATCH_KEY, fisheyeScale);
          } else {
            node.removeScratch(SCALE_SCRATCH_KEY);
          }
        } else {
          node.removeScratch(SCALE_SCRATCH_KEY);
        }

        const finalScale = Math.max(fisheyeScale, searchScale);
        applyNodeScale(node, finalScale);
        applyLabelScale(container, nodeId, finalScale, isSearchHit);
      }

      lastActiveIdsRef.current = currentActiveIds;
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    rafRef.current = window.requestAnimationFrame(animationStep);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);

      // Reset all nodes to base scale and clear dimmed styles
      const hits = searchHitIdsRef.current;
      cy.nodes(":visible").forEach((node) => {
        const id = node.id();
        if (id.startsWith("__")) return;
        const searchScale = hits.has(id) ? SEARCH_HIT_NODE_SCALE : 1;
        applyNodeScale(node, searchScale);
        applyLabelScale(container, id, searchScale, hits.has(id));
        node.removeScratch(SCALE_SCRATCH_KEY);
      });
    };
  }, [cyRef, containerRef, enabledRef, searchHitIdsRef]);
}
