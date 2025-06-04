
import React from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BigFooter } from '@/components/BigFooter';

const WishlistEmptyState = () => {
  return (
    <>
      <div className="text-center py-16 bg-gray-50 dark:bg-[#111111] rounded-xl">
        <Heart className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-700 mb-4" />
        <h3 className="text-xl font-semibold text-apple-darkGray dark:text-gray-200 mb-2">Your wishlist is empty</h3>
        <p className="text-apple-gray dark:text-gray-400 mb-6">Start saving your favorite deals by clicking the heart icon</p>
        <Button asChild className="dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800">
          <a href="/deals">Browse Deals</a>
        </Button>
      </div>
      <div className="pt-32 sm:pt-0">
        <BigFooter/>
      </div>
    </>
  );
};

export default WishlistEmptyState;
