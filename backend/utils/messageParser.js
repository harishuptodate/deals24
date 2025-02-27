
/**
 * Extract links from a message text
 * @param {string} text - The message text
 * @returns {string|null} - The first link found or null
 */
function extractLinks(text) {
  if (!text) return null;
  
  // Regular expression to find URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  
  return matches && matches.length > 0 ? matches[0] : null;
}

/**
 * Parse message text to extract details
 * @param {string} text - The message text
 * @returns {Object} - Parsed details
 */
function parseMessageText(text) {
  if (!text) return { title: '', description: '' };
  
  const lines = text.split('\n').filter(line => line.trim() !== '');
  const title = lines[0] || '';
  const description = lines.slice(1).join('\n');
  
  return {
    title,
    description
  };
}

module.exports = {
  extractLinks,
  parseMessageText
};
