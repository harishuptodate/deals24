import React from 'react';
import Navbar from '../components/Navbar';
import { ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { trackMessageClick, handleTrackedLinkClick } from '../services/api';
import { BigFooter } from '@/components/BigFooter';
import WishlistHeader from '../components/wishlist/WishlistHeader';
import WishlistEmptyState from '../components/wishlist/WishlistEmptyState';
import RemoveDealConfirmDialog from '../components/wishlist/RemoveDealConfirmDialog';
import DealImage from '../components/images/DealImage';
import { useWishlist } from '../hooks/useWishlist';
import WishlistDealCard from '../components/wishlist/WishlistDealCard';
import { extractFirstLink, extractSecondLink } from '../components/deal/utils/linkUtils';
import AlertCenter from '../components/wishlist/AlertCenter';
import DealAlertDialog, { type AlertableDeal } from '../components/wishlist/DealAlertDialog';
import { useDealAlerts } from '../hooks/useDealAlerts';

const Wishlist = () => {
  const { alerts, isLoading: alertsLoading, create, setActive, remove } = useDealAlerts();
  const [alertDeal, setAlertDeal] = React.useState<AlertableDeal | null>(null);
  const {
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
    
    if (itemId) {
      trackMessageClick(itemId).catch(err => 
        console.error('Failed to track click for message', itemId, err)
      );
    }
  };

  const handleDialogLinkClick = (url: string, e: React.MouseEvent) => {
    handleTrackedLinkClick(url, selectedItem?.id, e.nativeEvent);

    if (e.ctrlKey || e.metaKey || e.button === 1) return;

    e.preventDefault();
    e.stopPropagation();

    setTimeout(() => {
      window.open(url, '_blank');
    }, 100);
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

    return (
      <DealImage
        title={selectedItem.title}
        category={selectedItem.category}
        imageUrl={selectedItem.imageUrl}
        telegramFileId={selectedItem.telegramFileId}
        className="w-full h-48 object-contain rounded-lg"
      />
    );
  };

  const getPrimaryLink = () => {
    if (!selectedItem) return '#';
    return selectedItem.link || extractSecondLink(selectedItem.description) || extractFirstLink(selectedItem.description) || '#';
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#09090B] text-apple-darkGray dark:text-gray-200">
      <Navbar />
      <main className="container mx-auto px-4 py-6 md:py-12">
        <WishlistHeader 
          favoriteCount={favorites.length} 
          onClearAll={clearAllFavorites} 
        />

        <AlertCenter
          alerts={alerts}
          isLoading={alertsLoading}
          onCreate={create}
          onSetActive={setActive}
          onRemove={remove}
        />

        {favorites.length === 0 ? (
          <WishlistEmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-6">
            {favorites.map((item) => (
              <WishlistDealCard
                key={item.id || item.title}
                item={item}
                onRemove={removeFavorite}
                onViewDetails={viewDetails}
                onViewFullPage={viewFullPage}
                onShare={handleShare}
                onCreateAlert={setAlertDeal}
                hasActiveAlert={alerts.some((alert) => alert.active && alert.type === 'deal' && alert.dealId === item.id)}
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
                  {selectedItem.createdAt && (
                    <> • Created on {formatDate(selectedItem.createdAt)}</>
                  )}
                </DialogDescription>
              </DialogHeader>
              
              {selectedItem && (
                <div className="w-full h-48 overflow-hidden rounded-lg mt-2">
                  {renderDialogImage()}
                </div>
              )}
              
              <div className="mt-4 text-sm text-center whitespace-pre-line dark:text-gray-300">
                {makeLinksClickable(selectedItem.description || "No description available"  , selectedItem.id)}
              </div>

              <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2 sm:justify-center">
                <a
                  href={getPrimaryLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => handleDialogLinkClick(getPrimaryLink(), e)}
                  className="inline-block"
                >
                  <Button
                    className="inline-block w-full text-center px-6 py-3 text-sm font-medium text-white bg-gradient-to-b from-apple-darkGray to-indigo-950 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-apple-darkGray/20 flex items-center justify-center hover:scale-105"
                    variant="default"
                  >
                    Buy Now
                  </Button>
                </a> 
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <RemoveDealConfirmDialog
        isOpen={isRemoveConfirmOpen}
        onOpenChange={cancelRemoveFavorite}
        onConfirm={confirmRemoveFavorite}
        dealTitle={itemToRemove || ''}
      />
      <DealAlertDialog
        deal={alertDeal}
        open={Boolean(alertDeal)}
        onOpenChange={(open) => !open && setAlertDeal(null)}
        onCreate={create}
      />
    </div>
  );
};

export default Wishlist;
