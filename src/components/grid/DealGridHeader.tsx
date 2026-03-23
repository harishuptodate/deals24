
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Heart, ArrowUpDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import DateRangeFilter from '@/components/filters/DateRangeFilter';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

const DealGridHeader = () => {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = searchParams.get('sort'); // 'oldest' => oldest -> newest

  const toggleSort = () => {
    const next = new URLSearchParams(searchParams);
    if (sort === 'oldest') {
      next.delete('sort');
    } else {
      next.set('sort', 'oldest');
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="flex sm:flex-row sm:items-center justify-between mb-4 gap-4">
      <h2 className="text-xl md:text-2xl font-semibold text-gradient dark:text-gradient">
        Latest Deals
      </h2>
      
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size={isMobile ? 'icon' : 'sm'}
          onClick={toggleSort}
          className={cn("rounded-full h-8 px-3 py-0.5 text-xs dark:border-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800", isMobile && "h-8 w-8")}>
          <ArrowUpDown size={14} className={cn("opacity-80 transition-transform", !isMobile && "mr-2", sort === 'oldest' && "rotate-180")} />
          {!isMobile && (sort === 'oldest' ? 'Oldest' : 'Newest')}
        </Button>

        <DateRangeFilter />

      </div>
    </div>
  );
};

export default DealGridHeader;
