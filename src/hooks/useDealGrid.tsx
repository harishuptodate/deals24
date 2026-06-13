
import { useState, useEffect } from 'react';
import { InfiniteData, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { getTelegramMessages, deleteProduct } from '../services/api';
import type { TelegramResponse } from '../types/telegram';

export const useDealGrid = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search');
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const minPriceParam = searchParams.get('minPrice');
  const maxPriceParam = searchParams.get('maxPrice');
  const sortParam = searchParams.get('sort');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const dealsQueryKey = [
    'telegram-messages',
    activeCategory,
    searchQuery,
    fromParam,
    toParam,
    minPriceParam,
    maxPriceParam,
    sortParam,
  ] as const;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: dealsQueryKey,
    queryFn: ({ pageParam }) =>
      getTelegramMessages(
        pageParam as string | undefined,
        activeCategory,
        searchQuery,
        fromParam,
        toParam,
        minPriceParam,
        maxPriceParam,
        sortParam,
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

  useEffect(() => {
    refetch();
  }, [activeCategory, searchQuery, fromParam, toParam, minPriceParam, maxPriceParam, sortParam, refetch]);

  const handleCategoryChange = (category: string | null) => {
    setActiveCategory(category);
  };

  const handleSubCategorySelect = (subCategory: string) => {
    navigate(`/deals?search=${encodeURIComponent(subCategory)}`);
  };

  const removeDealFromCache = (id: string) => {
    queryClient.setQueryData<InfiniteData<TelegramResponse>>(dealsQueryKey, (current) => {
      if (!current) {
        return current;
      }

      let removed = false;
      const pages = current.pages.map((page) => {
        const nextData = page.data.filter((message) => {
          const shouldKeep = message.id !== id && message._id !== id;
          if (!shouldKeep) {
            removed = true;
          }
          return shouldKeep;
        });

        return nextData.length === page.data.length ? page : { ...page, data: nextData };
      });

      return removed ? { ...current, pages } : current;
    });
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
        removeDealFromCache(id);
        toast({
          title: 'Success',
          description: 'Deal has been deleted successfully',
          variant: 'default',
        });
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

  const allMessages = data?.pages.flatMap((page) => page.data) || [];

  return {
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
  };
};
