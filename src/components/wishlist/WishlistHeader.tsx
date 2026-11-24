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
      <header className="mb-8 border-b border-zinc-200 pb-6 dark:border-zinc-800 md:mb-10 md:pb-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
              Your Deals24 shortlist
            </p>
            <h1 className="text-3xl font-medium leading-tight text-zinc-950 dark:text-zinc-100 md:text-4xl">
              Wishlist & alerts
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-600 dark:text-zinc-400 md:text-base">
              Save the deals you’re considering. Watch for the price you want.
            </p>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-sm tabular-nums lg:max-w-md lg:justify-end">
            <div className="inline-flex min-h-8 items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <Heart aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
              {favoriteCount} saved
            </div>
            <div className="inline-flex min-h-8 items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <BellRing aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
              {activeAlertCount} active
            </div>
            <div className="inline-flex min-h-8 min-w-0 max-w-full items-center gap-2 text-zinc-500 dark:text-zinc-400">
              {user ? <Cloud aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.5} /> : <Laptop aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.5} />}
              <span className="min-w-0 truncate sm:max-w-48">{user ? `Synced · ${user.email}` : 'Saved on this device'}</span>
            </div>
            {favoriteCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsConfirmDialogOpen(true)}
                className="h-11 rounded-lg px-3 text-sm text-zinc-600 hover:bg-red-50 hover:text-red-700 dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-400">
                <Trash2 aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
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
