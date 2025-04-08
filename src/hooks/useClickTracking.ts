
import { useState, useCallback } from 'react';
import { trackMessageClick, handleTrackedLinkClick } from '../services/api';

interface UseClickTrackingProps {
  messageId?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const useClickTracking = ({ messageId, onSuccess, onError }: UseClickTrackingProps = {}) => {
  const [isTracking, setIsTracking] = useState(false);

  const trackClick = useCallback(async (url: string) => {
    if (!messageId) {
      console.warn('Cannot track click: messageId is undefined');
      return;
    }
    
    setIsTracking(true);
    
    try {
      console.log(`Tracking click for message ID: ${messageId} on URL: ${url}`);
      
      // Use the enhanced click tracking function
      handleTrackedLinkClick(url, messageId);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to track click:', error);
      if (onError && error instanceof Error) {
        onError(error);
      }
    } finally {
      setIsTracking(false);
    }
  }, [messageId, onSuccess, onError]);

  return {
    trackClick,
    isTracking
  };
};
