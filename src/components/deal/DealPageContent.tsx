import React from 'react';
import { ArrowUpRight, CalendarDays } from 'lucide-react';
import { extractFirstLink, extractSecondLink, truncateLink } from './utils/linkUtils';
import { trackMessageClick } from '../../services/api';
import DealImage from '../images/DealImage';
import PriceHistoryChart from './PriceHistoryChart';

interface DealPageContentProps {
  deal: {
    text: string;
    link?: string;
    category?: string;
    date?: string;
    createdAt?: string;
    imageUrl?: string;
    telegramFileId?: string;
    price?: number | null;
  };
  id?: string;
}

const DealPageContent = ({ deal, id }: DealPageContentProps) => {
  const [title, ...descriptionLines] = (deal.text || '').trim().split('\n');
  const description = descriptionLines.join('\n').trim();
  const buyNowLink = deal.link || extractSecondLink(deal.text || '') || extractFirstLink(deal.text || '');
  const addedAt = new Date(deal.date || deal.createdAt || '');
  const category = deal.category?.split('-').join(' ');
  const hasPrice = typeof deal.price === 'number' && Number.isFinite(deal.price);
  const trackClick = () => { if (id) void trackMessageClick(id); };

  const makeLinksClickable = (text: string) => text.split(/(https?:\/\/[^\s]+)/g).map((part, index) => (
    /^https?:\/\//.test(part) ? (
      <a key={index} href={part} target="_blank" rel="noopener noreferrer" onClick={trackClick}
        className="break-all text-blue-600 underline decoration-blue-200 underline-offset-4 hover:decoration-blue-600 dark:text-blue-400">
        {truncateLink(part)}
      </a>
    ) : <React.Fragment key={index}>{part}</React.Fragment>
  ));

  return (
    <article className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-14 xl:gap-20">
      <div className="min-w-0 lg:sticky lg:top-28">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-3xl border border-zinc-100 bg-[#f7f7f8] p-8 dark:border-zinc-800 dark:bg-zinc-900 sm:p-12">
          <DealImage key={id} title={title || 'Product image'} category={deal.category} imageUrl={deal.imageUrl}
            telegramFileId={deal.telegramFileId} className="h-full w-full rounded-xl object-contain" />
        </div>
        <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">Product image for reference. See retailer for full specifications.</p>
      </div>

      <div className="min-w-0">
        <header>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">{category || 'Discover the deal'}</p>
          <h1 className="break-words text-[1.275rem] font-semibold leading-tight tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-[1.59375rem] xl:text-[1.9125rem]">{title || 'Deal details'}</h1>
          {!Number.isNaN(addedAt.getTime()) && (
            <p className="mt-4 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <CalendarDays size={14} aria-hidden="true" />
              Added {addedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </header>

        <section aria-label="Purchase details" className="my-5 grid grid-cols-1 items-center gap-x-6 gap-y-2 border-y border-zinc-200 py-4 dark:border-zinc-800 sm:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]">
          {hasPrice && (
            <>
              <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400 sm:col-span-2">Deal price</p>
              <p className="flex min-h-12 min-w-0 items-center break-all text-4xl font-semibold leading-none tracking-tight text-zinc-950 dark:text-white">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(deal.price)}
              </p>
            </>
          )}
          {buyNowLink && (
            <a href={buyNowLink} onClick={trackClick} target="_blank" rel="noopener noreferrer"
              className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-zinc-950 px-6 py-3 text-sm font-medium leading-6 text-white transition-colors hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-4 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 ${hasPrice ? 'sm:col-start-2' : 'sm:col-span-2'}`}>
              Buy now <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          )}
        </section>

        <section aria-label="Price history" className="rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800 sm:p-5 lg:[&_.deal-price-label]:text-[11.5px]">
          <div className="overflow-x-auto">
            <div className="w-[125%] sm:w-full">
              <PriceHistoryChart dealId={id} enabled />
            </div>
          </div>
        </section>
        <p className="mt-3 text-xs leading-5 text-zinc-500 dark:text-zinc-400">Confirm the final price and availability on the retailer&apos;s website.</p>

        {description && (
          <section aria-labelledby="deal-description" className="mt-8">
            <h2 id="deal-description" className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">About this deal</h2>
            <div className="mt-4 whitespace-pre-line break-words text-sm leading-7 text-zinc-600 dark:text-zinc-300">{makeLinksClickable(description)}</div>
          </section>
        )}
      </div>
    </article>
  );
};

export default DealPageContent;
