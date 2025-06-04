
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const usePrefetch = () => {
  const queryClient = useQueryClient();

  const prefetchQuery = useCallback(async (
    queryKey: (string | number)[],
    queryFn: () => Promise<any>,
    options?: {
      staleTime?: number;
      cacheTime?: number;
    }
  ) => {
    await queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: options?.staleTime || 1000 * 60 * 5, // 5 minutes
      gcTime: options?.cacheTime || 1000 * 60 * 10, // 10 minutes
    });
  }, [queryClient]);

  const prefetchDeal = useCallback(async (dealId: string) => {
    // Import the API function dynamically
    const { getDealById } = await import('../services/api');
    
    await prefetchQuery(
      ['deal', dealId],
      () => getDealById(dealId)
    );
  }, [prefetchQuery]);

  const prefetchDeals = useCallback(async (category?: string, search?: string) => {
    // Import the API function dynamically
    const { getTelegramMessages } = await import('../services/api');
    
    await prefetchQuery(
      ['telegram-messages', category, search],
      () => getTelegramMessages(undefined, category, search)
    );
  }, [prefetchQuery]);

  return {
    prefetchQuery,
    prefetchDeal,
    prefetchDeals
  };
};
