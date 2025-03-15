
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '../components/Navbar';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getTelegramMessages, deleteProduct } from '../services/api';
import DealCard from '../components/DealCard';
import { Button } from '@/components/ui/button';
import { Loader2, X, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useSearchParams, useNavigate } from 'react-router-dom';

const Deals = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const categoryParam = searchParams.get('category');
  const searchQuery = searchParams.get('search');
  const [activeCategory, setActiveCategory] = useState<string | null>(categoryParam);
  const observerTarget = useRef<HTMLDivElement>(null);

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
  } = useInfiniteQuery({
    queryKey: ['all-telegram-messages', activeCategory, searchQuery],
    queryFn: ({ pageParam }) => getTelegramMessages(
      pageParam as string | undefined, 
      activeCategory || undefined, 
      searchQuery || undefined
    ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    retry: 2,
    meta: {
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to load deals. Please try again later.",
          variant: "destructive",
        });
      },
    },
  });

  // Implement intersection observer for infinite scrolling
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0];
    if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      rootMargin: '0px 0px 200px 0px',
      threshold: 0.1
    });
    
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    
    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [handleObserver, observerTarget]);

  const allMessages = data?.pages.flatMap((page) => page.data) ?? [];
  
  const clearFilter = () => {
    navigate('/deals');
  };

  const viewAllDeals = () => {
    navigate('/deals');
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
    
    if (window.confirm('Are you sure you want to delete this deal?')) {
      try {
        console.log(`Attempting to delete deal with ID: ${id}`);
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
        console.error('Error deleting deal:', error);
        toast({
          title: 'Error',
          description: 'An error occurred while deleting the deal',
          variant: 'destructive',
        });
      }
    }
  };

  let pageTitle = "Latest Deals";
  if (searchQuery) {
    pageTitle = `Search Results: ${searchQuery}`;
  } else if (activeCategory) {
    pageTitle = `${activeCategory.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} Deals`;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="container mx-auto px-4 py-6 md:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gradient mb-4 sm:mb-0">{pageTitle}</h1>
          {(activeCategory || searchQuery) && (
            <Button 
              variant="outline" 
              className="flex items-center gap-2 rounded-full"
              onClick={clearFilter}
            >
              <X size={16} />
              Clear {searchQuery ? "Search" : "Filter"}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-apple-gray" />
          </div>
        ) : isError ? (
          <div className="text-center py-8 mb-8">
            <p className="text-apple-gray mb-4">Unable to load deals. Please try again later.</p>
            <Button onClick={() => refetch()} variant="outline">
              Retry
            </Button>
          </div>
        ) : allMessages.length === 0 ? (
          <div className="text-center py-8 mb-8">
            <p className="text-apple-gray mb-4">
              {searchQuery 
                ? `No deals found for "${searchQuery}".` 
                : activeCategory 
                  ? "No deals found for this category." 
                  : "No deals available at the moment."}
            </p>
            {(activeCategory || searchQuery) && (
              <Button onClick={viewAllDeals} variant="outline">
                View All Deals
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {allMessages.map((message) => {
              // Skip rendering if message is undefined or doesn't have required fields
              if (!message || !message.text) {
                return null;
              }
              
              const messageId = message._id || message.id;
              
              return (
                <div key={messageId || `message-${Math.random()}`} className="relative">
                  {messageId && (
                    <button 
                      onClick={() => handleDeleteProduct(messageId)}
                      className="absolute top-2 right-2 z-10 bg-white rounded-full p-1 shadow-md opacity-70 hover:opacity-100 transition-opacity"
                      title="Delete deal"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  )}
                  
                  <DealCard
                    title={message.text.split('\n')[0] || 'New Deal'} 
                    description={message.text}
                    link={message.link || ''}
                    id={messageId}
                    createdAt={message.date || message.createdAt}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Intersection observer target for infinite scrolling */}
        {hasNextPage && (
          <div 
            ref={observerTarget} 
            className="w-full h-20 flex justify-center items-center mt-4"
          >
            {isFetchingNextPage && (
              <Loader2 className="w-6 h-6 animate-spin text-apple-gray" />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Deals;
