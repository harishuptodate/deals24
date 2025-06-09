import React from 'react';
import { format } from 'date-fns';

interface DealCardContentProps {
  title: string;
  description: string;
  createdAt?: string;
  imageUrl?: string;
  telegramFileId?: string;
}

const DealCardContent = ({ title, description, createdAt, imageUrl, telegramFileId }: DealCardContentProps) => {
  const formattedDate = createdAt
    ? format(new Date(createdAt), 'MMM d, h:mm a')
    : '';

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

  // Determine the image source
  const getImageSrc = () => {
    if (imageUrl) {
      return imageUrl; // Amazon product image
    } else if (telegramFileId) {
      const apiBaseUrl = getApiBaseUrl();
      return `${apiBaseUrl}/amazon/download-image/${telegramFileId}`; // Telegram image proxy
    }
    return null;
  };

  const imageSrc = getImageSrc();

  return (
    <div className="space-y-3 flex-1 flex flex-col">
      <div className="space-y-2">
        {formattedDate && (
          <div className="flex items-center">
            <span className="time-badge">
              {formattedDate}
            </span>
          </div>
        )}
        <h3 className="text-lg font-semibold text-high-contrast line-clamp-2 leading-tight">
          {title}
        </h3>
      </div>

      <div className="flex-1">
        {imageSrc ? (
          <div className="mb-3">
            <img 
              src={imageSrc} 
              alt={title}
              className="w-full h-32 object-cover rounded-lg"
              onError={(e) => {
                console.error('Failed to load image:', imageSrc);
                // Hide the image if it fails to load
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        ) : (
          <p className="text-sm text-medium-contrast line-clamp-5 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

export default DealCardContent;
