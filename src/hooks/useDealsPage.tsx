
import { useState, useEffect } from 'react';
import { InfiniteData, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { getTelegramMessages, deleteProduct } from '../services/api';
import type { TelegramMessage, TelegramResponse } from '../types/telegram';

export const useDealsPage = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const categoryParam = searchParams.get('category');
  const searchQuery = searchParams.get('search');
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const minPriceParam = searchParams.get('minPrice');
  const maxPriceParam = searchParams.get('maxPrice');
  const sortParam = searchParams.get('sort');
  const [activeCategory, setActiveCategory] = useState<string | null>(categoryParam);
  const queryClient = useQueryClient();

  const dealsQueryKey = [
    'all-telegram-messages',
    activeCategory,
    searchQuery,
    fromParam,
    toParam,
    minPriceParam,
    maxPriceParam,
    sortParam,
  ] as const;

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
    queryKey: dealsQueryKey,
    queryFn: ({ pageParam }) =>
      getTelegramMessages(
        pageParam as string | undefined,
        activeCategory || undefined,
        searchQuery || undefined,
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

  const allMessages = data?.pages.flatMap((page) => page.data) ?? [];
  const totalDealsCount = data?.pages?.[0]?.totalDealsCount ?? 0;
  const isDateRangeActive = !!fromParam || !!toParam;

  const clearFilter = () => {
    navigate('/deals');
  };

  const viewAllDeals = () => {
    navigate('/deals');
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

      if (!removed) {
        return current;
      }

      const firstPage = pages[0];
      if (firstPage && typeof firstPage.totalDealsCount === 'number') {
        pages[0] = {
          ...firstPage,
          totalDealsCount: Math.max(0, firstPage.totalDealsCount - 1),
        };
      }

      return { ...current, pages };
    });
  };

  const updateDealInCache = (
    id: string,
    updater: (message: TelegramMessage) => TelegramMessage,
  ) => {
    queryClient.setQueryData<InfiniteData<TelegramResponse>>(dealsQueryKey, (current) => {
      if (!current) {
        return current;
      }

      let updated = false;
      const pages = current.pages.map((page) => {
        const nextData = page.data.map((message) => {
          if (message.id !== id && message._id !== id) {
            return message;
          }

          updated = true;
          return updater(message);
        });

        return updated ? { ...page, data: nextData } : page;
      });

      return updated ? { ...current, pages } : current;
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
      console.log(`Attempting to delete deal with ID: ${id}`);
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
      console.error('Error deleting deal:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while deleting the deal',
        variant: 'destructive',
      });
    }
  };

  const handleEditProduct = (
    id: string,
    newText: string,
    newImageUrl: string | null,
    newPrice: string | null,
  ) => {
    if (!id) {
      toast({
        title: 'Error',
        description: 'Cannot edit: Deal ID is missing',
        variant: 'destructive',
      });
      return;
    }

    updateDealInCache(id, (message) => ({
      ...message,
      text: newText,
      imageUrl: newImageUrl || undefined,
      price: newPrice || undefined,
    }));
  };

  const getPageTitle = () => {
    if (searchQuery) {
      return `Search Results: ${searchQuery}`;
    } else if (activeCategory) {
      return `${activeCategory
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')} Deals`;
    }
    return 'Latest Deals';
  };

  return {
    searchQuery,
    activeCategory,
    isDateRangeActive,
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
  };
};
