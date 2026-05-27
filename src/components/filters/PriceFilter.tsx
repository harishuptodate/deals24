import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IndianRupee, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';

const parsePriceParam = (value: string | null): number | null => {
  if (!value) return null;
  if (!/^\d+$/.test(value)) return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
};

const PriceFilter = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();

  const minParam = searchParams.get('minPrice');
  const maxParam = searchParams.get('maxPrice');
  const sortParam = searchParams.get('sort');

  const minPrice = useMemo(() => parsePriceParam(minParam), [minParam]);
  const maxPrice = useMemo(() => parsePriceParam(maxParam), [maxParam]);

  const [open, setOpen] = useState(false);
  const [minDraft, setMinDraft] = useState('');
  const [maxDraft, setMaxDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const hasAny = !!minParam || !!maxParam;
  const isPriceSort = sortParam === 'price_asc' || sortParam === 'price_desc';

  useEffect(() => {
    setMinDraft(minPrice !== null ? String(minPrice) : '');
  }, [minPrice]);

  useEffect(() => {
    setMaxDraft(maxPrice !== null ? String(maxPrice) : '');
  }, [maxPrice]);

  useEffect(() => {
    if (minPrice === null || maxPrice === null) return;
    if (minPrice <= maxPrice) return;

    const next = new URLSearchParams(searchParams);
    next.delete('maxPrice');
    setSearchParams(next, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minPrice, maxPrice]);

  const applyPriceRange = () => {
    const minTrimmed = minDraft.trim();
    const maxTrimmed = maxDraft.trim();

    if (minTrimmed && !/^\d+$/.test(minTrimmed)) {
      setError('Min must be a whole number.');
      return;
    }

    if (maxTrimmed && !/^\d+$/.test(maxTrimmed)) {
      setError('Max must be a whole number.');
      return;
    }

    const minNum = minTrimmed ? Number(minTrimmed) : null;
    const maxNum = maxTrimmed ? Number(maxTrimmed) : null;

    if ((minNum !== null && minNum < 0) || (maxNum !== null && maxNum < 0)) {
      setError('Price cannot be negative.');
      return;
    }

    if (minNum !== null && maxNum !== null && minNum > maxNum) {
      setError('Min cannot be greater than Max.');
      return;
    }

    const next = new URLSearchParams(searchParams);

    if (minNum === null) next.delete('minPrice');
    else next.set('minPrice', String(minNum));

    if (maxNum === null) next.delete('maxPrice');
    else next.set('maxPrice', String(maxNum));

    setSearchParams(next, { replace: true });
    setError(null);
    setOpen(false);
  };

  const clearPriceRange = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('minPrice');
    next.delete('maxPrice');
    setSearchParams(next, { replace: true });
    setMinDraft('');
    setMaxDraft('');
    setError(null);
    setOpen(false);
  };

  const setPriceSort = (mode: 'price_asc' | 'price_desc') => {
    const next = new URLSearchParams(searchParams);
    next.set('sort', mode);
    setSearchParams(next, { replace: true });
  };

  const pillLabel = (() => {
    if (minPrice !== null && maxPrice !== null) {
      return `${minPrice} - ${maxPrice}`;
    }
    if (minPrice !== null) return `>= ${minPrice}`;
    if (maxPrice !== null) return `<= ${maxPrice}`;
    return 'Price';
  })();

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full h-7 sm:h-8 px-2 sm:px-3 py-0.5 text-[12px] sm:text-xs dark:border-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
            <IndianRupee size={12} className="sm:size-[14px] opacity-80 -mr-1 -ml-0.5" />
            <span className="max-w-[120px] sm:max-w-[180px] truncate">{pillLabel}</span>

            {hasAny && (
              <span
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  clearPriceRange();
                }}
                role="button"
                tabIndex={0}
                aria-label="Clear price range"
                className="inline-flex items-center justify-center -mr-1 -ml-0.5 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600">
                <X size={12} className="sm:size-[14px]" />
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          onOpenAutoFocus={(e) => {
            if (isMobile) e.preventDefault();
          }}
          className="w-auto p-2 rounded-xl dark:bg-apple-darkGray dark:border-gray-700">
          <div className="px-1 pb-2">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                Sort By Price
              </p>
              {isPriceSort && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.delete('sort');
                    setSearchParams(next, { replace: true });
                  }}>
                  Clear
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <Button
                type="button"
                variant={sortParam === 'price_asc' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setPriceSort('price_asc')}>
                Low-High
              </Button>
              <Button
                type="button"
                variant={sortParam === 'price_desc' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setPriceSort('price_desc')}>
                High-Low
              </Button>
            </div>

            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
              <div className="mt-1 flex items-center justify-center gap-2">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  From
                </p>
                <Input
                  value={minDraft}
                  onChange={(e) => {
                    setMinDraft(e.target.value.replace(/[^\d]/g, ''));
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyPriceRange();
                  }}
                  placeholder="0"
                  inputMode="numeric"
                  className="h-8 sm:h-9 text-xs w-24 px-2"
                />
              </div>

              <div className="mt-1 flex items-center justify-center gap-2">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  To
                </p>
                <Input
                  value={maxDraft}
                  onChange={(e) => {
                    setMaxDraft(e.target.value.replace(/[^\d]/g, ''));
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyPriceRange();
                  }}
                  placeholder="100000"
                  inputMode="numeric"
                  className="h-8 sm:h-9 text-xs w-24 px-2"
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-500 mt-2 text-center">{error}</p>}

            <div className="mt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={clearPriceRange}>
                Clear
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={applyPriceRange}>
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default PriceFilter;
