
import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface DealsHeaderProps {
  pageTitle: string;
  searchQuery?: string | null;
  activeCategory?: string | null;
  totalDealsCount: number;
  onClearFilter: () => void;
}

const DealsHeader = ({
  pageTitle,
  searchQuery,
  activeCategory,
  totalDealsCount,
  onClearFilter,
}: DealsHeaderProps) => {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center justify-between mb-6 md:mb-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gradient dark:text-gradient">
          {pageTitle}
        </h1>

        {(searchQuery || activeCategory) && totalDealsCount > 0 && (
          <p className="text-sm sm:text-md md:text-lg font-medium text-gray-600 dark:text-gray-300">
            {totalDealsCount} result{totalDealsCount > 1 ? 's' : ''} found
          </p>
        )}
      </div>

      {(activeCategory || searchQuery) && (
        <Button
          variant="outline"
          className="flex items-center gap-2 rounded-full dark:border-gray-700 dark:text-gray-200"
          onClick={onClearFilter}>
          <X size={16} />
          Clear {searchQuery ? 'Search' : 'Filter'}
        </Button>
      )}
    </div>
  );
};

export default DealsHeader;
