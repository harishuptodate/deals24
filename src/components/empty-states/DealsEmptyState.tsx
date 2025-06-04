
import React from 'react';
import { Search, ShoppingBag, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import IllustratedEmptyState from './IllustratedEmptyState';

interface DealsEmptyStateProps {
  searchQuery?: string | null;
  activeCategory?: string | null;
  onViewAllClick: () => void;
  onBrowseCategories?: () => void;
}

const DealsEmptyState = ({ 
  searchQuery, 
  activeCategory, 
  onViewAllClick,
  onBrowseCategories 
}: DealsEmptyStateProps) => {
  if (searchQuery) {
    return (
      <IllustratedEmptyState
        icon={Search}
        title="No deals found"
        description={`We couldn't find any deals matching "${searchQuery}". Try adjusting your search terms or browse our categories.`}
        actionText="View All Deals"
        onAction={onViewAllClick}
        illustration={
          <div className="mx-auto h-24 w-24 flex items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
            <Search className="h-12 w-12 text-blue-500 dark:text-blue-400" />
          </div>
        }
      >
        {onBrowseCategories && (
          <Button variant="outline" onClick={onBrowseCategories} className="w-full sm:w-auto ml-0 sm:ml-3">
            Browse Categories
          </Button>
        )}
      </IllustratedEmptyState>
    );
  }

  if (activeCategory) {
    return (
      <IllustratedEmptyState
        icon={ShoppingBag}
        title="No deals in this category"
        description="We're working hard to bring you great deals in this category. Check back soon or explore other categories."
        actionText="View All Deals"
        onAction={onViewAllClick}
        illustration={
          <div className="mx-auto h-24 w-24 flex items-center justify-center rounded-full bg-purple-50 dark:bg-purple-900/20">
            <ShoppingBag className="h-12 w-12 text-purple-500 dark:text-purple-400" />
          </div>
        }
      />
    );
  }

  return (
    <IllustratedEmptyState
      icon={Sparkles}
      title="No deals available"
      description="We're currently updating our deals collection. New amazing offers are coming soon!"
      actionText="Refresh"
      onAction={() => window.location.reload()}
      illustration={
        <div className="mx-auto h-24 w-24 flex items-center justify-center rounded-full bg-gradient-to-br from-orange-100 to-pink-100 dark:from-orange-900/20 dark:to-pink-900/20">
          <Sparkles className="h-12 w-12 text-gradient bg-gradient-to-r from-orange-500 to-pink-500" />
        </div>
      }
    />
  );
};

export default DealsEmptyState;
