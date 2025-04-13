
import { useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

interface UseInfiniteScrollOptions {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  isInitialLoading?: boolean;
}

export const useInfiniteScroll = ({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  isInitialLoading = false,
}: UseInfiniteScrollOptions) => {
  const observerTarget = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const initialLoadComplete = useRef(false);

  // Track if this is the initial page load
  const isInitialPageLoad = useRef(true);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      
      // If this is the initial page load, only fetch the first page
      if (isInitialPageLoad.current) {
        isInitialPageLoad.current = false;
        return;
      }

      // Only fetch the next page if:
      // 1. The target element is intersecting
      // 2. There is a next page to fetch
      // 3. We're not already fetching the next page
      // 4. Initial data load is complete
      if (
        target.isIntersecting && 
        hasNextPage && 
        !isFetchingNextPage && 
        initialLoadComplete.current
      ) {
        console.log('Intersection observer triggered, fetching next page');
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    // Mark initial load as complete once we're no longer in loading state
    if (!isInitialLoading) {
      initialLoadComplete.current = true;
    }
  }, [isInitialLoading]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      rootMargin: '0px 0px 400px 0px', // Increased rootMargin for earlier loading
      threshold: 0.1,
    });

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [handleObserver]);

  return { observerTarget };
};
