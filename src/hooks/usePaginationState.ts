
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

interface PaginationState {
  cursor: string | undefined;
  scrollPosition: number;
}

export function usePaginationState(key: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Get initial cursor from URL or localStorage fallback
  const initialCursor = searchParams.get('cursor') || undefined;
  const initialScrollPosition = parseInt(localStorage.getItem(`${key}-scrollPosition`) || '0');
  
  // Store cursor and scroll position
  const savePaginationState = (cursor: string | undefined, scrollY = window.scrollY) => {
    // Update URL with cursor
    if (cursor) {
      searchParams.set('cursor', cursor);
      setSearchParams(searchParams, { replace: true });
    } else {
      searchParams.delete('cursor');
      setSearchParams(searchParams, { replace: true });
    }
    
    // Save scroll position to localStorage
    localStorage.setItem(`${key}-scrollPosition`, scrollY.toString());
  };
  
  // Restore scroll position
  useEffect(() => {
    if (isInitialLoad && initialScrollPosition > 0) {
      setTimeout(() => {
        window.scrollTo(0, initialScrollPosition);
        setIsInitialLoad(false);
      }, 500); // Small delay to allow rendering
    }
  }, [isInitialLoad, initialScrollPosition]);
  
  return {
    initialCursor,
    initialScrollPosition,
    savePaginationState,
    isInitialLoad,
    setIsInitialLoad
  };
}
