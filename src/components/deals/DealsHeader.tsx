
import { Button } from '@/components/ui/button';
import { X, ArrowUpDown } from 'lucide-react';
import DateRangeFilter from '../filters/DateRangeFilter';
import { useSearchParams } from 'react-router-dom';

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
      <div className="flex items-center justify-between gap-2 mb-2">
        <h1 className="text-2xl md:text-3xl font-bold text-gradient dark:text-gradient">
          {pageTitle}
        </h1>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleSort}
            className="rounded-full h-8 px-3 py-0.5 text-xs dark:border-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowUpDown size={14} className="opacity-80" />
            {sort === 'oldest' ? 'Oldest' : 'Newest'}
          </Button>

          {(activeCategory || searchQuery) && (
            <Button
              variant="outline"
              className="flex items-center gap-2 rounded-full dark:border-gray-700 dark:text-gray-200"
              onClick={onClearFilter}>
              <X size={16} />
              Clear {searchQuery ? 'Search' : 'Filter'}
            </Button>
          )}
          <DateRangeFilter />
        </div>
      </div>

      {(searchQuery || activeCategory) && totalDealsCount > 0 && (
        <p className="text-sm sm:text-md md:text-lg font-medium text-gray-600 dark:text-gray-300">
          {totalDealsCount} result{totalDealsCount > 1 ? 's' : ''} found
        </p>
      )}
    </div>
  );
};

export default DealsHeader;
