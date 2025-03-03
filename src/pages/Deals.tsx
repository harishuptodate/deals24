
import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getTelegramMessages } from '../services/api';
import DealCard from '../components/DealCard';
import { Button } from '@/components/ui/button';
import { Loader2, Filter, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useSearchParams } from 'react-router-dom';

const Deals = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const [activeCategory, setActiveCategory] = useState<string | null>(categoryParam);

  useEffect(() => {
    setActiveCategory(categoryParam);
  }, [categoryParam]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
    error,
  } = useInfiniteQuery({
    queryKey: ['all-telegram-messages', activeCategory],
    queryFn: ({ pageParam }) => getTelegramMessages(pageParam as string | undefined, activeCategory || undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    retry: 2,
    meta: {
      onError: (err: any) => {
        console.error('Error in deals page query:', err);
        toast({
          title: "Error",
          description: import.meta.env.DEV 
            ? "Using mock data - API endpoint not available" 
            : "Failed to load deals. Please try again later.",
          variant: import.meta.env.DEV ? "default" : "destructive",
        });
      },
    },
  });

  const allMessages = data?.pages.flatMap((page) => page.data) ?? [];
  
  const clearFilter = () => {
    setActiveCategory(null);
    // Force refetch with updated query params
    setTimeout(() => refetch(), 0);
  };

  let categoryTitle = "Latest Deals";
  if (activeCategory) {
    categoryTitle = `${activeCategory.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} Deals`;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gradient mb-4 sm:mb-0">{categoryTitle}</h1>
          {activeCategory && (
            <Button 
              variant="outline" 
              className="flex items-center gap-2 rounded-full"
              onClick={clearFilter}
            >
              <X size={16} />
              Clear Filter
            </Button>
          )}
        </div>

        {import.meta.env.DEV && (
          <div className="mb-8 p-3 bg-amber-100 border border-amber-300 rounded-md text-amber-800">
            <p>Development mode: Using mock data. Connect to the real API by starting the backend server.</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-apple-gray" />
          </div>
        ) : isError && !import.meta.env.DEV ? (
          <div className="text-center py-8 mb-8">
            <p className="text-apple-gray mb-4">Unable to load deals. Please try again later.</p>
            <Button onClick={() => refetch()} variant="outline">
              Retry
            </Button>
          </div>
        ) : allMessages.length === 0 ? (
          <div className="text-center py-8 mb-8">
            <p className="text-apple-gray mb-4">No deals found for this category.</p>
            {activeCategory && (
              <Button onClick={clearFilter} variant="outline">
                View All Deals
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allMessages.map((message) => {
              // Skip rendering if message is undefined or doesn't have required fields
              if (!message || !message.text) {
                console.warn('Skipping invalid message:', message);
                return null;
              }
              
              return (
                <DealCard
                  key={message.id}
                  title={message.text.split('\n')[0] || 'New Deal'} 
                  description={message.text}
                  offerPrice="Check Price"
                  regularPrice="Limited Time"
                  link={message.link || '#'}
                />
              );
            })}
          </div>
        )}

        {hasNextPage && (
          <div className="mt-12 text-center">
            <Button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              variant="outline"
              size="lg"
              className="rounded-full"
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading More Deals...
                </>
              ) : (
                'Load More Deals'
              )}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Deals;
