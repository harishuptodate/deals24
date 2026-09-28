import React, { useEffect, useState } from 'react';
import {
  Headphones,
  House,
  Laptop,
  Package,
  Shirt,
  Smartphone,
  Watch,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import CachedTelegramImage from './CachedTelegramImage';

interface DealImageProps {
  title: string;
  category?: string;
  imageUrl?: string;
  telegramFileId?: string;
  className?: string;
  fallbackClassName?: string;
}

type ImageSource = 'amazon' | 'telegram' | 'fallback';

const getInitialSource = (imageUrl?: string, telegramFileId?: string): ImageSource => {
  if (imageUrl) return 'amazon';
  if (telegramFileId) return 'telegram';
  return 'fallback';
};

const getCategoryIcon = (category?: string) => {
  switch (category) {
    case 'laptops':
      return Laptop;
    case 'electronics-home':
      return House;
    case 'mobile-phones':
      return Smartphone;
    case 'gadgets-accessories':
      return Headphones;
    case 'fashion':
      return Shirt;
    case 'lifestyle':
      return Watch;
    default:
      return Package;
  }
};

const DealImage = ({
  title,
  category,
  imageUrl,
  telegramFileId,
  className,
  fallbackClassName,
}: DealImageProps) => {
  const [source, setSource] = useState<ImageSource>(() =>
    getInitialSource(imageUrl, telegramFileId),
  );

  useEffect(() => {
    setSource(getInitialSource(imageUrl, telegramFileId));
  }, [imageUrl, telegramFileId]);

  const CategoryIcon = getCategoryIcon(category);

  if (source === 'amazon' && imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={title}
        className={className}
        loading="lazy"
        onError={() => setSource(telegramFileId ? 'telegram' : 'fallback')}
      />
    );
  }

  if (source === 'telegram' && telegramFileId) {
    return (
      <CachedTelegramImage
        telegramFileId={telegramFileId}
        alt={title}
        className={className}
        onError={() => setSource('fallback')}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-500',
        className,
        fallbackClassName,
      )}>
      <CategoryIcon className="h-14 w-14" aria-hidden="true" />
      <span className="sr-only">{category || 'deal'} placeholder</span>
    </div>
  );
};

export default DealImage;
