
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
      window.open(url, '_blank');
      return;
    }
    
    setIsTracking(true);
    
    try {
      console.log(`Tracking click for message ID: ${messageId} on URL: ${url}`);
      
      // Use navigator.sendBeacon for reliable tracking during navigation
      let success = false;
      
      if (navigator.sendBeacon) {
        // Create a form data object
        const data = new FormData();
        data.append('messageId', messageId);
        
        // Use the full URL path for the beacon
        const apiBaseUrl = window.location.origin;
        const endpoint = `${apiBaseUrl}/api/telegram/messages/${messageId}/click`;
        
        success = navigator.sendBeacon(endpoint, data);
        console.log(`SendBeacon result: ${success ? 'Success' : 'Failed'}`);
      }
      
      // If beacon is not supported or failed, use standard AJAX
      if (!success) {
        await trackMessageClick(messageId);
      }
      
      if (onSuccess) {
        onSuccess();
      }
      
      // Add a small delay to ensure tracking request is sent
      setTimeout(() => {
        setIsTracking(false);
        window.open(url, '_blank');
      }, 100);
      
    } catch (error) {
      console.error('Failed to track click:', error);
      setIsTracking(false);
      
      if (onError && error instanceof Error) {
        onError(error);
      }
      
      // Open the URL even if tracking fails
      window.open(url, '_blank');
    }
  }, [messageId, onSuccess, onError]);

  return {
    trackClick,
    isTracking
  };
};
