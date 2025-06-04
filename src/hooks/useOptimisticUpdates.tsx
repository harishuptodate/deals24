
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface OptimisticUpdate<T> {
  queryKey: (string | number)[];
  updateFn: (oldData: T) => T;
  rollbackFn?: (oldData: T) => T;
}

export const useOptimisticUpdates = <T,>() => {
  const queryClient = useQueryClient();
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, T>>(new Map());

  const performOptimisticUpdate = useCallback(async <TResult,>(
    update: OptimisticUpdate<T>,
    mutationFn: () => Promise<TResult>
  ): Promise<TResult> => {
    const { queryKey, updateFn, rollbackFn } = update;
    const key = JSON.stringify(queryKey);
    
    // Store the current data
    const previousData = queryClient.getQueryData<T>(queryKey);
    
    if (previousData) {
      // Apply optimistic update
      const optimisticData = updateFn(previousData);
      setOptimisticUpdates(prev => new Map(prev).set(key, previousData));
      queryClient.setQueryData(queryKey, optimisticData);
    }

    try {
      // Perform the actual mutation
      const result = await mutationFn();
      
      // Clear optimistic update on success
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });
      
      // Invalidate to get fresh data
      queryClient.invalidateQueries({ queryKey });
      
      return result;
    } catch (error) {
      // Rollback on error
      if (previousData) {
        const rollbackData = rollbackFn ? rollbackFn(previousData) : previousData;
        queryClient.setQueryData(queryKey, rollbackData);
      }
      
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });
      
      throw error;
    }
  }, [queryClient]);

  return { performOptimisticUpdate, optimisticUpdates };
};
