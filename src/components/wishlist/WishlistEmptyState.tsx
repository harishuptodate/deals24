
import React from 'react';
import { Heart, Sparkles, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BigFooter } from '@/components/BigFooter';
import IllustratedEmptyState from '../empty-states/IllustratedEmptyState';

const WishlistEmptyState = () => {
  return (
    <>
      <div className="bg-gray-50 dark:bg-[#111111] rounded-xl">
        <IllustratedEmptyState
          icon={Heart}
          title="Your wishlist is empty"
          description="Start saving your favorite deals by clicking the heart icon on any deal card. Build your personal collection of amazing offers!"
          actionText="Browse Deals"
          onAction={() => window.location.href = '/deals'}
          illustration={
            <div className="mx-auto h-24 w-24 flex items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-red-100 dark:from-pink-900/20 dark:to-red-900/20 relative">
              <Heart className="h-12 w-12 text-pink-500 dark:text-pink-400" />
              <div className="absolute -top-1 -right-1">
                <Sparkles className="h-6 w-6 text-yellow-500 animate-pulse" />
              </div>
            </div>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 max-w-sm mx-auto">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Gift className="h-4 w-4" />
              <span>Save favorite deals</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Heart className="h-4 w-4" />
              <span>Quick access anytime</span>
            </div>
          </div>
        </IllustratedEmptyState>
      </div>
      <div className="pt-32 sm:pt-0">
        <BigFooter/>
      </div>
    </>
  );
};

export default WishlistEmptyState;
