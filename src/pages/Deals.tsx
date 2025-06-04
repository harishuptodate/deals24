
import React from 'react';
import Navbar from '../components/Navbar';
import DealCard from '../components/DealCard';
import DealCardSkeleton from '../components/DealCardSkeleton';
import ErrorBoundary from '../components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { BigFooter } from '@/components/BigFooter';
import DealsHeader from '../components/deals/DealsHeader';
import { useDealsPage } from '../hooks/useDealsPage';

const Deals = () => {
  const {
    searchQuery,
    activeCategory,
    totalDealsCount,
    allMessages,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
    clearFilter,
    viewAllDeals,
    handleDeleteProduct,
    handleEditProduct,
    getPageTitle,
  } = useDealsPage();

  const { observerTarget } = useInfiniteScroll({
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isInitialLoading: isLoading,
  });

  const pageTitle = getPageTitle();

  return (
    <div className="min-h-screen bg-white dark:bg-[#09090B]">
      <Navbar />
      <main className="container mx-auto px-4 py-6 md:py-12">
        <DealsHeader
          pageTitle={pageTitle}
          searchQuery={searchQuery}
          activeCategory={activeCategory}
          totalDealsCount={totalDealsCount}
          onClearFilter={clearFilter}
        />

        <ErrorBoundary>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(12)].map((_, index) => (
                <DealCardSkeleton key={`skeleton-${index}`} />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-8 mb-8">
              <p className="text-apple-gray dark:text-gray-400 mb-4">
                Unable to load deals. Please try again later.
              </p>
              <Button
                onClick={() => refetch()}
                variant="outline"
                className="dark:border-gray-700 dark:text-gray-200">
                Retry
              </Button>
            </div>
          ) : allMessages.length === 0 ? (
            <div className="text-center py-8 mb-8">
              <p className="text-apple-gray dark:text-gray-400 mb-4">
                {searchQuery
                  ? `No deals found for "${searchQuery}".`
                  : activeCategory
                  ? 'No deals found for this category.'
                  : 'No deals available at the moment.'}
              </p>
              {(activeCategory || searchQuery) && (
                <Button
                  onClick={viewAllDeals}
                  variant="outline"
                  className="dark:border-gray-700 dark:text-gray-200">
                  View All Deals
                </Button>
              )}
              <div className="pt-96 sm:pt-24 ">
                <BigFooter />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {allMessages.map((message) => {
                if (!message || !message.text) {
                  return null;
                }

                const messageId = message.id || message._id;

                return (
                  <div key={messageId || `message-${Math.random()}`}>
                    <DealCard
                      title={message.text.split('\n')[0] || 'New Deal'}
                      description={message.text}
                      link={message.link || ''}
                      id={messageId}
                      category={message.category || ''}
                      createdAt={message.date || message.createdAt}
                      onDelete={handleDeleteProduct}
                      onEdit={handleEditProduct}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </ErrorBoundary>

        {hasNextPage && (
          <div
            ref={observerTarget}
            className="w-full h-20 flex justify-center items-center mt-4">
            {isFetchingNextPage && (
              <Loader2 className="w-6 h-6 animate-spin text-apple-gray dark:text-gray-400" />
            )}
          </div>
        )}
      </main>
      {allMessages.length !== 0 && (
        <div className="sm:pt-1">
          <BigFooter />
        </div>
      )}
    </div>
  );
};

export default Deals;
