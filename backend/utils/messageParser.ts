export {};
/**
 * Extract links from a message text
 * @param {string} text - The message text
 * @returns {string|null} - The first link found or null
 */
export function extractLinks(text: string): string | null {
  if (!text) return null;
  
  // Regular expression to find URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  
  return matches && matches.length > 0 ? matches[0] : null;
}
