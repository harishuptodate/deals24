import { useState } from 'react';
import Navbar from '../components/Navbar';
import { BigFooter } from '@/components/BigFooter';
import WishlistHeader from '../components/wishlist/WishlistHeader';
import WishlistEmptyState from '../components/wishlist/WishlistEmptyState';
import RemoveDealConfirmDialog from '../components/wishlist/RemoveDealConfirmDialog';
import { useWishlist } from '../hooks/useWishlist';
import WishlistDealCard from '../components/wishlist/WishlistDealCard';
import AlertCenter from '../components/wishlist/AlertCenter';
import DealAlertDialog, { type AlertableDeal } from '../components/wishlist/DealAlertDialog';
import { useDealAlerts } from '../hooks/useDealAlerts';
import DealDetailDialog from '../components/deal/DealDetailDialog';
import DealCardSkeletonEnhanced from '../components/skeletons/DealCardSkeletonEnhanced';

const Wishlist = () => {
  const { alerts, isLoading: alertsLoading, create, setActive, setTargetPrice, setKeywords, remove } = useDealAlerts();
  const [alertDeal, setAlertDeal] = useState<AlertableDeal | null>(null);
  const {
    favorites,
    isLoading: wishlistLoading,
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

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 tracking-normal dark:bg-[#09090B] dark:text-zinc-100">
      <Navbar />
      <main className="container mx-auto px-4 pb-12 pt-6 md:px-8 md:pb-16 md:pt-10">
        <WishlistHeader
          favoriteCount={favorites.length}
          activeAlertCount={alerts.filter((alert) => alert.active).length}
          onClearAll={clearAllFavorites}
        />

        <AlertCenter alerts={alerts} isLoading={alertsLoading} onCreate={create} onSetActive={setActive} onSetTargetPrice={setTargetPrice} onSetKeywords={setKeywords} onRemove={remove} />

        <section aria-labelledby="saved-deals-heading">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h2 id="saved-deals-heading" className="text-xl font-medium tracking-normal text-zinc-950 dark:text-zinc-100">
                Saved deals
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">Your shortlist, ready to compare or revisit</p>
            </div>
            <span className="shrink-0 text-sm tabular-nums text-zinc-500 dark:text-zinc-400">{favorites.length} {favorites.length === 1 ? 'item' : 'items'}</span>
          </div>

          {wishlistLoading ? (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, index) => (
                <DealCardSkeletonEnhanced key={`wishlist-skeleton-${index}`} />
              ))}
            </div>
          ) : favorites.length === 0 ? <WishlistEmptyState /> : (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

      {selectedItem && (
        <DealDetailDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          title={selectedItem.title}
          description={selectedItem.description || selectedItem.title}
          link={selectedItem.link}
          id={selectedItem.id}
          category={selectedItem.category}
          imageUrl={selectedItem.imageUrl}
          telegramFileId={selectedItem.telegramFileId}
        />
      )}

      <RemoveDealConfirmDialog isOpen={isRemoveConfirmOpen} onOpenChange={cancelRemoveFavorite} onConfirm={confirmRemoveFavorite} dealTitle={itemToRemove || ''} />
      <DealAlertDialog deal={alertDeal} open={Boolean(alertDeal)} onOpenChange={(open) => !open && setAlertDeal(null)} onCreate={create} />
    </div>
  );
};

export default Wishlist;
