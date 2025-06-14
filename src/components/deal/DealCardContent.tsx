
import React from 'react';
import { format } from 'date-fns';
import CachedTelegramImage from '../images/CachedTelegramImage';

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

  const renderImage = () => {
    if (imageUrl) {
      return (
        <img 
          src={imageUrl} 
          alt={title}
          className="w-full h-40 object-contain rounded-lg"
          loading="lazy"
          onError={(e) => {
            console.error('Failed to load Amazon image:', imageUrl);
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    } else if (telegramFileId) {
      return (
        <CachedTelegramImage
          telegramFileId={telegramFileId}
          alt={title}
          className="w-full h-40  rounded-lg"
        />
      );
    }
    return null;
  };

  const hasImage = imageUrl || telegramFileId;

  return (
    <div className="space-y-3 flex-1 flex flex-col min-h-0">
      <div className="space-y-2 flex-shrink-0">
        {formattedDate && (
          <div className="flex items-center">
            <span className="time-badge text-xs">
              {formattedDate}
            </span>
          </div>
        )}
        <h3 className="text-lg font-semibold text-high-contrast line-clamp-2 leading-tight pr-20">
          {title}
        </h3>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {hasImage ? (
          <div className="mb-3 flex-shrink-0">
            {renderImage()}
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <p className="text-sm text-medium-contrast line-clamp-6 leading-relaxed">
              {description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DealCardContent;
