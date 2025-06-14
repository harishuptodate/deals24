
import React from 'react';
import Navbar from '../components/Navbar';
import { ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { trackMessageClick } from '../services/api';
import { BigFooter } from '@/components/BigFooter';
import WishlistHeader from '../components/wishlist/WishlistHeader';
import WishlistEmptyState from '../components/wishlist/WishlistEmptyState';
import WishlistCard from '../components/wishlist/WishlistCard';
import CachedTelegramImage from '../components/images/CachedTelegramImage';
import { useWishlist } from '../hooks/useWishlist';

const Wishlist = () => {
  const {
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
  } = useWishlist();

  const truncateLink = (url: string) => {
    try {
      const { hostname } = new URL(url);
      return hostname;
    } catch {
      return url;
    }
  };

  const recordClick = (title: string, clickedLink: string, itemId?: string) => {
    const clickData = JSON.parse(localStorage.getItem('clickData') || '[]');
    
    clickData.push({
      title,
      link: clickedLink,
      timestamp: new Date().toISOString()
    });
    
    localStorage.setItem('clickData', JSON.stringify(clickData));
    
    if (itemId) {
      trackMessageClick(itemId).catch(err => 
        console.error('Failed to track click for message', itemId, err)
      );
    }
  };

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

  const renderDialogImage = () => {
    if (!selectedItem) return null;

    if (selectedItem.imageUrl) {
      return (
        <img 
          src={selectedItem.imageUrl} 
          alt={selectedItem.title} 
          className="w-full h-full object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      );
    } else if (selectedItem.telegramFileId) {
      return (
        <CachedTelegramImage
          telegramFileId={selectedItem.telegramFileId}
          alt={selectedItem.title}
          className="w-full h-full"
        />
      );
    }
    return null;
  };

  const hasDialogImage = selectedItem && (selectedItem.imageUrl || selectedItem.telegramFileId);

  return (
    <div className="min-h-screen bg-white dark:bg-[#09090B] text-apple-darkGray dark:text-gray-200">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <WishlistHeader 
          favoriteCount={favorites.length} 
          onClearAll={clearAllFavorites} 
        />

        {favorites.length === 0 ? (
          <WishlistEmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((item) => (
              <WishlistCard
                key={item.title}
                item={item}
                onRemove={removeFavorite}
                onViewDetails={viewDetails}
                onViewFullPage={viewFullPage}
                onShare={handleShare}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </main>
      
      {favorites.length !== 0 && (
        <div className="sm:pt-0">
          <BigFooter/>
        </div>
      )}

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
              
              {hasDialogImage && (
                <div className="w-full h-48 overflow-hidden rounded-lg mt-2">
                  {renderDialogImage()}
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
