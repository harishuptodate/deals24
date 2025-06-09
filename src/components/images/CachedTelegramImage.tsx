
import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface CachedTelegramImageProps {
  telegramFileId: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

// In-memory cache for image URLs
const imageCache = new Map<string, string>();

const CachedTelegramImage = ({
  telegramFileId,
  alt,
  className,
  onLoad,
  onError
}: CachedTelegramImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  const getApiBaseUrl = () => {
    const configuredUrl = import.meta.env.VITE_API_BASE_URL;
    if (!configuredUrl) {
      return `${window.location.origin}/api`;
    }
    if (configuredUrl.startsWith('http')) {
      return configuredUrl;
    }
    return `${window.location.origin}${configuredUrl}`;
  };

  React.useEffect(() => {
    // Check cache first
    if (imageCache.has(telegramFileId)) {
      setImageSrc(imageCache.get(telegramFileId)!);
      return;
    }

    // Generate URL and cache it
    const apiBaseUrl = getApiBaseUrl();
    const url = `${apiBaseUrl}/amazon/download-image/${telegramFileId}`;
    imageCache.set(telegramFileId, url);
    setImageSrc(url);
  }, [telegramFileId]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsError(true);
    onError?.();
  }, [onError]);

  if (!imageSrc) {
    return (
      <div className={cn("bg-gray-200 dark:bg-gray-800 animate-pulse", className)} />
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <img
        src={imageSrc}
        alt={alt}
        loading="lazy"
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0",
          isError && "hidden"
        )}
      />
      {!isLoaded && !isError && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse" />
      )}
    </div>
  );
};

export default CachedTelegramImage;
