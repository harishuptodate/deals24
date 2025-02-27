
import React from 'react';
import Navbar from '../components/Navbar';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getTelegramMessages } from '../services/api';
import DealCard from '../components/DealCard';
import { Button } from '@/components/ui/button';
import { Loader2, Filter } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const Deals = () => {
  const { toast } = useToast();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['all-telegram-messages'],
    queryFn: ({ pageParam }) => getTelegramMessages(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    retry: 2,
    meta: {
      onError: () => {
        toast({
          title: "Note",
          description: "Using locally stored deals while connecting to the server.",
          variant: "default",
        });
      },
    },
  });

  const allMessages = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gradient mb-4 sm:mb-0">Latest Deals</h1>
          <Button variant="outline" className="flex items-center gap-2 rounded-full">
            <Filter size={16} />
            Filter Deals
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-apple-gray" />
          </div>
        ) : isError ? (
          <div className="text-center py-8 mb-8">
            <p className="text-apple-gray mb-4">Showing available deals. Some features may be limited.</p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allMessages.map((message) => (
            <DealCard
              key={message.id}
              title={message.text.split('\n')[0] || 'New Deal'} 
              description={message.text}
              offerPrice="Check Price"
              regularPrice="Limited Time"
              link={message.link || '#'}
            />
          ))}
        </div>

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
