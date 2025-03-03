
import React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getTelegramMessages } from '../services/api';
import DealCard from './DealCard';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const DealGrid = () => {
  const { toast } = useToast();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ['telegram-messages'],
    queryFn: ({ pageParam }) => getTelegramMessages(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    retry: 2,
    meta: {
      onError: (err: any) => {
        console.error('Error in query:', err);
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-apple-gray" />
      </div>
    );
  }

  if (isError && !import.meta.env.DEV) {
    console.error('Query error:', error);
    return (
      <div className="text-center py-16">
        <p className="text-apple-gray">Unable to load deals. Please try again later.</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
          Refresh
        </Button>
      </div>
    );
  }

  const allMessages = data?.pages.flatMap((page) => page.data) ?? [];

  if (allMessages.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-apple-gray">No deals available at the moment.</p>
      </div>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-b from-apple-lightGray to-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold text-gradient">Latest Deals</h2>
          <Button variant="ghost" className="text-apple-darkGray hover:text-black" asChild>
            <a href="/deals">View All</a>
          </Button>
        </div>
        
        {import.meta.env.DEV && (
          <div className="mb-4 p-2 bg-amber-100 border border-amber-300 rounded-md text-amber-800">
            <p className="text-sm">Development mode: Using mock data. Connect to the real API by starting the backend server.</p>
          </div>
        )}
        
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
                title={message.text.split('\n')[0] || 'New Deal'} // First line as title
                description={message.text}
                offerPrice="Check Price"
                regularPrice="Limited Time"
                link={message.link || '#'}
              />
            );
          })}
        </div>

        {hasNextPage && (
          <div className="mt-8 text-center">
            <Button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              variant="outline"
              className="rounded-full"
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More Deals'
              )}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default DealGrid;
