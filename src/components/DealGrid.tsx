
import React, { useEffect, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getTelegramMessages } from '../services/api';
import DealCard from './DealCard';
import { Button } from '@/components/ui/button';
import { Loader2, Filter } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface CategoryFilterProps {
  onSelect: (category: string | null) => void;
  current: string | null;
}

const CategoryFilter = ({ onSelect, current }: CategoryFilterProps) => {
  const categories = [
    { name: 'All', slug: null },
    { name: 'Electronics & Home', slug: 'electronics-home' },
    { name: 'Laptops', slug: 'laptops' },
    { name: 'Mobile Phones', slug: 'mobile-phones' },
    { name: 'Gadgets & Accessories', slug: 'gadgets-accessories' },
    { name: 'Fashion', slug: 'fashion' }
  ];

  return (
    <div className="flex items-center mb-6 overflow-x-auto pb-2 gap-2 max-w-full">
      <Filter size={16} className="text-apple-gray mr-1 flex-shrink-0" />
      {categories.map((category) => (
        <button
          key={category.name}
          onClick={() => onSelect(category.slug)}
          className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex-shrink-0 ${
            (current === category.slug) || (current === null && category.slug === null)
              ? 'bg-apple-darkGray text-white'
              : 'bg-gray-100 text-apple-gray hover:bg-gray-200'
          }`}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
};

const DealGrid = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch
  } = useInfiniteQuery({
    queryKey: ['telegram-messages', activeCategory, searchQuery],
    queryFn: ({ pageParam }) => getTelegramMessages(pageParam as string | undefined, activeCategory, searchQuery),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    retry: 2,
    meta: {
      onError: (err: any) => {
        console.error('Error in query:', err);
        toast({
          title: "Error",
          description: "Failed to load deals. Please try again later.",
          variant: "destructive",
        });
      },
    },
  });

  // Reset page when category or search changes
  useEffect(() => {
    refetch();
  }, [activeCategory, searchQuery, refetch]);

  const handleCategoryChange = (category: string | null) => {
    setActiveCategory(category);
  };

  const navigateToCategory = () => {
    navigate('/categories');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-apple-gray" />
      </div>
    );
  }

  if (isError) {
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
    <section className="py-8 md:py-16 bg-gradient-to-b from-apple-lightGray to-white">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
          <h2 className="text-2xl font-semibold text-gradient">Latest Deals</h2>
          <div className="flex gap-2 flex-wrap">
            <Button variant="ghost" className="text-apple-darkGray hover:text-black text-sm px-3 py-1 h-auto" onClick={navigateToCategory}>
              Browse Categories
            </Button>
            <Button variant="ghost" className="text-apple-darkGray hover:text-black text-sm px-3 py-1 h-auto" asChild>
              <a href="/deals">View All</a>
            </Button>
          </div>
        </div>
        
        <CategoryFilter onSelect={handleCategoryChange} current={activeCategory} />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                id={message.id}
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
