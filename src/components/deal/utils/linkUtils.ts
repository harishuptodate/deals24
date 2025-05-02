
export const extractFirstLink = (text: string): string | null => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches && matches.length > 0 ? matches[0] : null;
};

export const extractLinks = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
};

export const truncateLink = (url: string): string => {
  try {
    const { hostname } = new URL(url);
    return hostname;
  } catch {
    return url;
  }
};
