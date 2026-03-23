import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as UiCalendar } from '@/components/ui/calendar';
import { useIsMobile } from '@/hooks/use-mobile';

const toDateParam = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateParam = (value: string | null): Date | null => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);

  const d = new Date(year, monthIndex, day);
  // Guard against invalid dates like 2026-02-31
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== monthIndex ||
    d.getDate() !== day
  ) {
    return null;
  }

  return d;
};

const DateRangeFilter = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');

  const isMobile = useIsMobile();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const fromDateParsed = useMemo(() => parseDateParam(fromParam), [fromParam]);
  const toDateParsed = useMemo(() => parseDateParam(toParam), [toParam]);

  const isFromFuture = !!fromDateParsed && fromDateParsed > today;
  const isToFuture = !!toDateParsed && toDateParsed > today;

  // If URL contains a future date, we treat it as invalid (not selected) and clean it up.
  const fromDate = isFromFuture ? null : fromDateParsed;
  const toDate = isToFuture ? null : toDateParsed;

  const [futureError, setFutureError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFromFuture && !isToFuture) return;

    setFutureError('Selected date cannot be in the future.');

    const next = new URLSearchParams(searchParams);
    if (isFromFuture) next.delete('from');
    if (isToFuture) next.delete('to');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFromFuture, isToFuture]);

  type Step = 'from' | 'to';
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('from');

  const hasAny = !!fromParam || !!toParam;

  const getInitialStep = (): Step => {
    if (isMobile) return 'from';
    if (!fromDate) return 'from';
    if (!toDate) return 'to';
    return 'from';
  };

  // Auto-fix invalid URL state: if `from` > `to`, clear `to`.
  useEffect(() => {
    if (!fromDate || !toDate) return;
    if (fromDate.getTime() <= toDate.getTime()) return;

    const next = new URLSearchParams(searchParams);
    next.delete('to');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  const clearDates = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('from');
    next.delete('to');
    setSearchParams(next, { replace: true });
    setFutureError(null);
    setOpen(false);
  };

  const updateFrom = (date: Date) => {
    const next = new URLSearchParams(searchParams);
    next.set('from', toDateParam(date));

    // Keep invariant: from must be <= to
    if (toDate && date.getTime() > toDate.getTime()) {
      next.delete('to');
    }

    setSearchParams(next, { replace: true });
    setFutureError(null);
  };

  const updateTo = (date: Date) => {
    const next = new URLSearchParams(searchParams);
    next.set('to', toDateParam(date));

    // Keep invariant: to must be >= from
    if (fromDate && date.getTime() < fromDate.getTime()) {
      next.delete('from');
    }

    setSearchParams(next, { replace: true });
    setFutureError(null);
  };

  const pillLabel = (() => {
    if (fromDate && toDate) return `${format(fromDate, 'MMM d')} - ${format(toDate, 'MMM d')}`;
    if (fromDate) return format(fromDate, 'MMM d');
    if (toDate) return format(toDate, 'MMM d');
    return 'Filter';
  })();

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (!open) setStep(getInitialStep());
            }}
            className="rounded-full h-8 px-3 py-0.5 text-xs dark:border-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
            <CalendarIcon size={14} className="mr-2 opacity-80" />

            <span className="max-w-[180px] truncate">{pillLabel}</span>

            {hasAny && (
              <span
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  clearDates();
                }}
                role="button"
                tabIndex={0}
                aria-label="Clear date range"
                className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600">
                <X size={14} />
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className="w-auto p-2 rounded-xl dark:bg-apple-darkGray dark:border-gray-700">
          {futureError && (
            <p className="text-xs text-red-500 mb-2 px-1">{futureError}</p>
          )}

          <UiCalendar
            mode="single"
            selected={step === 'from' ? fromDate ?? undefined : toDate ?? undefined}
            disabled={(date) => {
              // Never allow future dates (local timezone).
              if (date > today) return true;

              if (step === 'from') {
                // When To exists, From must be <= To.
                return toDate ? date > toDate : false;
              }

              // step === 'to'
              // When From exists, To must be >= From.
              return fromDate ? date < fromDate : false;
            }}
            onSelect={(date) => {
              if (!date) return;

              if (step === 'from') {
                updateFrom(date);

                if (isMobile) {
                  setStep('to');
                } else {
                  // Desktop UX: close/reopen so it feels like two steps.
                  setStep('to');
                  setOpen(false);
                  window.requestAnimationFrame(() => setOpen(true));
                }
                return;
              }

              // step === 'to'
              updateTo(date);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DateRangeFilter;

