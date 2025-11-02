/**
 * Utility functions for the BookGraph application
 */

/**
 * Converts a string to a URL-friendly slug
 * Used for generating node IDs from titles
 */
export function slugify(text: string): string {
  return (text || "")
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/\-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Normalizes edge note values
 * Ensures consistent handling of null/undefined/empty strings
 */
export function normalizeNote(value?: string | null): string {
  return value ? value.trim() : "";
}

/**
 * Gets the normalized note from an edge object
 * Handles both 'note' and 'relation' fields
 */
export function getNormalizedEdgeNote(edge: { note?: string | null; relation?: string | null }): string {
  return normalizeNote(edge.note ?? edge.relation);
}

/**
 * Gets the display name for a Cytoscape node
 * Returns title if available, otherwise falls back to node ID
 */
export function getNodeDisplayName(node: any): string {
  return node.data("title") || node.id();
}

/**
 * Checks if a Cytoscape node matches a search query
 * Searches in title, author, and tags
 */
export function nodeMatchesSearch(node: any, query: string): boolean {
  if (!query) return true;

  const lowerQuery = query.toLowerCase();
  const title = (node.data("title") || "").toLowerCase();
  const author = (node.data("author") || "").toLowerCase();
  const tags = node.data("tags") || [];

  return (
    title.includes(lowerQuery) ||
    author.includes(lowerQuery) ||
    tags.some((tag: string) => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Checks if a Cytoscape node matches a tag filter
 * Returns true if node has the specified tag or if no filter is set
 */
export function nodeMatchesTag(node: any, tagFilter: string): boolean {
  if (!tagFilter) return true;

  const tags = node.data("tags") || [];
  return tags.includes(tagFilter);
}
