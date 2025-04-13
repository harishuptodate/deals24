
import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

interface UsePaginationStateReturn {
  initialCursor: string | undefined;
  savePaginationState: (cursor: string | undefined, scrollY?: number) => void;
  isInitialLoad: boolean;
  setIsInitialLoad: React.Dispatch<React.SetStateAction<boolean>>;
}

export function usePaginationState(key: string): UsePaginationStateReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const scrollRestored = useRef(false);
  
  // Get initial cursor from URL
  const initialCursor = searchParams.get('cursor') || undefined;
  
  // Store cursor in URL and scroll position in localStorage
  const savePaginationState = (cursor: string | undefined, scrollY = window.scrollY) => {
    // Only update URL if cursor changes to avoid unnecessary history entries
    const currentCursor = searchParams.get('cursor');
    if (currentCursor !== cursor) {
      const newSearchParams = new URLSearchParams(searchParams);
      
      if (cursor) {
        newSearchParams.set('cursor', cursor);
      } else {
        newSearchParams.delete('cursor');
      }
      
      setSearchParams(newSearchParams, { replace: true });
    }
    
    // Save scroll position to localStorage
    localStorage.setItem(`${key}-scrollPosition`, scrollY.toString());
  };
  
  // Restore scroll position on initial load
  useEffect(() => {
    if (isInitialLoad && !scrollRestored.current) {
      const savedScrollPosition = parseInt(localStorage.getItem(`${key}-scrollPosition`) || '0');
      
      if (savedScrollPosition > 0) {
        // Add a slight delay to allow content to render before scrolling
        const timer = setTimeout(() => {
          window.scrollTo(0, savedScrollPosition);
          scrollRestored.current = true;
          // Don't set isInitialLoad to false here as it may affect data fetching
        }, 300);
        
        return () => clearTimeout(timer);
      } else {
        // No scroll position to restore
        scrollRestored.current = true;
      }
    }
  }, [isInitialLoad, key]);
  
  return {
    initialCursor,
    savePaginationState,
    isInitialLoad,
    setIsInitialLoad
  };
}
