import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as UiCalendar } from '@/components/ui/calendar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from '@/components/ui/input';

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

  const previousMonth = useMemo(() => {
    const d = new Date(today);
    d.setMonth(d.getMonth() - 1);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [today]);

  const fromDateParsed = useMemo(() => parseDateParam(fromParam), [fromParam]);
  const toDateParsed = useMemo(() => parseDateParam(toParam), [toParam]);

  const isFromFuture = !!fromDateParsed && fromDateParsed > today;
  const isToFuture = !!toDateParsed && toDateParsed > today;

  // If URL contains a future date, we treat it as invalid (not selected) and clean it up.
  const fromDate = isFromFuture ? null : fromDateParsed;
  const toDate = isToFuture ? null : toDateParsed;

  const [futureError, setFutureError] = useState<string | null>(null);
  const [fromDraft, setFromDraft] = useState('');
  const [toDraft, setToDraft] = useState('');
  const [fromDraftError, setFromDraftError] = useState<string | null>(null);
  const [toDraftError, setToDraftError] = useState<string | null>(null);

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
    setFromDraft('');
    setToDraft('');
    setFromDraftError(null);
    setToDraftError(null);
    setOpen(false);
  };

  const updateFrom = (date: Date) => {
    const next = new URLSearchParams(searchParams);
    next.set('from', toDateParam(date));

    // Keep invariant: from must be <= to
    if (toDate && date.getTime() > toDate.getTime()) {
      next.delete('to');
      setToDraft('');
      setToDraftError(null);
    }

    setFromDraft(formatDdMmYy(date));
    setFromDraftError(null);
    setSearchParams(next, { replace: true });
    setFutureError(null);
  };

  const updateTo = (date: Date) => {
    const next = new URLSearchParams(searchParams);
    next.set('to', toDateParam(date));

    // Keep invariant: to must be >= from
    if (fromDate && date.getTime() < fromDate.getTime()) {
      next.delete('from');
      setFromDraft('');
      setFromDraftError(null);
    }

    setToDraft(formatDdMmYy(date));
    setToDraftError(null);
    setSearchParams(next, { replace: true });
    setFutureError(null);
  };

  const pillLabel = (() => {
    if (fromDate && toDate) return `${format(fromDate, 'MMM d')} - ${format(toDate, 'MMM d')}`;
    if (fromDate) return format(fromDate, 'MMM d');
    if (toDate) return format(toDate, 'MMM d');
    return 'Filter';
  })();

  const formatDdMmYy = (date: Date) => {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = String(date.getFullYear() % 100).padStart(2, '0');
    return `${dd}/${mm}/${yy}`;
  };

  useEffect(() => {
    setFromDraft(fromDate ? formatDdMmYy(fromDate) : '');
    setFromDraftError(null);
  }, [fromDate]);

  useEffect(() => {
    setToDraft(toDate ? formatDdMmYy(toDate) : '');
    setToDraftError(null);
  }, [toDate]);

  const parseDdMmYy = (value: string): Date | null => {
    const v = value.trim();
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/.exec(v);
    if (!match) return null;

    const dd = Number(match[1]);
    const mm = Number(match[2]);
    const yy = Number(match[3]);

    const year = 2000 + yy;
    const monthIndex = mm - 1;

    const d = new Date(year, monthIndex, dd);
    if (
      d.getFullYear() !== year ||
      d.getMonth() !== monthIndex ||
      d.getDate() !== dd
    ) {
      return null;
    }

    return d;
  };

  const submitManualFrom = () => {
    const parsed = parseDdMmYy(fromDraft);
    if (!parsed) {
      setFromDraftError('Invalid date. Use DD/MM/YY.');
      return;
    }

    // No future dates (local timezone).
    if (parsed > today) {
      setFromDraftError(null);
      setFutureError('Selected date cannot be in the future.');
      return;
    }

    updateFrom(parsed);
    setFromDraftError(null);
    setFutureError(null);

    // Advance flow so user picks To next.
    setStep('to');
  };

  const submitManualTo = () => {
    const parsed = parseDdMmYy(toDraft);
    if (!parsed) {
      setToDraftError('Invalid date. Use DD/MM/YY.');
      return;
    }

    // No future dates (local timezone).
    if (parsed > today) {
      setToDraftError(null);
      setFutureError('Selected date cannot be in the future.');
      return;
    }

    updateTo(parsed);
    setToDraftError(null);
    setFutureError(null);

    setOpen(false);
  };

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
            <CalendarIcon size={14} className="mx-auto opacity-80" />
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
          {!isMobile ? (
            <div className="px-1 pb-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    From
                  </p>
                  <div className="mt-2">
                    <Input
                      value={fromDraft}
                      onChange={(e) => {
                        setFromDraft(e.target.value);
                        setFromDraftError(null);
                        setFutureError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitManualFrom();
                      }}
                      placeholder="DD/MM/YY"
                      inputMode="numeric"
                      className="h-9 text-xs"
                    />
                    {fromDraftError && (
                      <p className="text-xs text-red-500 mt-1">
                        {fromDraftError}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    To
                  </p>
                  <div className="mt-2">
                    <Input
                      value={toDraft}
                      onChange={(e) => {
                        setToDraft(e.target.value);
                        setToDraftError(null);
                        setFutureError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitManualTo();
                      }}
                      placeholder="DD/MM/YY"
                      inputMode="numeric"
                      className="h-9 text-xs"
                    />
                    {toDraftError && (
                      <p className="text-xs text-red-500 mt-1">
                        {toDraftError}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-1 pb-2">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                {step === 'from' ? 'From' : 'To'}
              </p>

              <div className="mt-2">
                <Input
                  value={step === 'from' ? fromDraft : toDraft}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (step === 'from') {
                      setFromDraft(v);
                      setFromDraftError(null);
                    } else {
                      setToDraft(v);
                      setToDraftError(null);
                    }
                    setFutureError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    if (step === 'from') submitManualFrom();
                    else submitManualTo();
                  }}
                  placeholder="DD/MM/YY"
                  inputMode="numeric"
                  className="h-9 text-xs"
                />
                {step === 'from' ? (
                  fromDraftError && (
                    <p className="text-xs text-red-500 mt-1">{fromDraftError}</p>
                  )
                ) : (
                  toDraftError && (
                    <p className="text-xs text-red-500 mt-1">{toDraftError}</p>
                  )
                )}
              </div>
            </div>
          )}

          {futureError && (
            <p className="text-xs text-red-500 mb-2 px-1">{futureError}</p>
          )}

          <UiCalendar
            numberOfMonths={isMobile ? 1 : 2}
            defaultMonth={previousMonth}
            toDate={today}
            showOutsideDays={false}
            mode="single"
            selected={
              step === 'from'
                ? fromDate ?? undefined
                : (toDate ?? fromDate ?? undefined)
            }
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
            className={isMobile ? 'p-1' : undefined}
            classNames={
              isMobile
                ? {
                    months: 'flex flex-col space-y-2 sm:flex-row sm:space-x-4 sm:space-y-0',
                    month: 'space-y-2',
                    head_cell:
                      'text-muted-foreground rounded-md w-7 font-normal text-[0.7rem]',
                    cell: 'h-7 w-7 text-center text-sm p-0 relative',
                    day: 'h-7 w-7 p-0 font-normal text-sm',
                    nav_button: 'h-6 w-6 bg-transparent p-0 opacity-60 hover:opacity-100',
                  }
                : undefined
            }
            onSelect={(date) => {
              if (!date) return;

              if (step === 'from') {
                updateFrom(date);

                setStep('to');
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

