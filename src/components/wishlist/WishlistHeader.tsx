
import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WishlistHeaderProps {
  favoriteCount: number;
  onClearAll: () => void;
}

const WishlistHeader = ({ favoriteCount, onClearAll }: WishlistHeaderProps) => {
  return (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold text-gradient">My Wishlist</h1>
        <p className="text-apple-gray dark:text-gray-400 mt-1">Your saved deals</p>
      </div>
      
      {favoriteCount > 0 && (
        <Button 
          variant="outline" 
          onClick={onClearAll}
          className="flex items-center gap-2 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 active:scale-95 transition-transform duration-150 ease-in-out"
        >
          <Trash2 size={16} />
          Clear All
        </Button>
      )}
    </div>
  );
};

export default WishlistHeader;
