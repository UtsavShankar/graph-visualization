import { useEffect, useRef } from "react";
import type cytoscape from "cytoscape";
import {
  FISHEYE_BASE_LABEL_FONT_REM,
  FISHEYE_MAX_LABEL_FONT_REM,
  FISHEYE_RADIUS_PX,
} from "../lib/constants";

interface UseFisheyeMagnifierProps {
  cyRef: React.RefObject<cytoscape.Core | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  enabledRef?: React.RefObject<boolean>;
}

type MouseState = {
  mx: number;
  my: number;
  inside: boolean;
};

const BASE_NODE_WIDTH = 26;
const BASE_NODE_HEIGHT = 26;
const SCALE_SCRATCH_KEY = "_fisheyeScale";

/**
 * Adds a fisheye magnifier interaction to a Cytoscape graph.
 * Enlarges nodes (and their HTML labels) near the mouse pointer with a smooth falloff.
 */
export function useFisheyeMagnifier({
  cyRef,
  containerRef,
  enabledRef,
}: UseFisheyeMagnifierProps) {
  const rafRef = useRef<number | null>(null);
  const mouseRef = useRef<MouseState>({ mx: 0, my: 0, inside: false });
  const lastActiveIdsRef = useRef<Set<string>>(new Set());
  const baseFontRef = useRef<{ main: number; sub: number }>({
    main: 16,
    sub: 14,
  });
  const rootFontPxRef = useRef(16);
  const nodeBaseSizeRef = useRef<
    Map<string, { width: number; height: number }>
  >(new Map());

  useEffect(() => {
    const cy = cyRef.current;
    const container = containerRef.current;
    if (!cy || !container) return;

    let disposed = false;

    const doc = container.ownerDocument ?? document;
    const view = doc.defaultView ?? window;
    const rootFontPx = parseFloat(
      view.getComputedStyle(doc.documentElement).fontSize || "16"
    );
    rootFontPxRef.current = rootFontPx;

    const baseFontRem = FISHEYE_BASE_LABEL_FONT_REM;
    const targetFontRem = FISHEYE_MAX_LABEL_FONT_REM;
    const baseFontPx = baseFontRem * rootFontPx;
    const targetFontPx = targetFontRem * rootFontPx;
    baseFontRef.current.main = baseFontPx;

    const getEnabled = () => (enabledRef ? enabledRef.current !== false : true);

    const cssEscape: (value: string) => string =
      (globalThis as any).CSS?.escape ??
      ((value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "\\$&"));

    const queryLabelElements = (nodeId: string) => {
      const selector = `.cy-html-label[data-node-id="${cssEscape(
        nodeId
      )}"][data-label-variant="main"]`;
      const searchRoot = container;
      const label = searchRoot.querySelector<HTMLElement>(selector);
      const mainEl =
        label?.querySelector<HTMLElement>(".cy-html-label__main") ?? null;
      const innerEl =
        label?.querySelector<HTMLElement>(".cy-html-label__inner") ?? null;
      return { mainEl, innerEl };
    };

    const resetLabel = (nodeId: string) => {
      const { mainEl, innerEl } = queryLabelElements(nodeId);
      if (mainEl) {
        mainEl.style.removeProperty("--fe-font-rem");
      }
      if (innerEl) {
        innerEl.style.transform = "";
      }
    };

    const resetNodes = (ids: Iterable<string>) => {
      for (const id of ids) {
        const node = cy.getElementById(id);
        if (node.nonempty()) {
          node.removeStyle("width");
          node.removeStyle("height");
          node.removeScratch(SCALE_SCRATCH_KEY);
        }
        resetLabel(id);
        nodeBaseSizeRef.current.delete(id);
      }
    };

    const resetAll = () => {
      resetNodes(lastActiveIdsRef.current);
      lastActiveIdsRef.current.clear();
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.mx = event.clientX - rect.left;
      mouseRef.current.my = event.clientY - rect.top;
      mouseRef.current.inside = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.inside = false;
      resetAll();
    };

    const animationStep = () => {
      rafRef.current = window.requestAnimationFrame(animationStep);
      if (!getEnabled()) {
        if (lastActiveIdsRef.current.size) {
          resetAll();
        }
        return;
      }

      const { inside, mx, my } = mouseRef.current;
      if (!inside) {
        if (lastActiveIdsRef.current.size) {
          resetAll();
        }
        return;
      }

      const baseMainFont = baseFontRef.current.main;
      if (!baseMainFont || baseMainFont <= 0) {
        return;
      }

      const currentActiveIds = new Set<string>();
      const nodes = cy.nodes(":visible");

      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        if (!node || node.empty()) continue;
        const nodeId = node.id();
        if (nodeId.startsWith("__")) continue;

        const previousScale = node.scratch(SCALE_SCRATCH_KEY) as
          | number
          | undefined;

        if (!previousScale) {
          const currentWidth = node.numericStyle("width");
          const currentHeight = node.numericStyle("height");
          const stored = nodeBaseSizeRef.current.get(nodeId);
          if (
            !stored ||
            Math.abs(stored.width - currentWidth) > 0.1 ||
            Math.abs(stored.height - currentHeight) > 0.1
          ) {
            nodeBaseSizeRef.current.set(nodeId, {
              width: currentWidth,
              height: currentHeight,
            });
          }
        }

        const baseSize =
          nodeBaseSizeRef.current.get(nodeId) ?? {
            width: BASE_NODE_WIDTH,
            height: BASE_NODE_HEIGHT,
          };

        const pos = node.renderedPosition();
        const dx = pos.x - mx;
        const dy = pos.y - my;
        const distance = Math.hypot(dx, dy);
        if (distance >= FISHEYE_RADIUS_PX) {
          continue;
        }

        const t = Math.max(0, 1 - distance / FISHEYE_RADIUS_PX);
        const w = t * t * (3 - 2 * t);
        const fontPx =
          baseMainFont + w * (targetFontPx - baseMainFont);
        const scale = fontPx / baseMainFont;
        const fontRem = baseFontRem + w * (targetFontRem - baseFontRem);

        const scaleChanged = !previousScale || Math.abs(previousScale - scale) > 0.01;
        if (scaleChanged) {
          node.style("width", baseSize.width * scale);
          node.style("height", baseSize.height * scale);
          node.scratch(SCALE_SCRATCH_KEY, scale);
        }

        const { mainEl, innerEl } = queryLabelElements(nodeId);
        if (mainEl) {
          mainEl.style.setProperty("--fe-font-rem", `${fontRem}rem`);
        }
        if (innerEl) {
          innerEl.style.transform = `scale(${scale})`;
        }

        currentActiveIds.add(nodeId);
      }

      // Reset nodes that are no longer in the active set
      lastActiveIdsRef.current.forEach((id) => {
        if (!currentActiveIds.has(id)) {
          resetNodes([id]);
        }
      });

      lastActiveIdsRef.current = currentActiveIds;
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    rafRef.current = window.requestAnimationFrame(animationStep);

    return () => {
      disposed = true;
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);

      resetAll();
    };
  }, [cyRef, containerRef, enabledRef]);
}


