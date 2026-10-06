
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { shareContent, copyToClipboard } from '../components/deal/utils/linkUtils';
import { useSyncedWishlist } from '@/contexts/WishlistContext';
import type { FavoriteItem } from '@/services/api/wishlistApi';

export const useWishlist = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { favorites, removeFavorite: removeSyncedFavorite, clearFavorites } = useSyncedWishlist();
  const [selectedItem, setSelectedItem] = useState<FavoriteItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<string | null>(null);

  const removeFavorite = (title: string) => {
    setItemToRemove(title);
    setIsRemoveConfirmOpen(true);
  };

  const confirmRemoveFavorite = async () => {
    if (!itemToRemove) return;
    const item = favorites.find((favorite) => favorite.title === itemToRemove);
    try {
      if (item) await removeSyncedFavorite(item);
    } catch {
      toast({ title: 'Could not remove item', description: 'Please try again.', variant: 'destructive' });
      return;
    }
    
    if (selectedItem && selectedItem.title === itemToRemove) {
      setIsDialogOpen(false);
      setSelectedItem(null);
    }
    
    setIsRemoveConfirmOpen(false);
    setItemToRemove(null);
    
    toast({
      title: "Removed from wishlist",
      description: "The item has been removed from your saved deals",
    });
  };

  const cancelRemoveFavorite = () => {
    setIsRemoveConfirmOpen(false);
    setItemToRemove(null);
  };

  const clearAllFavorites = async () => {
    try {
      await clearFavorites();
    } catch {
      toast({ title: 'Could not clear wishlist', description: 'Please try again.', variant: 'destructive' });
      return;
    }
    setIsDialogOpen(false);
    setSelectedItem(null);
    
    toast({
      title: "Wishlist cleared",
      description: "All items have been removed from your wishlist",
    });
  };

  const viewDetails = (item: FavoriteItem) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  const viewFullPage = (item: FavoriteItem) => {
    if (item.id) {
      setIsDialogOpen(false);
      navigate(`/deal/${item.id}`);
    }
  };

  const handleShare = async (item: FavoriteItem) => {
    try {
      const shareUrl = item.id ? `${window.location.origin}/deal/${item.id}` : window.location.href;
      const shareText = `Check out this deal: ${item.title.substring(0, 60)}${item.title.length > 60 ? '...' : ''}`;
      
      const shareData = {
        title: item.title || 'Check out this deal!',
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
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return {
    favorites,
    selectedItem,
    isDialogOpen,
    setIsDialogOpen,
    removeFavorite,
    confirmRemoveFavorite,
    cancelRemoveFavorite,
    isRemoveConfirmOpen,
    itemToRemove,
    clearAllFavorites,
    viewDetails,
    viewFullPage,
    handleShare,
    formatDate,
  };
};
