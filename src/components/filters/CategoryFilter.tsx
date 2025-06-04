
import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getAllCategories } from '../../services/api';

interface CategoryFilterProps {
  onSelect: (category: string) => void;
  current: string;
  onSubCategorySelect?: (subcategory: string) => void;
}

const CategoryFilter = ({ onSelect, current, onSubCategorySelect }: CategoryFilterProps) => {
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const fetchedCategories = await getAllCategories();
        setCategories(fetchedCategories);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleCategorySelect = (category: string) => {
    onSelect(category);
  };

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2 mb-6">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"
            style={{ width: `${Math.random() * 60 + 60}px` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mb-6">
      {/* Mobile Dropdown */}
      <div className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between text-sm"
              size="sm"
            >
              {current || 'All Categories'}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuItem onClick={() => handleCategorySelect('')}>
              All Categories
            </DropdownMenuItem>
            {categories.map((category) => (
              <DropdownMenuItem
                key={category}
                onClick={() => handleCategorySelect(category)}
              >
                {category}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop Horizontal Scroll */}
      <div className="hidden sm:block">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          <button
            onClick={() => handleCategorySelect('')}
            className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
              current === ''
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleCategorySelect(category)}
              className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                current === category
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryFilter;
