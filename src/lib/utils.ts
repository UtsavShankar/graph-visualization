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
