
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Heart, ArrowUpDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import DateRangeFilter from '@/components/filters/DateRangeFilter';
import { useSearchParams } from 'react-router-dom';

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
        {isMobile && (
          <Link to="/wishlist">
            <Button
              variant="ghost"
              size="sm"
              className="text-sm rounded-full dark:text-gray-200">
              {/* <span>Wishlist</span> */}
              <Heart className="h-5 w-5 mr-1" />
            </Button>
          </Link>
        )}

        <DateRangeFilter />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleSort}
          className="rounded-full h-8 px-3 py-0.5 text-xs dark:border-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowUpDown size={14} className="mr-2 opacity-80" />
          {sort === 'oldest' ? 'Oldest' : 'Newest'}
        </Button>
      </div>
    </div>
  );
};

export default DealGridHeader;
