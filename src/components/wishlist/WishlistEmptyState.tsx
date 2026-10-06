import { ArrowRight, BellRing, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const WishlistEmptyState = () => (
  <div className="grid gap-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50/60 p-5 dark:border-gray-800 dark:bg-zinc-950/60 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-6">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/30">
      <Heart className="h-5 w-5 text-rose-500" />
    </div>
    <div>
      <h3 className="font-semibold text-gray-950 dark:text-white">Your wishlist is ready for its first deal</h3>
      <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
        Tap the heart on any deal to save it here. You can add a price alert later with one click.
      </p>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 sm:hidden">
        <BellRing className="h-3.5 w-3.5 text-violet-500" /> Alerts stay alongside saved deals.
      </div>
    </div>
    <Button asChild className="h-10 rounded-full px-5">
      <Link to="/deals">Browse deals <ArrowRight className="ml-2 h-4 w-4" /></Link>
    </Button>
  </div>
);

export default WishlistEmptyState;
