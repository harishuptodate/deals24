
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { getDealById } from '../services/api';
import { shareContent, copyToClipboard, extractFirstLink } from '../components/deal/utils/linkUtils';
import { useSyncedWishlist } from '@/contexts/WishlistContext';

export const useDealPage = (id?: string) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  const { isSaved: hasSavedDeal, toggleFavorite } = useSyncedWishlist();
  
  const { data: deal, isLoading, isError } = useQuery({
    queryKey: ['deal', id],
    queryFn: () => getDealById(id || ''),
    enabled: !!id,
  });

  const title = deal?.text?.split('\n')[0] || '';
  const isSaved = hasSavedDeal(id, title);

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleShare = async () => {
    if (!deal) return;
    
    setIsSharing(true);
    
    try {
      const title = deal.text?.split('\n')[0] || 'Check out this deal!';
      const shareUrl = `${window.location.origin}/deal/${id}`;
      const shareText = `Check out this deal: ${title.substring(0, 60)}${title.length > 60 ? '...' : ''}`;
      
      const shareData = {
        title: title,
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

  const handleToggleWishlist = async () => {
    if (!deal) return;
    try {
      const saved = await toggleFavorite({
        id,
        title,
        description: deal.text || '',
        link: deal.link || extractFirstLink(deal.text || '') || window.location.href,
        timestamp: new Date().toISOString(),
        createdAt: deal.date || deal.createdAt || new Date().toISOString(),
        category: deal.category,
        imageUrl: deal.imageUrl,
        telegramFileId: deal.telegramFileId,
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
    }
  };

  return {
    deal,
    isLoading,
    isError,
    isSaved,
    isSharing,
    handleGoBack,
    handleShare,
    handleToggleWishlist,
  };
};
