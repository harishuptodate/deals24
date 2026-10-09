import { useState } from 'react';
import { Heart } from 'lucide-react';
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
  const { alerts, isLoading: alertsLoading, create, setActive, remove } = useDealAlerts();
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

          {wishlistLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              {[...Array(8)].map((_, index) => (
                <DealCardSkeletonEnhanced key={`wishlist-skeleton-${index}`} />
              ))}
            </div>
          ) : favorites.length === 0 ? <WishlistEmptyState /> : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
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
