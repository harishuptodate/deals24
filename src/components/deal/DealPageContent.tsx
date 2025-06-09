import React from 'react';
import { ExternalLink } from 'lucide-react';
import { extractFirstLink, extractSecondLink, truncateLink } from './utils/linkUtils';
import { handleTrackedLinkClick } from '../../services/api';

interface DealPageContentProps {
  deal: {
    text: string;
    category?: string;
    date?: string;
    createdAt?: string;
    imageUrl?: string;
    telegramFileId?: string;
  };
  id?: string;
}

const DealPageContent = ({ deal, id }: DealPageContentProps) => {
  // Get API base URL from environment variables or use a fallback
  const getApiBaseUrl = () => {
    const configuredUrl = import.meta.env.VITE_API_BASE_URL;

    if (!configuredUrl) {
      // Fallback to current origin + /api
      return `${window.location.origin}/api`;
    }

    // If it's already a full URL (starts with http/https), use it as is
    if (configuredUrl.startsWith('http')) {
      return configuredUrl;
    }

    // Otherwise, append it to the current origin
    return `${window.location.origin}${configuredUrl}`;
  };

  const makeLinksClickable = (text: string) => {
    if (!text) return '';

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={`link-${index}-${part.substring(0, 10)}`}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              handleTrackedLinkClick(part, id, e.nativeEvent);

              if (e.ctrlKey || e.metaKey || e.button === 1) return;

              e.preventDefault();
              e.stopPropagation();

              setTimeout(() => {
                window.open(part, '_blank');
              }, 100);
            }}
            className="text-blue-600 hover:underline break-all inline-flex items-center gap-1">
            {truncateLink(part)}
            <ExternalLink size={12} />
          </a>
        );
      }
      return <span key={`text-${index}-${part.substring(0, 10)}`}>{part}</span>;
    });
  };

  // Determine the image source
  const getImageSrc = () => {
    if (deal.imageUrl) {
      return deal.imageUrl; // Amazon product image
    } else if (deal.telegramFileId) {
      const apiBaseUrl = getApiBaseUrl();
      return `${apiBaseUrl}/amazon/download-image/${deal.telegramFileId}`; // Telegram image proxy
    }
    return null;
  };

  const imageSrc = getImageSrc();

  return (
    <div className="glass-effect rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-200 dark:border-gray-900 dark:bg-zinc-950">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            {deal.text?.split('\n')[0] || 'Deal Title'}
          </h1>
          {deal.category && (
            <span className="inline-block px-3 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">
              {deal.category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </span>
          )}
        </div>
      </div>

      {/* Display image if available */}
      {imageSrc && (
        <div className="mb-6">
          <img 
            src={imageSrc} 
            alt={deal.text?.split('\n')[0] || 'Product Image'}
            className="w-full max-w-md mx-auto h-auto object-cover rounded-lg"
            onError={(e) => {
              console.error('Failed to load image:', imageSrc);
              // Hide the image if it fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}
      
      <div className="whitespace-pre-line text-gray-700 dark:text-gray-300 mt-6">
        {makeLinksClickable(deal.text || '')}
      </div>

      {extractFirstLink(deal.text || '') && (
        <div className="mt-8">
          <a
            href={extractSecondLink(deal.text || '') || extractFirstLink(deal.text || '') || '#'}
            onClick={(e) => handleTrackedLinkClick(extractSecondLink(deal.text || '') || (extractFirstLink(deal.text || '')) || '', id, e.nativeEvent)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block w-full sm:w-auto text-center px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-apple-darkGray to-black rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-apple-darkGray/20"
          >
            Buy Now
          </a>
        </div>
      )}
      
      <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
        Deal added: {new Date(deal.date || deal.createdAt || '').toLocaleDateString()}
      </div>
    </div>
  );
};

export default DealPageContent;
