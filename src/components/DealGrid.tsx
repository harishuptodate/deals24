
import React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getTelegramMessages } from '../services/api';
import DealCard from './DealCard';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { TelegramMessage } from '../types/telegram';

const DealGrid = () => {
  const { toast } = useToast();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['telegram-messages'],
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-apple-gray" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-16">
        <p className="text-apple-gray">Showing available deals. Some features may be limited.</p>
      </div>
    );
  }

  const allMessages = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <section className="py-16 bg-gradient-to-b from-apple-lightGray to-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold text-gradient">Latest Deals</h2>
          <Button variant="ghost" className="text-apple-darkGray hover:text-black" asChild>
            <a href="/deals">View All</a>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allMessages.map((message) => (
            <DealCard
              key={message.id}
              title={message.text.split('\n')[0] || 'New Deal'} // First line as title
              description={message.text}
              offerPrice="Check Price"
              regularPrice="Limited Time"
              link={message.link || '#'}
            />
          ))}
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
