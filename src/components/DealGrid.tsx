
import React from 'react';
import DealCard from './DealCard';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import EnhancedErrorBoundary from './enhanced/EnhancedErrorBoundary';
import DealCardSkeletonEnhanced from './skeletons/DealCardSkeletonEnhanced';
import CategoryFilter from './filters/CategoryFilter';
import DealsEmptyState from './empty-states/DealsEmptyState';
import DealGridHeader from './grid/DealGridHeader';
import { useDealGrid } from '../hooks/useDealGrid';
import { usePrefetch } from '../hooks/usePrefetch';

const DealGrid = () => {
  const {
    searchQuery,
    activeCategory,
    allMessages,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
    handleCategoryChange,
    handleSubCategorySelect,
    handleDeleteProduct,
    viewAllDeals,
  } = useDealGrid();

  const { prefetchDeal } = usePrefetch();

  const { observerTarget } = useInfiniteScroll({
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isInitialLoading: isLoading,
  });

  // Prefetch deals on hover
  const handleDealHover = (dealId?: string) => {
    if (dealId) {
      prefetchDeal(dealId);
    }
  };

  if (isLoading) {
    return (
      <section className="py-3 bg-gradient-to-t from-apple-lightGray to-white dark:from-[#121212] dark:to-[#09090B]">
        <div className="container mx-auto px-4">
          <DealGridHeader />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, index) => (
              <DealCardSkeletonEnhanced key={`skeleton-${index}`} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="py-3 bg-gradient-to-t from-apple-lightGray to-white dark:from-[#121212] dark:to-[#09090B]">
        <div className="container mx-auto px-4">
          <div className="text-center py-16">
            <p className="text-apple-gray dark:text-gray-400">
              Unable to load deals. Please try again later.
            </p>
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="mt-4 dark:border-gray-700 dark:text-gray-300">
              Refresh
            </Button>
          </div>
        </div>
      </section>
    );
  }

  if (allMessages.length === 0) {
    return (
      <section className="py-3 bg-gradient-to-t from-apple-lightGray to-white dark:from-[#121212] dark:to-[#09090B]">
        <div className="container mx-auto px-4">
          <DealGridHeader />
          <DealsEmptyState 
            searchQuery={searchQuery} 
            activeCategory={activeCategory}
            onViewAllClick={viewAllDeals}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="py-3 bg-gradient-to-t from-apple-lightGray to-white dark:from-[#121212] dark:to-[#09090B]">
      <div className="container mx-auto px-4">
        <DealGridHeader />

        <CategoryFilter
          onSelect={handleCategoryChange}
          current={activeCategory}
          onSubCategorySelect={handleSubCategorySelect}
        />

        <EnhancedErrorBoundary>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {allMessages.map((message) => {
              if (!message || !message.text) {
                return null;
              }

              const messageId = message.id || message._id;

              return (
                <div 
                  key={messageId || `message-${Math.random()}`}
                  onMouseEnter={() => handleDealHover(messageId)}
                >
                  <DealCard
                    title={message.text.split('\n')[0] || 'New Deal'}
                    description={message.text}
                    link={message.link || ''}
                    id={messageId}
                    category={message.category || ''}
                    createdAt={message.date || message.createdAt}
                    imageUrl={message.imageUrl}
                    telegramFileId={message.telegramFileId}
                    onDelete={handleDeleteProduct}
                  />
                </div>
              );
            })}
          </div>
        </EnhancedErrorBoundary>

        {hasNextPage && (
          <div
            ref={observerTarget}
            className="w-full h-20 flex justify-center items-center mt-4">
            {isFetchingNextPage && (
              <Loader2 className="w-6 h-6 animate-spin text-apple-gray dark:text-gray-400" />
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default DealGrid;
