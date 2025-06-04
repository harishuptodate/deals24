
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Heart, HeartCrack, Share2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface DealPageHeaderProps {
  onGoBack: () => void;
  isSaved: boolean;
  isSharing: boolean;
  onToggleWishlist: () => void;
  onShare: () => void;
}

const DealPageHeader = ({
  onGoBack,
  isSaved,
  isSharing,
  onToggleWishlist,
  onShare,
}: DealPageHeaderProps) => {
  const isMobile = useIsMobile();

  return (
    <>
      <Button 
        variant="outline" 
        onClick={onGoBack} 
        className="mb-6 flex items-center gap-2">
        <ArrowLeft size={16} />
        Back
      </Button>

      <div className="flex gap-2">
        <Button
          onClick={onToggleWishlist}
          className="flex gap-2 items-center"
          variant="outline"
        >
          {isSaved ? (
            <>
              {isMobile ? (
                <HeartCrack size={16} 
                  className="w-5 h-5 fill-red-500 text-red-500"/>
              ) : (
                <>
                  <HeartCrack size={16}
                    className="w-5 h-5 fill-red-500 text-red-500" />
                  Remove from Wishlist
                </>
              )} 
            </>
          ) : (
            <>
              {isMobile ? (
                <Heart size={16} />
              ) : (
                <>
                  <Heart size={16} />
                  Add to Wishlist 
                </>
              )}
            </>
          )}
        </Button>
        <Button
          onClick={onShare}
          disabled={isSharing}
          className="flex gap-2 items-center"
          variant="outline"
        >
          {isMobile ? (
            <Share2 size={16} className="w-5 h-5 text-blue-500" />
          ) : (
            <>
              <Share2 size={16} className="w-5 h-5 text-blue-500" />
              {isSharing ? "Sharing..." : "Share Deal"}
            </>
          )}
        </Button>
      </div>
    </>
  );
};

export default DealPageHeader;
