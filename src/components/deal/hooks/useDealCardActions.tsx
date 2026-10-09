
import { useRef, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { shareContent, copyToClipboard } from '../utils/linkUtils';
import { useSyncedWishlist } from '@/contexts/WishlistContext';

interface DealCardActionsProps {
  id?: string;
  title: string;
  description: string;
  link: string;
  imageUrl?: string;
  telegramFileId?: string;
  fullText?: string;
  createdAt?: string;
  category?: string;
}

export const useDealCardActions = ({ 
  id, 
  title, 
  description, 
  link,
  imageUrl,
  telegramFileId,
  fullText,
  createdAt,
  category
}: DealCardActionsProps) => {
  const { toast } = useToast();
  const { isSaved: hasSavedDeal, toggleFavorite } = useSyncedWishlist();
  const isSaved = hasSavedDeal(id, title);
  const [isSharing, setIsSharing] = useState(false);
  const isUpdatingWishlist = useRef(false);

  const handleToggleWishlist = async () => {
    if (isUpdatingWishlist.current) return;
    isUpdatingWishlist.current = true;
    const dealDescription = fullText || description || title;
    try {
      const saved = await toggleFavorite({
        id,
        title,
        description: dealDescription,
        link,
        timestamp: new Date().toISOString(),
        createdAt: createdAt || new Date().toISOString(),
        category,
        imageUrl,
        telegramFileId,
      });
      toast({
        title: saved ? 'Added to wishlist' : 'Removed from wishlist',
        description: saved
          ? 'This deal has been added to your wishlist.'
          : 'This deal has been removed from your wishlist.',
      });
    } catch {
      toast({
        title: 'Could not update wishlist',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      isUpdatingWishlist.current = false;
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    
    try {
      const shareUrl = id ? `${window.location.origin}/deal/${id}` : window.location.href;
      const shareText = `Check out this deal: ${title.substring(0, 60)}${title.length > 60 ? '...' : ''}`;
      
      const shareData = {
        title: title || 'Check out this deal!',
        text: shareText,
        url: shareUrl
      };
      
      const shared = await shareContent(shareData);
      
      if (!shared) {
        const textToCopy = `${shareText}\n${shareUrl}`;
        const copied = await copyToClipboard(textToCopy);
        
        if (copied) {
          toast({
            title: "Copied to clipboard!",
            description: "Deal link copied. You can now paste and share it with others.",
          });
        }
      }
    } catch (error) {
      console.error('Error during share:', error);
      toast({
        title: "Sharing failed",
        description: "Something went wrong while trying to share this deal.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  return {
    isSaved,
    isSharing,
    handleToggleWishlist,
    handleShare,
  };
};
