
import { Button } from '@/components/ui/button';
import { X, ArrowDown } from 'lucide-react';
import DateRangeFilter from '../filters/DateRangeFilter';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface DealsHeaderProps {
  pageTitle: string;
  searchQuery?: string | null;
  activeCategory?: string | null;
  totalDealsCount: number;
  onClearFilter: () => void;
  isDateRangeActive?: boolean;
}

const DealsHeader = ({
  pageTitle,
  searchQuery,
  activeCategory,
  totalDealsCount,
  onClearFilter,
}: DealsHeaderProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
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
    <div className="mb-6 md:mb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-bold text-gradient dark:text-gradient">
            {pageTitle}
          </h1>
          
          {(searchQuery || activeCategory) && totalDealsCount > 0 && (
            <p className="text-sm sm:text-md md:text-lg font-medium text-gray-600 dark:text-gray-300 md:hidden">
              {totalDealsCount} result{totalDealsCount > 1 ? 's' : ''} found
            </p>
          )}
        </div>
{/* {large screen style} */}
        <div className="flex items-center justify-end gap-2 flex-shrink-0 md:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleSort}
            className="rounded-full -mr-0.5 h-7 sm:h-8 px-2 sm:px-3 py-0.5 text-[12px] sm:text-xs dark:border-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowDown size={12} className={cn("sm:size-[14px] opacity-80 transition-transform -mr-1 -ml-1", sort === 'oldest' && "rotate-180")} />
            {(sort === 'oldest' ? 'Old' : 'New')} 
          </Button>

          <DateRangeFilter />
          
          {(activeCategory || searchQuery) && (
            <Button
              variant="outline"
              
              className="rounded-full h-7 sm:h-8 px-2 sm:px-3 py-0.5 text-[12px] sm:text-xs dark:border-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={onClearFilter}>
              <X size={12} className="-mr-1.5 -ml-1" />
              Clear {searchQuery ? 'Search' : 'Filter'}
            </Button>
          )}
        </div>

        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleSort}
            className="rounded-full h-8 px-3 py-0.5 text-xs dark:border-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowDown size={14} className={cn("opacity-80 transition-transform", sort === 'oldest' && "rotate-180")} />
            {!isMobile && (sort === 'oldest' ? 'Oldest' : 'Newest')}
          </Button>

          <DateRangeFilter />
          
          {(activeCategory || searchQuery) && (
            <Button
              variant="outline"
              
              className="rounded-full h-8 px-3 py-0.5 text-xs dark:border-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={onClearFilter}>
              <X size={16} />
              Clear {searchQuery ? 'Search' : 'Filter'}
            </Button>
          )}
        </div>
      </div>

      {(searchQuery || activeCategory) && totalDealsCount > 0 && (
        <p className="hidden md:block text-sm sm:text-md md:text-lg font-medium text-gray-600 dark:text-gray-300">
          {totalDealsCount} result{totalDealsCount > 1 ? 's' : ''} found
        </p>
      )}
    </div>
  );
};

export default DealsHeader;
