
import React, { useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getTelegramMessages } from '../services/api';
import DealCard from './DealCard';
import { Button } from '@/components/ui/button';
import { Loader2, Filter } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

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
    { name: 'Fashion', slug: 'fashion' }
  ];

  return (
    <div className="flex items-center mb-6 overflow-x-auto pb-2 gap-2">
      <Filter size={16} className="text-apple-gray mr-1" />
      {categories.map((category) => (
        <button
          key={category.name}
          onClick={() => onSelect(category.slug)}
          className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
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
  const [activeCategory, setActiveCategory] = React.useState<string | null>(null);

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
    queryKey: ['telegram-messages', activeCategory],
    queryFn: ({ pageParam }) => getTelegramMessages(pageParam as string | undefined, activeCategory),
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

  // Reset page when category changes
  useEffect(() => {
    refetch();
  }, [activeCategory, refetch]);

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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gradient">Latest Deals</h2>
          <div className="flex gap-2">
            <Button variant="ghost" className="text-apple-darkGray hover:text-black" onClick={navigateToCategory}>
              Browse Categories
            </Button>
            <Button variant="ghost" className="text-apple-darkGray hover:text-black" asChild>
              <a href="/deals">View All</a>
            </Button>
          </div>
        </div>
        
        <CategoryFilter onSelect={handleCategoryChange} current={activeCategory} />
        
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
