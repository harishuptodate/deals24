
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter } from 'lucide-react';
import { getCategoryCounts } from '../../services/api';
import { Button } from '@/components/ui/button';
import { isAuthenticated } from '@/services/authService';

interface CategoryFilterProps {
  onSelect: (category: string | null) => void;
  current: string | null;
  onSubCategorySelect: (subCategory: string) => void;
}

const CategoryFilter = ({
  onSelect,
  current,
  onSubCategorySelect,
}: CategoryFilterProps) => {
  const isAdmin = isAuthenticated();
  const categories = [
    { name: 'All', slug: null },
    { name: 'Best Deals', slug: 'Best-Deals' },
    { name: 'Electronics & Home', slug: 'electronics-home' },
    { name: 'Laptops & PCs', slug: 'laptops' },
    { name: 'Gadgets & Tech', slug: 'gadgets-accessories' },
    { name: 'Lifestyle & Accessories', slug: 'lifestyle' },
    { name: 'Mobile Phones', slug: 'mobile-phones' },
    { name: 'Fashion', slug: 'fashion' },
    { name: 'Miscellaneous', slug: 'miscellaneous' },
  ];

  const subCategories = {
    'electronics-home': ['TV', 'AC', 'Refrigerator', 'Washing Machine'],
    laptops: [
      'Gaming Laptop',
      'MacBook',
      'Mac',
      'iMac',
      'ThinkPad',
      'Chromebook',
    ],
    'mobile-phones': ['iPhone', 'Samsung', 'OnePlus', 'Pixel'],
    'gadgets-accessories': [
      'Headphones',
      'Charger',
      'Power Bank',
      'Smartwatch',
    ],
    fashion: ['T-Shirt', 'Shirt', 'Jeans', 'Ethnic Wear'],
    lifestyle: ['Shoes', 'Watch', 'Trolley Bag', 'Perfume'],
    miscellaneous: ['Books', 'Stationery', 'Toys', 'Sports', 'Home Decor'],
  };

  const {
    data: categoryCounts,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['category-counts'],
    queryFn: getCategoryCounts,
    enabled: isAdmin,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1, // retry only once if fails
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center mb-5 min-[1025px]:mb-6 overflow-x-auto pb-1.5 min-[1025px]:pb-2 gap-1.5 min-[1025px]:gap-2 max-w-full">
        <Filter
          className="size-[13px] min-[1025px]:size-4 text-apple-gray dark:text-gray-400 mr-[0.2rem] min-[1025px]:mr-1 flex-shrink-0"
        />
        {categories.map((category) => {
          const count = category.slug
            ? categoryCounts?.find((c) => c.category === category.slug)?.count
            : null; // Only get count if slug exists (not for 'All')

          return (
            <button
              key={category.name}
              onClick={() => onSelect(category.slug)}
              className={`flex items-center gap-1.5 min-[1025px]:gap-2 whitespace-nowrap px-2.5 min-[1025px]:px-3 py-[0.3rem] min-[1025px]:py-1.5 rounded-full text-[0.7rem] min-[1025px]:text-sm font-medium transition-colors flex-shrink-0 ${
                current === category.slug ||
                (current === null && category.slug === null)
                  ? 'bg-apple-darkGray dark:bg-gray-700 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-apple-gray dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition-transform duration-150 ease-in-out'
              }`}>
              {category.name}
              {/* Only show count if category has a slug and count exists */}
              {isAdmin && count !== undefined && count !== null && (
                <span className="text-[0.6rem] min-[1025px]:text-xs">({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {current && subCategories[current as keyof typeof subCategories] && (
        <div className="flex flex-wrap gap-2 mb-4">
          {subCategories[current as keyof typeof subCategories].map(
            (subCat) => (
              <button
                key={subCat}
                onClick={() => onSubCategorySelect(subCat)}
                className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-apple-gray dark:text-gray-300 text-xs mb-3 px-3 py-1.5 rounded-full transition-colors active:scale-95 duration-150 ease-in-out">
                {subCat}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
};

export default CategoryFilter;
