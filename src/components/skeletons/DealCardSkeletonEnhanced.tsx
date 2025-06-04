
import React from 'react';
import { EnhancedSkeleton } from '@/components/ui/enhanced-skeleton';

const DealCardSkeletonEnhanced = () => {
  return (
    <div className="animate-fade-up h-[290px]">
      <div className="glass-effect rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] h-full flex flex-col border-gray-200 dark:border-gray-900 dark:bg-zinc-950">
        {/* Header with action buttons */}
        <div className="flex justify-between items-start mb-4">
          <EnhancedSkeleton variant="shimmer" shape="text" className="h-6 w-24" />
          <div className="flex gap-1">
            <EnhancedSkeleton variant="shimmer" shape="circle" className="h-9 w-9" />
            <EnhancedSkeleton variant="shimmer" shape="circle" className="h-9 w-9" />
          </div>
        </div>

        {/* Content area */}
        <div className="space-y-3 flex-1">
          {/* Title */}
          <EnhancedSkeleton variant="shimmer" shape="text" className="h-6 w-full" />
          <EnhancedSkeleton variant="shimmer" shape="text" className="h-6 w-4/5" />
          
          {/* Description lines */}
          <div className="space-y-2 mt-4">
            <EnhancedSkeleton variant="shimmer" shape="text" className="h-4 w-full" />
            <EnhancedSkeleton variant="shimmer" shape="text" className="h-4 w-5/6" />
            <EnhancedSkeleton variant="shimmer" shape="text" className="h-4 w-4/6" />
            <EnhancedSkeleton variant="shimmer" shape="text" className="h-4 w-3/6" />
          </div>
        </div>

        {/* Action button */}
        <div className="mt-auto pt-4">
          <EnhancedSkeleton variant="shimmer" className="h-10 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default DealCardSkeletonEnhanced;
