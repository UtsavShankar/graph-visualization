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

/**
 * Extracts the last name from an author string
 * Handles various formats: "First Last", "Last, First", "First Middle Last", etc.
 */
export function getAuthorLastName(author?: string | null): string | null {
  if (!author || !author.trim()) return null;

  const trimmed = author.trim();

  // Handle "Last, First" format
  if (trimmed.includes(",")) {
    const parts = trimmed.split(",");
    return parts[0].trim();
  }

  // Handle "First Last" or "First Middle Last" format
  const parts = trimmed.split(/\s+/);
  if (parts.length === 0) return null;

  // Get the last part, but skip common suffixes
  const suffixes = ["jr", "sr", "ii", "iii", "iv", "phd", "md"];
  let lastName = parts[parts.length - 1];

  // If the last part is a suffix, take the one before it
  if (suffixes.includes(lastName.toLowerCase().replace(/\./g, ""))) {
    lastName = parts.length > 1 ? parts[parts.length - 2] : parts[parts.length - 1];
  }

  return lastName;
}

/**
 * Formats a node label as "Last name, Title" or just "Title" if no author
 */
export function formatNodeLabel(title?: string | null, author?: string | null): string {
  const titleText = title || "";
  const lastName = getAuthorLastName(author);

  if (lastName) {
    return `${lastName}, ${titleText}`;
  }

  return titleText;
}

/**
 * Formats an edge label with author name capitalized and returns parts for display
 * Returns { author: string, title: string } where author should be bold
 */
export function formatEdgeLabelParts(title?: string | null, author?: string | null): { author: string; title: string } {
  const titleText = title || "";
  const lastName = getAuthorLastName(author);

  if (lastName) {
    // Capitalize the author name (first letter uppercase, rest lowercase)
    // Handle multi-word last names (e.g., "van der Berg" -> "Van Der Berg")
    const capitalizedAuthor = lastName
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    return { author: capitalizedAuthor, title: titleText };
  }

  return { author: "", title: titleText };
}