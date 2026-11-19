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
      <header className="mb-6 border-b border-zinc-100 pb-5 dark:border-zinc-800 md:mb-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
              Your personal deal space
            </p>
            <h1 className="text-gradient text-[15.6px] font-bold leading-[20.8px] md:text-[19.5px] md:leading-[23.4px]">
              Wishlist & alerts
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-400">
              Keep saved deals close and manage every price or keyword notification in one place.
            </p>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 lg:max-w-lg lg:justify-end">
            <div className="inline-flex min-h-9 items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
              <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
              {favoriteCount} saved
            </div>
            <div className="inline-flex min-h-9 items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
              <BellRing className="h-3.5 w-3.5 text-violet-500" />
              {activeAlertCount} active
            </div>
            <div className="inline-flex min-h-9 min-w-0 max-w-full items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
              {user ? <Cloud className="h-3.5 w-3.5 text-green-500" /> : <Laptop className="h-3.5 w-3.5 text-gray-500" />}
              <span className="min-w-0 truncate sm:max-w-48">{user ? `Synced · ${user.email}` : 'Saved on this device'}</span>
            </div>
            {favoriteCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsConfirmDialogOpen(true)}
                className="h-10 rounded-full px-4 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30">
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
