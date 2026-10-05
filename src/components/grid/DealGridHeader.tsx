
import { Button } from '@/components/ui/button';
import { ArrowDown } from 'lucide-react';
import DateRangeFilter from '@/components/filters/DateRangeFilter';
import PriceFilter from '@/components/filters/PriceFilter';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

const DealGridHeader = () => {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = searchParams.get('sort');

  const toggleDateSort = () => {
    const next = new URLSearchParams(searchParams);
    if (sort === 'oldest') {
      next.delete('sort');
    } else {
      next.set('sort', 'oldest');
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="flex sm:flex-row sm:items-center justify-between mb-3 min-[1025px]:mb-4 gap-1.5 min-[1025px]:gap-2">
      <h2 className="text-base md:text-[1.2rem] min-[1025px]:text-2xl font-semibold text-gradient dark:text-gradient">
        Latest Deals
      </h2>
      
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleDateSort}
          className="h-7 gap-1 rounded-full border-gray-200 bg-white/80 px-2 text-[10px] leading-none shadow-sm hover:bg-gray-100 sm:h-8 sm:px-2.5 sm:text-xs [&_svg]:size-3 sm:[&_svg]:size-3.5 dark:border-gray-700 dark:bg-gray-900/70 dark:text-gray-200 dark:hover:bg-gray-800">
          <ArrowDown className={cn("shrink-0 opacity-80 transition-transform", sort === 'oldest' && "rotate-180")} />
          <span className="leading-none">
            {isMobile
              ? (sort === 'oldest' ? 'Old' : 'New')
              : (sort === 'oldest' ? 'Oldest' : 'Newest')}
          </span>
        </Button>
        <PriceFilter />
        <DateRangeFilter />

      </div>
    </div>
  );
};

export default DealGridHeader;
