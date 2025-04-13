
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

interface PaginationState {
  cursor: string | undefined;
  scrollPosition: number;
}

export function usePaginationState(key: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Get initial cursor from URL
  const initialCursor = searchParams.get('cursor') || undefined;
  
  // Get initial scroll position from localStorage
  const initialScrollPosition = parseInt(localStorage.getItem(`${key}-scrollPosition`) || '0');
  
  // Store cursor and scroll position
  const savePaginationState = (cursor: string | undefined, scrollY = window.scrollY) => {
    // Update URL with cursor
    const newSearchParams = new URLSearchParams(searchParams);
    
    if (cursor) {
      newSearchParams.set('cursor', cursor);
    } else {
      newSearchParams.delete('cursor');
    }
    
    setSearchParams(newSearchParams, { replace: true });
    
    // Save scroll position to localStorage
    localStorage.setItem(`${key}-scrollPosition`, scrollY.toString());
  };
  
  // Restore scroll position on initial load
  useEffect(() => {
    if (isInitialLoad && initialScrollPosition > 0) {
      // Add a slight delay to allow content to render before scrolling
      const timer = setTimeout(() => {
        window.scrollTo(0, initialScrollPosition);
        setIsInitialLoad(false);
      }, 300);
      
      return () => clearTimeout(timer);
    } else if (isInitialLoad) {
      // No scroll position to restore, just mark initial load as complete
      setIsInitialLoad(false);
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
