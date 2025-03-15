
import { useState, useCallback } from 'react';
import { trackMessageClick } from '../services/api';

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
      
      // Store click in localStorage
      const clickData = JSON.parse(localStorage.getItem('clickData') || '[]');
      clickData.push({
        messageId,
        url,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('clickData', JSON.stringify(clickData));
      
      // Track click to backend - make sure this works on mobile too
      await trackMessageClick(messageId);
      console.log(`Successfully tracked click for message ID: ${messageId}`);
      
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
