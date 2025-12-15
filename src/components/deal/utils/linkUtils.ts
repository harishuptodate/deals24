export const  hasAmazonLinks = (text: string):boolean =>  {
  if (!text) return false;
  const amazonRegex = /(https?:\/\/)?(www\.)?(amazon\.[a-z]{2,}|amzn\.to)\/[^\s]*/gi;
  return amazonRegex.test(text);
};

export const extractFirstLink = (text: string): string | null => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches && matches.length > 0 ? matches[0] : null;
};

export const extractSecondLink = (text: string): string | null => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches && matches.length > 0 ? matches[1] : null;
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

export const createShareData = (title: string, text: string): ShareData => {
  // Extract first link as the URL to share if available
  const firstLink = extractFirstLink(text);
  
  // Create a trimmed version of text for the share description
  const description = text.split('\n').slice(1).join(' ').substring(0, 100) + '...';
  
  return {
    title: title || 'Check out this deal!',
    text: description,
    url: firstLink || window.location.href
  };
};

export const shareContent = async (shareData: ShareData): Promise<boolean> => {
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return true;
    } catch (error) {
      console.error('Error sharing:', error);
      return false;
    }
  }
  return false;
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    return false;
  }
};

// Function to create a share URL directly to a specific deal
export const createDealShareUrl = (id: string): string => {
  return `${window.location.origin}/deal/${id}`;
};
