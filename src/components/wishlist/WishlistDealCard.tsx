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
  const hasImage = Boolean(item.imageUrl || item.telegramFileId);
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
    <article className="group grid min-w-0 grid-cols-[80px_minmax(0,1fr)] gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:border-gray-900 dark:bg-zinc-950 sm:flex sm:flex-col sm:gap-0 sm:p-6">
      <button
        type="button"
        onClick={() => onViewDetails(item)}
        aria-label={`View details for ${item.title}`}
        className={`overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:h-40 ${hasImage
          ? 'bg-transparent sm:w-fit sm:max-w-full sm:self-center dark:bg-transparent'
          : 'bg-gray-50 dark:bg-zinc-900 sm:w-full'}`}>
        <DealImage
          title={item.title}
          category={item.category}
          imageUrl={item.imageUrl}
          telegramFileId={item.telegramFileId}
          className={`h-full min-h-28 max-w-full object-contain sm:min-h-0 ${hasImage ? 'w-full sm:w-auto' : 'w-full p-1.5'}`}
          fallbackClassName="min-w-0 border-0"
        />
      </button>

      <div className="flex min-w-0 flex-col sm:pt-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="max-w-full truncate font-medium text-gray-600 dark:text-gray-400">{category}</span>
          <span className="time-badge ms-auto inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[10px]"><CalendarDays className="h-3 w-3" /> {formatDate(item.timestamp)}</span>
        </div>

        <button
          type="button"
          onClick={() => onViewDetails(item)}
          className="mt-2 line-clamp-3 rounded-sm text-left text-base font-semibold leading-tight text-high-contrast transition-colors hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:text-gray-300 sm:min-h-11 sm:line-clamp-2 sm:text-lg">
          {item.title}
        </button>

        <div className="mt-auto flex items-center gap-1 pt-2 sm:pt-3">
          {item.id && (
            <button
              type="button"
              onClick={() => onCreateAlert(item)}
              className={`inline-flex h-10 items-center gap-1.5 rounded-full px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${hasActiveAlert
                ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
                : 'text-violet-600 hover:bg-gray-100 dark:text-violet-400 dark:hover:bg-gray-800'}`}
              aria-pressed={hasActiveAlert}
              aria-label={hasActiveAlert ? 'Deal alert is active' : 'Create deal alert'}>
              <Bell className={`h-3.5 w-3.5 ${hasActiveAlert ? 'fill-current' : ''}`} />
              {hasActiveAlert ? 'Alert on' : 'Alert'}
            </button>
          )}
          <button type="button" onClick={() => onShare(item)} className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-0 bg-transparent p-0 text-blue-500 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-400 dark:hover:bg-gray-800" aria-label="Share deal">
            <Share2 aria-hidden="true" className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onRemove(item.title)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-400 dark:hover:bg-red-950/30 dark:hover:text-red-400" aria-label="Remove from wishlist">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="col-span-2 mt-auto grid grid-cols-2 gap-2 pt-3 sm:mt-3">
        {item.id ? (
          <Button asChild variant="dealOutline" className="h-11 px-2 text-xs">
            <a href={`/deal/${item.id}`} onClick={(event) => {
              if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
              event.preventDefault();
              onViewFullPage(item);
            }}>
              <Eye aria-hidden="true" /> View deal
            </a>
          </Button>
        ) : <div />}
        {primaryLink ? (
          <Button asChild variant="dealPrimary" className="h-11 px-2 text-xs">
            <a href={primaryLink} target="_blank" rel="noopener noreferrer" onClick={handleBuy}>
              Buy now <ExternalLink aria-hidden="true" />
            </a>
          </Button>
        ) : <div />}
      </div>
    </article>
  );
});

export default WishlistDealCard;
