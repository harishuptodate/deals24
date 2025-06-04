
import { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { getTelegramMessages, deleteProduct } from '../services/api';

export const useDealGrid = () => {
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
    refetch,
  } = useInfiniteQuery({
    queryKey: ['telegram-messages', activeCategory, searchQuery],
    queryFn: ({ pageParam }) =>
      getTelegramMessages(
        pageParam as string | undefined,
        activeCategory,
        searchQuery,
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
  }, [activeCategory, searchQuery, refetch]);

  const handleCategoryChange = (category: string | null) => {
    setActiveCategory(category);
  };

  const handleSubCategorySelect = (subCategory: string) => {
    navigate(`/deals?search=${encodeURIComponent(subCategory)}`);
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
