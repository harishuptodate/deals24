import { useState } from 'react';
import { ExternalLink, Heart, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Navbar from '../components/Navbar';
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
  const [alertDeal, setAlertDeal] = useState<AlertableDeal | null>(null);
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
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  const makeLinksClickable = (text: string, itemId?: string) => {
    if (!text) return '';
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, index) => part.match(urlRegex) ? (
      <a
        key={`${part}-${index}`}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => itemId && trackMessageClick(itemId).catch((error) => console.error('Failed to track click', error))}
        className="inline-flex items-center gap-1 break-all text-violet-600 hover:underline dark:text-violet-400">
        {truncateLink(part)} <ExternalLink className="h-3 w-3" />
      </a>
    ) : <span key={`${index}-${part.slice(0, 12)}`}>{part}</span>);
  };

  const getPrimaryLink = () => selectedItem
    ? selectedItem.link || extractSecondLink(selectedItem.description) || extractFirstLink(selectedItem.description)
    : null;

  const handleDialogLinkClick = (url: string, event: React.MouseEvent<HTMLAnchorElement>) => {
    void handleTrackedLinkClick(url, selectedItem?.id, event.nativeEvent);
    if (!event.ctrlKey && !event.metaKey && event.button !== 1) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/70 text-apple-darkGray dark:bg-[#09090B] dark:text-gray-200">
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-5 sm:py-7 lg:px-8 lg:py-9">
        <WishlistHeader
          favoriteCount={favorites.length}
          activeAlertCount={alerts.filter((alert) => alert.active).length}
          onClearAll={clearAllFavorites}
        />

        <AlertCenter alerts={alerts} isLoading={alertsLoading} onCreate={create} onSetActive={setActive} onRemove={remove} />

        <section aria-labelledby="saved-deals-heading">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 id="saved-deals-heading" className="flex items-center gap-2 text-lg font-semibold text-gray-950 dark:text-white">
                <Heart className="h-4 w-4 fill-rose-500 text-rose-500" /> Saved deals
              </h2>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Open, share, buy, or add an alert without leaving this page.</p>
            </div>
            <span className="shrink-0 text-xs font-medium text-gray-500">{favorites.length} {favorites.length === 1 ? 'item' : 'items'}</span>
          </div>

          {favorites.length === 0 ? <WishlistEmptyState /> : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-4">
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
        </section>
      </main>

      <BigFooter />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-hidden rounded-3xl p-0 sm:max-w-2xl dark:border-gray-800 dark:bg-zinc-950">
          {selectedItem && (
            <div className="grid min-h-0 sm:grid-cols-[220px_minmax(0,1fr)]">
              <div className="flex min-h-52 items-center justify-center bg-gray-50 p-4 dark:bg-zinc-900/70">
                <DealImage title={selectedItem.title} category={selectedItem.category} imageUrl={selectedItem.imageUrl} telegramFileId={selectedItem.telegramFileId} className="h-48 w-full rounded-xl object-contain" fallbackClassName="border-0" />
              </div>
              <div className="flex min-h-0 flex-col p-5 sm:p-6">
                <DialogHeader>
                  <DialogTitle className="pr-6 text-left text-lg leading-6 dark:text-white">{selectedItem.title}</DialogTitle>
                  <DialogDescription className="text-left text-xs dark:text-gray-400">
                    Saved {formatDate(selectedItem.timestamp)}
                    {selectedItem.createdAt && <> · Deal added {formatDate(selectedItem.createdAt)}</>}
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4 max-h-52 overflow-y-auto whitespace-pre-line pr-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                  {makeLinksClickable(selectedItem.description || 'No description available', selectedItem.id)}
                </div>
                <DialogFooter className="mt-5 grid grid-cols-2 gap-2 sm:mt-auto sm:grid-cols-2 sm:space-x-0 sm:pt-5">
                  {selectedItem.id ? (
                    <Button type="button" variant="outline" onClick={() => viewFullPage(selectedItem)} className="h-10 rounded-full">
                      View deal <ExternalLink className="ml-1.5 h-4 w-4" />
                    </Button>
                  ) : <div />}
                  {getPrimaryLink() ? (
                    <Button asChild className="h-10 rounded-full">
                      <a href={getPrimaryLink() || '#'} target="_blank" rel="noopener noreferrer" onClick={(event) => handleDialogLinkClick(getPrimaryLink() || '#', event)}>
                        <ShoppingBag className="mr-1.5 h-4 w-4" /> Buy now
                      </a>
                    </Button>
                  ) : <div />}
                </DialogFooter>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <RemoveDealConfirmDialog isOpen={isRemoveConfirmOpen} onOpenChange={cancelRemoveFavorite} onConfirm={confirmRemoveFavorite} dealTitle={itemToRemove || ''} />
      <DealAlertDialog deal={alertDeal} open={Boolean(alertDeal)} onOpenChange={(open) => !open && setAlertDeal(null)} onCreate={create} />
    </div>
  );
};

export default Wishlist;
