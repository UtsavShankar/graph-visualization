// src/lib/html-labels.ts

import cytoscape from "cytoscape";
import type { Core } from "cytoscape";

// @ts-ignore - cytoscape-node-html-label doesn't have proper TypeScript definitions
import nodeHtmlLabel from "cytoscape-node-html-label";
import { getAuthorLastName } from "./utils";

let registered = false;

export function registerHtmlLabels() {
  if (registered) return;
  nodeHtmlLabel(cytoscape);
  registered = true;
}

const escapeHtml = (s: string = "") =>
  s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c] as string));

type ApplyOpts = {
  variant?: "main" | "zoom";
};

export function applyHtmlLabels(cy: Core, opts: ApplyOpts = {}) {
  const variant = opts.variant ?? "main";

  // Don't HTML-label the preview node
  const previewId = "__edge-preview-node";

  (cy as any).nodeHtmlLabel([
    {
      query: `node[id != "${previewId}"]`,
      halign: "center",
      valign: "center",
      halignBox: "center",
      valignBox: "center",
      tpl: (data: any) => {
        const nodeId = data.id ?? "";
        const safeId = escapeHtml(String(nodeId));
        const variantAttr = escapeHtml(variant);
        // For nodes with main_text/subtext, use HTML labels
        if (data.main_text || data.subtext) {
          const lastName = getAuthorLastName(data.author);
          const mainText = data.main_text ? escapeHtml(data.main_text) : "";
          const main = lastName && mainText 
            ? `${escapeHtml(lastName)}, ${mainText}`
            : mainText || escapeHtml(data.title ?? "");
          const sub = data.subtext ? escapeHtml(data.subtext) : "";

          return `
            <div class="cy-html-label ${variant === "zoom" ? "cy-html-label--zoom" : ""}" data-node-id="${safeId}" data-label-variant="${variantAttr}">
              <div class="cy-html-label__inner">
              <div class="cy-html-label__main">${main}</div>
              ${sub ? `<div class="cy-html-label__sub">${sub}</div>` : ""}
              </div>
            </div>
          `;
        }
        
        // For nodes without main_text/subtext, show regular formatted label
        const lastName = getAuthorLastName(data.author);
        const title = escapeHtml(data.title ?? "");
        const label = lastName ? `${escapeHtml(lastName)}, ${title}` : title;
        
        if (label) {
          return `
            <div class="cy-html-label ${variant === "zoom" ? "cy-html-label--zoom" : ""}" data-node-id="${safeId}" data-label-variant="${variantAttr}">
              <div class="cy-html-label__inner">
              <div class="cy-html-label__main">${label}</div>
              </div>
            </div>
          `;
        }
        
        return "";
      },
    },
  ]);
}

