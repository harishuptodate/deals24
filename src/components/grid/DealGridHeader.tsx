
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const DealGridHeader = () => {
  const isMobile = useIsMobile();

  return (
    <div className="flex sm:flex-row sm:items-center justify-between mb-4 gap-4">
      <h2 className="text-2xl font-semibold text-gradient dark:text-gradient">
        Latest Deals
      </h2>
      {isMobile && (
        <div className="flex items-center justify-end">
          <Link to="/wishlist">
            <Button
              variant="ghost"
              size="sm"
              className="text-sm rounded-full dark:text-gray-200">
              <span>Wishlist</span>
              <Heart className="h-5 w-5 mr-1" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default DealGridHeader;
