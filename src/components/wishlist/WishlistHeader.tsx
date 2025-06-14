
import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WishlistHeaderProps {
  favoriteCount: number;
  onClearAll: () => void;
}

const WishlistHeader = ({ favoriteCount, onClearAll }: WishlistHeaderProps) => {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center justify-between mb-6 md:mb-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gradient dark:text-gradient">My Wishlist</h1>
        <p className="text-sm sm:text-md md:text-lg font-medium text-gray-600 dark:text-gray-300 mt-1">
          Your saved deals
        </p>
      </div>
      
      {favoriteCount > 0 && (
        <Button 
          variant="outline" 
          onClick={onClearAll}
          className="flex items-center gap-2 rounded-full dark:border-gray-700 dark:text-gray-200"
        >
          <Trash2 size={16} />
          Clear All
        </Button>
      )}
    </div>
  );
};

export default WishlistHeader;
