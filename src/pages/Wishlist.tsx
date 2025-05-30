
import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { Heart, Trash2, Calendar, ExternalLink, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from '@/components/ui/use-toast';
import { trackMessageClick } from '../services/api';
import { BigFooter } from '@/components/BigFooter';
import { shareContent, copyToClipboard } from '@/components/deal/utils/linkUtils';
import { useNavigate } from 'react-router-dom';

interface FavoriteItem {
  title: string;
  description: string;
  link: string;
  imageUrl?: string;
  id?: string;
  timestamp: string;
}

const Wishlist = () => {
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
    
    toast({
      title: "Removed from wishlist",
      description: "The item has been removed from your saved deals",
    });
  };

  const clearAllFavorites = () => {
    localStorage.setItem('favorites', JSON.stringify([]));
    setFavorites([]);
    
    toast({
      title: "Wishlist cleared",
      description: "All items have been removed from your wishlist",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const viewDetails = (item: FavoriteItem) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  const viewFullPage = (item: FavoriteItem) => {
    if (item.id) {
      navigate(`/deal/${item.id}`);
    }
  };

  const handleShare = async (item: FavoriteItem) => {
    try {
      // Create share URL to this deal's dedicated page
      const shareUrl = item.id ? `${window.location.origin}/deal/${item.id}` : window.location.href;
      const shareText = `Check out this deal: ${item.title.substring(0, 60)}${item.title.length > 60 ? '...' : ''}`;
      
      const shareData = {
        title: item.title || 'Check out this deal!',
        text: shareText,
        url: shareUrl
      };
      
      const shared = await shareContent(shareData);
      
      if (!shared) {
        // Fallback to copying the URL to clipboard
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

  const truncateLink = (url: string) => {
    try {
      const { hostname } = new URL(url);
      return hostname;
    } catch {
      return url;
    }
  };

  const recordClick = (title: string, clickedLink: string, itemId?: string) => {
    // Get existing click data or initialize new array
    const clickData = JSON.parse(localStorage.getItem('clickData') || '[]');
    
    // Add new click record
    clickData.push({
      title,
      link: clickedLink,
      timestamp: new Date().toISOString()
    });
    
    // Save back to localStorage
    localStorage.setItem('clickData', JSON.stringify(clickData));
    
    // Track click to backend if ID is available
    if (itemId) {
      trackMessageClick(itemId).catch(err => 
        console.error('Failed to track click for message', itemId, err)
      );
    }
  };

  // Function to make links in text clickable
  const makeLinksClickable = (text: string, itemId?: string) => {
    if (!text) return '';
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => recordClick(selectedItem?.title || '', part, itemId)}
            className="text-blue-600 dark:text-blue-400 hover:underline break-all inline-flex items-center gap-1"
          >
            {truncateLink(part)}
            <ExternalLink size={12} />
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#09090B] text-apple-darkGray dark:text-gray-200">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gradient">My Wishlist</h1>
            <p className="text-apple-gray dark:text-gray-400 mt-1">Your saved deals</p>
          </div>
          
          {favorites.length > 0 && (
            <Button 
              variant="outline" 
              onClick={clearAllFavorites}
              className="flex items-center gap-2 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <Trash2 size={16} />
              Clear All
            </Button>
          )}
        </div>

        {favorites.length === 0 ? (
          <>
          <div className="text-center py-16 bg-gray-50 dark:bg-[#111111] rounded-xl">
            <Heart className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-700 mb-4" />
            <h3 className="text-xl font-semibold text-apple-darkGray dark:text-gray-200 mb-2">Your wishlist is empty</h3>
            <p className="text-apple-gray dark:text-gray-400 mb-6">Start saving your favorite deals by clicking the heart icon</p>
            <Button asChild className="dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800">
              <a href="/deals">Browse Deals</a>
            </Button>
          </div>
          <div className="pt-32 sm:pt-0">
              <BigFooter/>
          </div>
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((item) => (
              <div key={item.title} className="bg-white dark:bg-[#171717] border border-gray-100 dark:border-gray-800 rounded-xl p-6 shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-none transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-apple-darkGray dark:text-white line-clamp-2">{item.title}</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleShare(item)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                      title="Share deal"
                    >
                      <Share2 size={16} className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300" />
                    </button>
                    <button
                      onClick={() => removeFavorite(item.title)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                      <Trash2 size={16} className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400" />
                    </button>
                  </div>
                </div>
                
                {item.imageUrl && (
                  <div className="w-full h-40 overflow-hidden rounded-lg mb-4">
                    <img 
                      src={item.imageUrl} 
                      alt={item.title} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
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
                        onClick={() => viewFullPage(item)}
                        className="dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 flex items-center gap-1"
                      >
                        <ExternalLink size={14} />
                        View Full Page
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => viewDetails(item)}
                      className="dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      {favorites.length != 0 && (<div className="sm:pt- ">
            <BigFooter/>
            </div>)}
      {/* Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto max-w-[90vw] w-[90vw] sm:w-auto rounded-xl dark:bg-apple-darkGray dark:border-gray-800">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl dark:text-white">{selectedItem.title}</DialogTitle>
                <DialogDescription className="dark:text-gray-400">
                  Saved on {formatDate(selectedItem.timestamp)}
                </DialogDescription>
              </DialogHeader>
              
              {selectedItem.imageUrl && (
                <div className="w-full h-48 overflow-hidden rounded-lg mt-2">
                  <img 
                    src={selectedItem.imageUrl} 
                    alt={selectedItem.title} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              <div className="mt-4 text-sm whitespace-pre-line dark:text-gray-300">
                {makeLinksClickable(selectedItem.description, selectedItem.id)}
              </div>

              <div className="mt-4 flex justify-end">
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  onClick={() => removeFavorite(selectedItem.title)}
                >
                  <Trash2 size={16} />
                  Remove from Wishlist
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Wishlist;
