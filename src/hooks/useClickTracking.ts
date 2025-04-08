
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
      
      // Store click in localStorage for backup
      const clickData = JSON.parse(localStorage.getItem('clickData') || '[]');
      clickData.push({
        messageId,
        url,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('clickData', JSON.stringify(clickData));
      
      // Use navigator.sendBeacon for reliable tracking during navigation
      let success = false;
      
      if (navigator.sendBeacon) {
        const formData = new FormData();
        formData.append('messageId', messageId);
        
        const endpoint = `${window.location.origin}/api/telegram/messages/${messageId}/click`;
        success = navigator.sendBeacon(endpoint, formData);
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
