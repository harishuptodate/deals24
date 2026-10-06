import { useState } from 'react';
import { BellRing, Cloud, Heart, Laptop, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import ClearAllConfirmDialog from './ClearAllConfirmDialog';

interface WishlistHeaderProps {
  favoriteCount: number;
  activeAlertCount: number;
  onClearAll: () => void;
}

const WishlistHeader = ({ favoriteCount, activeAlertCount, onClearAll }: WishlistHeaderProps) => {
  const { user } = useAuth();
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  return (
    <>
      <header className="mb-4 border-b border-gray-200 pb-4 dark:border-gray-800 sm:mb-6 sm:pb-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400 sm:mb-1 sm:text-xs">
              Your personal deal space
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
              Wishlist & alerts
            </h1>
            <p className="mt-1 max-w-2xl text-[13px] leading-5 text-gray-500 dark:text-gray-400 sm:text-sm sm:leading-6">
              Keep saved deals close and manage every price or keyword notification in one place.
            </p>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <div className="inline-flex h-8 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 shadow-sm dark:border-gray-800 dark:bg-zinc-950 dark:text-gray-200 sm:h-9">
              <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
              {favoriteCount} saved
            </div>
            <div className="inline-flex h-8 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 shadow-sm dark:border-gray-800 dark:bg-zinc-950 dark:text-gray-200 sm:h-9">
              <BellRing className="h-3.5 w-3.5 text-violet-500" />
              {activeAlertCount} active
            </div>
            <div className="inline-flex h-8 min-w-0 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 shadow-sm dark:border-gray-800 dark:bg-zinc-950 dark:text-gray-200 sm:h-9 sm:max-w-full">
              {user ? <Cloud className="h-3.5 w-3.5 text-green-500" /> : <Laptop className="h-3.5 w-3.5 text-gray-500" />}
              <span className="min-w-0 truncate sm:max-w-48">{user ? `Synced · ${user.email}` : 'Saved on this device'}</span>
            </div>
            {favoriteCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsConfirmDialogOpen(true)}
                className="h-8 rounded-full border border-red-200 px-3 text-xs text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-red-900/70 dark:hover:bg-red-950/30 sm:h-9">
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Clear wishlist
              </Button>
            )}
          </div>
        </div>
      </header>

      <ClearAllConfirmDialog
        isOpen={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
        onConfirm={onClearAll}
        itemCount={favoriteCount}
      />
    </>
  );
};

export default WishlistHeader;
