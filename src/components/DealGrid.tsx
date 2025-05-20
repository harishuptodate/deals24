
import React, { useEffect, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getTelegramMessages, deleteProduct } from '../services/api';
import DealCard from './DealCard';
import { Button } from '@/components/ui/button';
import { Loader2, Heart } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import ErrorBoundary from './ErrorBoundary';
import DealCardSkeleton from './DealCardSkeleton';
import CategoryFilter from './filters/CategoryFilter';
import EmptyDealsState from './deal/EmptyDealsState';
import { useIsMobile } from '@/hooks/use-mobile';

const DealGrid = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['telegram-messages', activeCategory, searchQuery],
    queryFn: ({ pageParam }) =>
      getTelegramMessages(
        pageParam as string | undefined,
        activeCategory,
        searchQuery,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    retry: 2,
    meta: {
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to load deals. Please try again later.',
          variant: 'destructive',
        });
      },
    },
  });

  const { observerTarget } = useInfiniteScroll({
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isInitialLoading: isLoading,
  });

  useEffect(() => {
    refetch();
  }, [activeCategory, searchQuery, refetch]);

  const handleCategoryChange = (category: string | null) => {
    setActiveCategory(category);
  };

  const handleSubCategorySelect = (subCategory: string) => {
    navigate(`/deals?search=${encodeURIComponent(subCategory)}`);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!id) {
      toast({
        title: 'Error',
        description: 'Cannot delete: Deal ID is missing',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log(`Attempting to delete product with ID: ${id}`);
      const success = await deleteProduct(id);

      if (success) {
        toast({
          title: 'Success',
          description: 'Deal has been deleted successfully',
          variant: 'default',
        });
        refetch();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete deal',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while deleting the deal',
        variant: 'destructive',
      });
    }
  };

  const viewAllDeals = () => {
    navigate('/deals');
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, index) => (
          <DealCardSkeleton key={`skeleton-${index}`} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
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
    );
  }

  const allMessages = data?.pages.flatMap((page) => page.data) || [];

  if (allMessages.length === 0) {
    return (
      <EmptyDealsState 
        searchQuery={searchQuery} 
        activeCategory={activeCategory}
        onViewAllClick={viewAllDeals}
      />
    );
  }

  return (
    <section className="py-3 bg-gradient-to-t from-apple-lightGray to-white dark:from-[#121212] dark:to-[#09090B]">
      <div className="container mx-auto px-4">
        <div className="flex sm:flex-row sm:items-center justify-between mb-4 gap-4">
          <h2 className="text-2xl font-semibold text-gradient dark:text-gradient">
            Latest Deals
          </h2>
          {isMobile && (
            <div className="flex items-center justify-end">
              <Link to="/wishlist">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm rounded-full dark:text-gray-200 ">
                  <span>Wishlist</span>
                  <Heart className="h-5 w-5 mr-1" />
                </Button>
              </Link>
            </div>
          )}
        </div>

        <CategoryFilter
          onSelect={handleCategoryChange}
          current={activeCategory}
          onSubCategorySelect={handleSubCategorySelect}
        />

        <ErrorBoundary>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  />
                </div>
              );
            })}
          </div>
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
      </div>
    </section>
  );
};

export default DealGrid;
