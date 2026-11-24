import { memo } from 'react';
import { Bell, CalendarDays, ExternalLink, Eye, Share2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DealImage from '../images/DealImage';
import { handleTrackedLinkClick } from '../../services/api';
import { extractFirstLink, extractSecondLink } from '../deal/utils/linkUtils';
import type { FavoriteItem } from '@/services/api/wishlistApi';

interface WishlistDealCardProps {
  item: FavoriteItem;
  onRemove: (title: string) => void;
  onViewDetails: (item: FavoriteItem) => void;
  onViewFullPage: (item: FavoriteItem) => void;
  onShare: (item: FavoriteItem) => void;
  onCreateAlert: (item: FavoriteItem) => void;
  hasActiveAlert: boolean;
  formatDate: (dateString: string) => string;
}

const WishlistDealCard = memo(({
  item,
  onRemove,
  onViewDetails,
  onViewFullPage,
  onShare,
  onCreateAlert,
  hasActiveAlert,
  formatDate,
}: WishlistDealCardProps) => {
  const primaryLink = item.link || extractSecondLink(item.description) || extractFirstLink(item.description);
  const category = item.category
    ? item.category.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : 'Saved deal';

  const handleBuy = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!primaryLink) return;
    void handleTrackedLinkClick(primaryLink, item.id, event.nativeEvent);
    if (!event.ctrlKey && !event.metaKey && event.button !== 1) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <article className="group grid min-w-0 grid-cols-[80px_minmax(0,1fr)] gap-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:flex sm:flex-col sm:gap-0 sm:p-5">
      <button
        type="button"
        onClick={() => onViewDetails(item)}
        aria-label={`View details for ${item.title}`}
        className="flex h-28 items-center justify-center overflow-hidden rounded-lg bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-zinc-900 sm:h-44 sm:w-full">
        <DealImage
          title={item.title}
          category={item.category}
          imageUrl={item.imageUrl}
          telegramFileId={item.telegramFileId}
          className="h-full w-full max-w-full object-contain p-2 sm:p-4"
          fallbackClassName="min-w-0 border-0"
        />
      </button>

      <div className="flex min-w-0 flex-1 flex-col sm:pt-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-4">
          <span className="max-w-full truncate font-medium text-zinc-600 dark:text-zinc-400">{category}</span>
          <span className="inline-flex items-center gap-1 tabular-nums text-zinc-500 dark:text-zinc-400"><CalendarDays aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} /> {formatDate(item.timestamp)}</span>
        </div>

        <button
          type="button"
          onClick={() => onViewDetails(item)}
          className="mt-2 line-clamp-3 rounded text-left text-sm font-medium leading-6 text-zinc-950 transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-zinc-100 dark:hover:text-blue-400 sm:min-h-12 sm:line-clamp-2 sm:text-base">
          {item.title}
        </button>
      </div>

      <div className="col-span-2 flex items-center gap-2 sm:mt-auto sm:pt-3">
        {item.id && (
          <button
            type="button"
            onClick={() => onCreateAlert(item)}
            className={`inline-flex h-11 items-center gap-2 rounded-lg px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${hasActiveAlert
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
              : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'}`}
            aria-pressed={hasActiveAlert}
            aria-label={hasActiveAlert ? 'Deal alert is active' : 'Create deal alert'}>
            <Bell strokeWidth={1.5} className={`h-4 w-4 ${hasActiveAlert ? 'fill-current' : ''}`} />
            {hasActiveAlert ? 'Alert on' : 'Alert'}
          </button>
        )}
        <button type="button" onClick={() => onShare(item)} className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent p-0 text-zinc-500 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-zinc-400 dark:hover:bg-zinc-800" aria-label="Share deal">
          <Share2 strokeWidth={1.5} aria-hidden="true" className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => onRemove(item.title)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-400" aria-label="Remove from wishlist">
          <Trash2 strokeWidth={1.5} className="h-4 w-4" />
        </button>
      </div>

      <div className="col-span-2 mt-auto grid grid-cols-2 gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800 sm:mt-4">
        {item.id ? (
          <Button asChild variant="outline" className="h-11 rounded-lg border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950">
            <a href={`/deal/${item.id}`} onClick={(event) => {
              if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
              event.preventDefault();
              onViewFullPage(item);
            }}>
              <Eye strokeWidth={1.5} aria-hidden="true" /> View deal
            </a>
          </Button>
        ) : <div />}
        {primaryLink ? (
          <Button asChild className="h-11 rounded-lg bg-blue-700 px-3 text-sm text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500">
            <a href={primaryLink} target="_blank" rel="noopener noreferrer" onClick={handleBuy}>
              Buy now <ExternalLink strokeWidth={1.5} aria-hidden="true" />
            </a>
          </Button>
        ) : <div />}
      </div>
    </article>
  );
});

export default WishlistDealCard;
