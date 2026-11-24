import { ArrowRight, BellRing, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const WishlistEmptyState = () => (
  <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-8">
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900">
      <Heart aria-hidden="true" strokeWidth={1.5} className="h-6 w-6 text-zinc-500 dark:text-zinc-400" />
    </div>
    <div>
      <h3 className="text-lg font-medium tracking-normal text-zinc-950 dark:text-zinc-100">Your wishlist is ready for its first deal</h3>
      <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        Tap the heart on any deal to save it here, then set an alert for the price you want
      </p>
      <div className="mt-2 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 sm:hidden">
        <BellRing aria-hidden="true" strokeWidth={1.5} className="h-4 w-4 text-zinc-500 dark:text-zinc-400" /> Alerts stay alongside saved deals
      </div>
    </div>
    <Button asChild className="h-11 rounded-lg bg-blue-700 px-5 text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500">
      <Link to="/deals">Browse deals <ArrowRight aria-hidden="true" strokeWidth={1.5} className="h-4 w-4" /></Link>
    </Button>
  </div>
);

export default WishlistEmptyState;
