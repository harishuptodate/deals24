import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bell, Heart, Share2 } from 'lucide-react';

interface DealPageHeaderProps {
  onGoBack: () => void;
  isSaved: boolean;
  isSharing: boolean;
  onToggleWishlist: () => void;
  onShare: () => void;
  onCreateAlert: () => void;
}

const DealPageHeader = ({ onGoBack, isSaved, isSharing, onToggleWishlist, onShare, onCreateAlert }: DealPageHeaderProps) => (
  <div className="flex w-full items-center justify-between gap-2">
    <Button variant="ghost" onClick={onGoBack} aria-label="Go back" className="h-10 w-10 gap-2 rounded-full p-0 sm:w-auto sm:min-w-24 sm:px-4">
      <ArrowLeft size={16} aria-hidden="true" /><span className="hidden sm:inline">Back</span>
    </Button>
    <div className="flex items-center gap-2">
      <Button onClick={onToggleWishlist} variant="ghost" aria-label={isSaved ? 'Remove from wishlist' : 'Save to wishlist'} aria-pressed={isSaved} className="h-10 w-10 gap-2 rounded-full p-0 sm:w-auto sm:min-w-24 sm:px-4">
        <Heart size={16} aria-hidden="true" className={isSaved ? 'fill-rose-500 text-rose-500' : ''} />
        <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
      </Button>
      <button type="button" onClick={onShare} disabled={isSharing} aria-busy={isSharing} aria-label={isSharing ? 'Sharing deal' : 'Share deal'} className="inline-flex h-10 w-10 items-center justify-center gap-2 rounded-lg border-0 bg-transparent p-0 text-sm font-medium transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-gray-800 sm:w-auto sm:min-w-24 sm:px-4">
        <Share2 size={16} aria-hidden="true" /><span className="hidden sm:inline">{isSharing ? 'Sharing...' : 'Share'}</span>
      </button>
      <Button onClick={onCreateAlert} variant="outline" aria-label="Create price alert" className="h-10 w-10 gap-2 rounded-full p-0 sm:w-auto sm:px-4">
        <Bell size={16} aria-hidden="true" /><span className="hidden sm:inline">Price alert</span>
      </Button>
    </div>
  </div>
);

export default DealPageHeader;
