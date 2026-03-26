
import { Button } from '@/components/ui/button';
import { ArrowDown } from 'lucide-react';
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
    <div className="flex sm:flex-row sm:items-center justify-between mb-4 gap-2">
      <h2 className="text-xl md:text-2xl font-semibold text-gradient dark:text-gradient">
        Latest Deals
      </h2>
      
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleSort}
          // className="rounded-full h-7 sm:h-8 px-2 sm:px-3 py-0.5 text-[10px] sm:text-xs dark:border-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
          // <ArrowDown size={12} className={cn("-mr-1 -ml-1 sm:size-[14px] opacity-80 transition-transform", sort === 'oldest' && "rotate-180")} />
          // {!isMobile && (sort === 'oldest' ? 'Oldest' : 'Newest')}
          className="rounded-full h-7 sm:h-8 px-2 sm:px-3 py-0.5 text-[10px] sm:text-xs dark:border-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowDown size={14} className={cn("-mr-1 -ml-1 sm:size-[14px] opacity-80 transition-transform", sort === 'oldest' && "rotate-180")} />
            {!isMobile && (sort === 'oldest' ? 'Oldest' : 'Newest')}

          
          {isMobile && (sort === 'oldest' ? 'Old' : 'New')}
        </Button>

        <DateRangeFilter />

      </div>
    </div>
  );
};

export default DealGridHeader;
