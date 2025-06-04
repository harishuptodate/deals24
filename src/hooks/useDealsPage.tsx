
import { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { getTelegramMessages, deleteProduct, updateMessageText } from '../services/api';

export const useDealsPage = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const categoryParam = searchParams.get('category');
  const searchQuery = searchParams.get('search');
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
  } = useInfiniteQuery({
    queryKey: ['all-telegram-messages', activeCategory, searchQuery],
    queryFn: ({ pageParam }) =>
      getTelegramMessages(
        pageParam as string | undefined,
        activeCategory || undefined,
        searchQuery || undefined,
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
  };

  const handleEditProduct = async (id: string, newText: string) => {
    if (!id) {
      toast({
        title: 'Error',
        description: 'Cannot edit: Deal ID is missing',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log(`Attempting to edit deal with ID: ${id}`);
      const success = await updateMessageText(id, newText);

      if (success) {
        toast({
          title: 'Success',
          description: 'Deal has been updated successfully',
          variant: 'default',
        });
        refetch();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update deal',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating deal:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while updating the deal',
        variant: 'destructive',
      });
    }
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
