
import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";

const DealCardSkeleton = () => {
  return (
    <div className="animate-fade-up h-[290px]">
      <div className="glass-effect rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] h-full flex flex-col border-gray-200 dark:border-gray-900 dark:bg-zinc-950">
        <div className="absolute top-4 right-4 flex gap-1 z-10">
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>

        <div className="space-y-2 flex-1 flex flex-col">
          <div className="space-y-1">
            <Skeleton className="h-5 w-24 mb-2" />
            <Skeleton className="h-6 w-full" />
          </div>

          <div className="mt-1 flex-1">
            <Skeleton className="h-4 w-full mt-2" />
            <Skeleton className="h-4 w-5/6 mt-2" />
            <Skeleton className="h-4 w-4/6 mt-2" />
          </div>

          <div className="mt-auto pt-2">
            <Skeleton className="h-10 w-full rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealCardSkeleton;
