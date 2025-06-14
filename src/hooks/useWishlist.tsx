
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { shareContent, copyToClipboard } from '../components/deal/utils/linkUtils';

interface FavoriteItem {
  title: string;
  description: string;
  link: string;
  imageUrl?: string;
  telegramFileId?: string;
  id?: string;
  timestamp: string;
}

export const useWishlist = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<FavoriteItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const storedFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    setFavorites(storedFavorites);
  }, []);

  const removeFavorite = (title: string) => {
    const updatedFavorites = favorites.filter(item => item.title !== title);
    localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
    setFavorites(updatedFavorites);
    
    if (selectedItem && selectedItem.title === title) {
      setIsDialogOpen(false);
      setSelectedItem(null);
    }
    
    toast({
      title: "Removed from wishlist",
      description: "The item has been removed from your saved deals",
    });
  };

  const clearAllFavorites = () => {
    localStorage.setItem('favorites', JSON.stringify([]));
    setFavorites([]);
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
    clearAllFavorites,
    viewDetails,
    viewFullPage,
    handleShare,
    formatDate,
  };
};
