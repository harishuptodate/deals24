
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { shareContent, copyToClipboard } from '../utils/linkUtils';

interface DealCardActionsProps {
  id?: string;
  title: string;
  description: string;
  link: string;
  imageUrl?: string;
  telegramFileId?: string;
}

export const useDealCardActions = ({ 
  id, 
  title, 
  description, 
  link,
  imageUrl,
  telegramFileId 
}: DealCardActionsProps) => {
  const { toast } = useToast();
  const [isSaved, setIsSaved] = useState(() => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    return favorites.some((item: any) => 
      item.id === id || 
      (item.title === title)
    );
  });
  const [isSharing, setIsSharing] = useState(false);

  const handleToggleWishlist = () => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

    if (isSaved) {
      const updatedFavorites = favorites.filter((item: any) => 
        item.id !== id && 
        item.title !== title
      );
      localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
      setIsSaved(false);
      toast({
        title: "Removed from wishlist",
        description: "This deal has been removed from your wishlist.",
      });
    } else {
      const newFavorite = {
        id,
        title,
        description,
        link,
        timestamp: new Date().toISOString(),
        imageUrl,
        telegramFileId
      };
      
      favorites.push(newFavorite);
      localStorage.setItem('favorites', JSON.stringify(favorites));
      setIsSaved(true);
      toast({
        title: "Added to wishlist",
        description: "This deal has been added to your wishlist.",
      });
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
