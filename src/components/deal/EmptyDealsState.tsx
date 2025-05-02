
import React from 'react';
import { Button } from '@/components/ui/button';

interface EmptyDealsStateProps {
  searchQuery?: string | null;
  activeCategory?: string | null;
  onViewAllClick: () => void;
}

const EmptyDealsState = ({ 
  searchQuery, 
  activeCategory, 
  onViewAllClick 
}: EmptyDealsStateProps) => {
  return (
    <div className="text-center py-16">
      <p className="text-apple-gray dark:text-gray-400">
        {searchQuery
          ? `No deals found for "${searchQuery}".`
          : activeCategory
          ? 'No deals found for this category.'
          : 'No deals available at the moment.'}
      </p>
      {(searchQuery || activeCategory) && (
        <Button
          onClick={onViewAllClick}
          variant="outline"
          className="mt-4 dark:border-gray-700 dark:text-gray-300">
          View All Deals
        </Button>
      )}
    </div>
  );
};

export default EmptyDealsState;
