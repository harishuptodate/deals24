
import React from 'react';
import { Calendar, ExternalLink, Share2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CachedTelegramImage from '../images/CachedTelegramImage';

interface FavoriteItem {
  title: string;
  description: string;
  link: string;
  imageUrl?: string;
  telegramFileId?: string;
  id?: string;
  timestamp: string;
}

interface WishlistCardProps {
  item: FavoriteItem;
  onRemove: (title: string) => void;
  onViewDetails: (item: FavoriteItem) => void;
  onViewFullPage: (item: FavoriteItem) => void;
  onShare: (item: FavoriteItem) => void;
  formatDate: (dateString: string) => string;
}

const WishlistCard = ({
  item,
  onRemove,
  onViewDetails,
  onViewFullPage,
  onShare,
  formatDate,
}: WishlistCardProps) => {
  const renderImage = () => {
    if (item.imageUrl) {
      return (
        <img 
          src={item.imageUrl} 
          alt={item.title} 
          className="w-full h-full object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      );
    } else if (item.telegramFileId) {
      return (
        <CachedTelegramImage
          telegramFileId={item.telegramFileId}
          alt={item.title}
          className="w-full h-full"
        />
      );
    }
    return null;
  };

  const hasImage = item.imageUrl || item.telegramFileId;

  return (
    <div className="bg-white dark:bg-[#171717] border border-gray-100 dark:border-gray-800 rounded-xl p-6 shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-none transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-apple-darkGray dark:text-white line-clamp-2">{item.title}</h3>
        <div className="flex gap-1">
          <button
            onClick={() => onShare(item)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            title="Share deal"
          >
            <Share2 size={16} className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300" />
          </button>
          <button
            onClick={() => onRemove(item.title)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <Trash2 size={16} className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400" />
          </button>
        </div>
      </div>
      
      {hasImage && (
        <div className="w-full h-40 overflow-hidden rounded-lg mb-4">
          {renderImage()}
        </div>
      )}
      
      <p className="text-sm text-apple-gray dark:text-gray-400 mb-4 line-clamp-3">
        {item.description}
      </p>
      
      <div className="flex justify-between items-center mt-4">
        <div className="flex items-center text-xs text-apple-gray dark:text-gray-400">
          <Calendar size={14} className="mr-1" />
          <span>Saved on {formatDate(item.timestamp)}</span>
        </div>
        
        <div className="flex gap-2">
          {item.id && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onViewFullPage(item)}
              className="dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 flex items-center gap-1"
            >
              <ExternalLink size={14} />
              View Full Page
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onViewDetails(item)}
            className="dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            View Details
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WishlistCard;
