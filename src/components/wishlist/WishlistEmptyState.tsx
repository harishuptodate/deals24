import { ArrowRight, BellRing, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const WishlistEmptyState = () => (
  <div className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:border-gray-900 dark:bg-zinc-950 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-6">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/30">
      <Heart className="h-5 w-5 text-rose-500" />
    </div>
    <div>
      <h3 className="font-semibold text-gray-950 dark:text-white">Your wishlist is ready for its first deal</h3>
      <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
        Tap the heart on any deal to save it here. You can add a price alert later with one click.
      </p>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 sm:hidden">
        <BellRing className="h-3.5 w-3.5 text-violet-500" /> Alerts stay alongside saved deals.
      </div>
    </div>
    <Button asChild className="h-11 rounded-full bg-gradient-to-b from-apple-darkGray to-indigo-950 px-5 text-white hover:shadow-lg hover:shadow-apple-darkGray/20">
      <Link to="/deals">Browse deals <ArrowRight className="ml-2 h-4 w-4" /></Link>
    </Button>
  </div>
);

export default WishlistEmptyState;
