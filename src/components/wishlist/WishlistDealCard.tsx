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
    <article className="group grid min-w-0 grid-cols-[104px_minmax(0,1fr)] gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md dark:border-gray-800 dark:bg-zinc-950 dark:hover:border-violet-900 sm:flex sm:flex-col sm:gap-0">
      <button
        type="button"
        onClick={() => onViewDetails(item)}
        className={`overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 sm:h-36 ${hasImage
          ? 'bg-transparent sm:w-fit sm:max-w-full sm:self-center dark:bg-transparent'
          : 'bg-gray-50 dark:bg-zinc-900 sm:w-full'}`}>
        <DealImage
          title={item.title}
          category={item.category}
          imageUrl={item.imageUrl}
          telegramFileId={item.telegramFileId}
          className={`h-full min-h-32 max-w-full object-contain sm:min-h-0 ${hasImage ? 'w-full sm:w-auto' : 'w-full p-1.5'}`}
          fallbackClassName="min-w-32 border-0"
        />
      </button>

      <div className="flex min-w-0 flex-col sm:pt-3">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="max-w-[56%] truncate rounded-full bg-violet-50 px-2 py-1 font-medium text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">{category}</span>
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-amber-700 dark:text-amber-300"><CalendarDays className="h-3 w-3" /> {formatDate(item.timestamp)}</span>
        </div>

        <button
          type="button"
          onClick={() => onViewDetails(item)}
          className="mt-2 line-clamp-3 text-left text-sm font-semibold leading-5 text-gray-950 transition-colors hover:text-violet-700 focus-visible:outline-none focus-visible:underline dark:text-white dark:hover:text-violet-300 sm:min-h-10 sm:line-clamp-2">
          {item.title}
        </button>

        <div className="mt-auto flex items-center gap-1 pt-2 sm:pt-3">
          {item.id && (
            <button
              type="button"
              onClick={() => onCreateAlert(item)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium transition-colors ${hasActiveAlert
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300'
                : 'bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-950/35 dark:text-violet-300 dark:hover:bg-violet-950/60'}`}
              aria-label={hasActiveAlert ? 'Deal alert is active' : 'Create deal alert'}>
              <Bell className={`h-3.5 w-3.5 ${hasActiveAlert ? 'fill-current' : ''}`} />
              {hasActiveAlert ? 'Alert on' : 'Alert'}
            </button>
          )}
          <button type="button" onClick={() => onShare(item)} className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 hover:text-sky-700 dark:bg-sky-950/35 dark:text-sky-300 dark:hover:bg-sky-950/60" aria-label="Share deal">
            <Share2 className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => onRemove(item.title)} className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:bg-rose-950/35 dark:text-rose-300 dark:hover:bg-rose-950/60" aria-label="Remove from wishlist">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="col-span-2 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3 dark:border-gray-900 sm:mt-3">
        {item.id ? (
          <Button type="button" variant="outline" size="sm" onClick={() => onViewFullPage(item)} className="h-9 rounded-full border-sky-200 bg-sky-50 text-xs text-sky-700 hover:bg-sky-100 hover:text-sky-800 dark:border-sky-900/70 dark:bg-sky-950/35 dark:text-sky-300 dark:hover:bg-sky-950/60">
            <Eye className="mr-1.5 h-3.5 w-3.5" /> View deal
          </Button>
        ) : <div />}
        {primaryLink ? (
          <Button asChild size="sm" className="h-9 rounded-full text-xs">
            <a href={primaryLink} target="_blank" rel="noopener noreferrer" onClick={handleBuy}>
              Buy now <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </a>
          </Button>
        ) : <div />}
      </div>
    </article>
  );
});

export default WishlistDealCard;
