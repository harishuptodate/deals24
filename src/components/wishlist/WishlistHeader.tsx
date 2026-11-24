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
            <p className="mb-1 text-[0.9rem] font-medium text-gray-600 dark:text-gray-400">
              Your personal deal space
            </p>
            <h1 className="text-gradient text-[1.17rem] font-bold leading-[1.56rem] md:text-[1.4625rem] md:leading-[1.755rem]">
              Wishlist & alerts
            </h1>
            <p className="mt-2 max-w-2xl text-[1.05rem] leading-[1.8rem] text-gray-600 dark:text-gray-400">
              Keep saved deals close and manage every price or keyword notification in one place.
            </p>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-x-[1.1rem] gap-y-[0.55rem] lg:max-w-lg lg:justify-end">
            <div className="inline-flex min-h-9 items-center gap-[0.4125rem] text-[0.825rem] font-medium text-gray-600 dark:text-gray-400">
              <Heart className="h-[0.9625rem] w-[0.9625rem] fill-rose-500 text-rose-500" />
              {favoriteCount} saved
            </div>
            <div className="inline-flex min-h-9 items-center gap-[0.4125rem] text-[0.825rem] font-medium text-gray-600 dark:text-gray-400">
              <BellRing className="h-[0.9625rem] w-[0.9625rem] text-violet-500" />
              {activeAlertCount} active
            </div>
            <div className="inline-flex min-h-9 min-w-0 max-w-full items-center gap-[0.4125rem] text-[0.825rem] text-gray-600 dark:text-gray-400">
              {user ? <Cloud className="h-[0.9625rem] w-[0.9625rem] text-green-500" /> : <Laptop className="h-[0.9625rem] w-[0.9625rem] text-gray-500" />}
              <span className="min-w-0 truncate sm:max-w-48">{user ? `Synced · ${user.email}` : 'Saved on this device'}</span>
            </div>
            {favoriteCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsConfirmDialogOpen(true)}
                className="h-auto min-h-[2.75rem] rounded-full px-[1.1rem] text-[0.825rem] text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30">
                <Trash2 className="mr-[0.4125rem] h-[0.9625rem] w-[0.9625rem]" />
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
