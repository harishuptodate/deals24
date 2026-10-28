import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';
import { Search, Loader2, ArrowUpRight, Clock, X } from 'lucide-react';
import DealImage from '@/components/images/DealImage';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { getPopularSearches, getSearchPreview, recordSearchSelection } from '@/services/api/searchApi';

const RECENT_KEY = 'deals24:recent-searches';
const DEFAULT_POPULAR = ['AC', 'TV', 'TWS', 'iPhone', 'Gaming Laptop', 'Refrigerator'];
const FILTER_KEYS = ['category', 'from', 'to', 'minPrice', 'maxPrice'];

function readRecent(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string').slice(0, 6) : [];
  } catch { return []; }
}

export default function DealSearch() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const params = new URLSearchParams(location.search);
  const urlQuery = params.get('search') || '';
  const [draft, setDraft] = useState(urlQuery);
  const [debounced, setDebounced] = useState(urlQuery);
  const [open, setOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const [recent, setRecent] = useState(readRecent);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const normalized = draft.normalize('NFKC').replace(/\s+/gu, ' ').trim().slice(0, 100);
  const filterParams = new URLSearchParams();
  FILTER_KEYS.forEach((key) => { if (params.has(key)) filterParams.set(key, params.get(key)!); });
  const filters = filterParams.toString();

  useEffect(() => { setDraft(urlQuery); }, [urlQuery]);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(normalized), 350); // was 275
    return () => clearTimeout(timer);
  }, [normalized]);
  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setOpen(true); inputRef.current?.focus();
      }
    };
    const onOutside = (event: PointerEvent) => {
      if (!isMobile && rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onShortcut);
    document.addEventListener('pointerdown', onOutside);
    return () => {
      window.removeEventListener('keydown', onShortcut);
      document.removeEventListener('pointerdown', onOutside);
    };
  }, [isMobile]);

  const popular = useQuery({
    queryKey: ['search-popular'], queryFn: ({ signal }) => getPopularSearches(signal),
    enabled: open, staleTime: 60_000, retry: false,
  });
  const preview = useQuery({
    queryKey: ['search-preview', normalized, filters],
    queryFn: ({ signal }) => getSearchPreview(normalized, filters, signal),
    enabled: open && !composing && normalized.length >= 2 && normalized === debounced,
    staleTime: 30_000, gcTime: 120_000, retry: false,
  });

  useEffect(() => {
    if (!open || composing || location.pathname !== '/deals' || normalized === urlQuery.trim()) return;
    if (normalized.length === 1) return;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(location.search);
      if (normalized) next.set('search', normalized); else next.delete('search');
      navigate(`/deals?${next.toString()}`, { replace: true, preventScrollReset: true });
    }, 500); // was 350
    return () => clearTimeout(timer);
  }, [open, composing, location.pathname, location.search, normalized, urlQuery, navigate]);

  const remember = (query: string) => {
    const next = [query, ...recent.filter((item) => item.toLowerCase() !== query.toLowerCase())].slice(0, 6);
    setRecent(next);
    recordSearchSelection(query);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { return; }
  };
  const commit = (query = normalized, category?: string, maxPrice?: string) => {
    if (!query && !category) return;
    const next = new URLSearchParams(filters);
    if (params.get('sort')) next.set('sort', params.get('sort')!);
    if (query) next.set('search', query); else next.delete('search');
    if (category) next.set('category', category);
    if (maxPrice) next.set('maxPrice', maxPrice);
    if (query) remember(query);
    setOpen(false); setActive(-1);
    navigate(`/deals?${next.toString()}`);
  };

  type Option = { label: string; kind: string; action: () => void; price?: number | null; image?: string | null; telegramFileId?: string | null; date?: string | null };
  const options: Option[] = [];
  if (normalized.length < 2) {
    for (const term of recent.filter((value) => value.toLowerCase().includes(normalized.toLowerCase()))) {
      options.push({ label: term, kind: 'Recent searches', action: () => commit(term) });
    }
    for (const term of (popular.data || DEFAULT_POPULAR).filter((value) => value.toLowerCase().includes(normalized.toLowerCase()))) {
      options.push({ label: term, kind: 'Popular searches', action: () => commit(term) });
    }
  } else if (preview.data) {
    for (const deal of preview.data.deals) options.push({
      label: deal.title, kind: 'Deals', price: deal.price, image: deal.imageUrl, telegramFileId: deal.telegramFileId, date: deal.date,
      action: () => { remember(normalized); setOpen(false); navigate(`/deal/${deal.id}`); },
    });
    for (const product of preview.data.products) options.push({ label: product.label, kind: 'Products', action: () => commit(product.query) });
    for (const category of preview.data.categories) options.push({ label: category.label, kind: 'Categories', action: () => commit(normalized, category.category) });
    const prices = preview.data.deals.map((deal) => deal.price).filter((price): price is number => price != null && price > 0);
    if (prices.length && !params.has('maxPrice')) {
      const budget = Math.ceil(Math.min(...prices) / 1000) * 1000;
      options.push({ label: `${normalized} under ₹${budget.toLocaleString('en-IN')}`, kind: 'Refine your search', action: () => commit(normalized, undefined, String(budget)) });
    }
    if (!preview.data.deals.length) {
      for (const term of (popular.data || DEFAULT_POPULAR).slice(0, 3)) options.push({ label: term, kind: 'Explore other deals', action: () => commit(term) });
    }
  }
  const optionSignature = options.map((option) => `${option.kind}:${option.label}`).join('|');
  useEffect(() => { setActive(-1); }, [optionSignature]);
  useEffect(() => {
    if (active >= 0) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, listId]);

  const input = (
    <form onSubmit={(event) => { event.preventDefault(); if (!composing) { if (active >= 0 && options[active]) options[active].action(); else commit(); } }} className="relative">
      <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
      <Input ref={inputRef} role="combobox" aria-label="Search Deals24" aria-expanded={open}
        aria-controls={open ? listId : undefined} aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off" maxLength={100} value={draft}
        placeholder={isMobile ? 'Search products or deals' : 'Search deals…  Ctrl K'}
        className="h-10 rounded-full border-0 pl-9 pr-20 text-base sm:text-sm"
        onFocus={() => setOpen(true)} onChange={(event) => { setDraft(event.target.value); setOpen(true); setActive(-1); }}
        onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)}
        onKeyDown={(event) => {
          if (composing) return;
          if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); setOpen(true);
            setActive((current) => options.length ? (current + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length : -1);
          }
        }} />
      {draft && <button type="button" aria-label="Clear search" onClick={() => { setDraft(''); inputRef.current?.focus(); }} className="absolute right-11 top-2.5"><X className="h-5 w-5 text-muted-foreground" /></button>}
      <button type="submit" aria-label="Search" className="absolute right-2 top-1.5 rounded-full bg-violet-100 p-1.5 text-violet-700 dark:bg-violet-950 dark:text-violet-200"><ArrowUpRight className="h-4 w-4" /></button>
    </form>
  );

  const compactSuggestions = !isMobile && normalized.length < 2;
  const content = (
    <div className={compactSuggestions ? 'max-h-72 overflow-y-auto p-3' : 'max-h-[65dvh] overflow-y-auto p-2 sm:max-h-[min(70vh,560px)]'}>
      <div role="status" aria-live="polite" className="px-2 text-xs text-muted-foreground">
        {normalized.length >= 2 && (preview.isFetching || normalized !== debounced) ? <span className="flex items-center gap-2 py-3"><Loader2 className="h-4 w-4 animate-spin" />Finding deals…</span> : null}
        {preview.isError && normalized.length >= 2 ? <p className="py-3">Previews unavailable. Press Enter to search all deals.</p> : null}
        {preview.isSuccess && normalized.length >= 2 && preview.data.deals.length === 0 ? <p className="py-3">No close deal matches. Try a brand or product family below, or adjust your filters.</p> : null}
      </div>
      <div id={listId} role="listbox" aria-label="Search suggestions" className={compactSuggestions ? 'flex flex-wrap gap-2' : undefined}>
        {options.map((option, index) => (
          <div key={`${option.kind}:${option.label}:${index}`} className={compactSuggestions ? 'contents' : undefined}>
            {(index === 0 || options[index - 1].kind !== option.kind) && <p className={compactSuggestions ? `w-full text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${index > 0 ? 'mt-2' : ''}` : 'px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'}>{option.kind}</p>}
            <button id={`${listId}-${index}`} type="button" role="option" aria-selected={active === index}
              onMouseDown={(event) => event.preventDefault()} onClick={option.action}
              className={`flex items-center text-left hover:bg-violet-50 dark:hover:bg-violet-950/40 ${compactSuggestions ? 'min-h-8 max-w-full gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs' : 'min-h-11 w-full gap-3 rounded-xl px-3 py-2 text-sm'} ${active === index ? 'bg-violet-50 dark:bg-violet-950/40' : ''}`}>
              {option.kind === 'Deals' ? <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted"><DealImage title={option.label} imageUrl={option.image || undefined} telegramFileId={option.telegramFileId || undefined} className="h-full w-full rounded-lg object-contain" fallbackClassName="[&>svg]:h-5 [&>svg]:w-5" /></div> : option.kind === 'Recent searches' ? <Clock className="h-4 w-4 shrink-0 text-muted-foreground" /> : <Search className="h-4 w-4 shrink-0 text-muted-foreground" />}
              <span className="min-w-0 flex-1"><span className="line-clamp-2 font-medium">{option.label}</span>
                {option.kind === 'Deals' && <span className="mt-1 block text-xs text-muted-foreground">{option.price != null ? `₹${option.price.toLocaleString('en-IN')}` : 'Price unavailable'}{option.date && Number.isFinite(Date.parse(option.date)) ? ` · Seen ${formatDistanceToNowStrict(new Date(option.date), { addSuffix: true })}` : ''}</span>}
              </span>{!compactSuggestions && <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
            </button>
          </div>
        ))}
      </div>
      {normalized.length >= 2 && <Button type="button" variant="ghost" onClick={() => commit()} className="mt-2 w-full justify-between rounded-xl text-violet-700 dark:text-violet-300">Search all deals for “{normalized}”<ArrowUpRight className="ml-2 h-4 w-4 shrink-0" /></Button>}
      {normalized.length < 2 && recent.length > 0 && <button type="button" onClick={() => { setRecent([]); try { localStorage.removeItem(RECENT_KEY); } catch { return; } }} className="px-3 py-3 text-xs text-muted-foreground underline">Clear recent searches</button>}
    </div>
  );

  return (
    <div ref={rootRef} className="relative min-w-0 w-0 flex-1 mx-1 max-w-xl sm:mx-4">
      {isMobile ? <>
        <button type="button" onClick={() => setOpen(true)} className="flex h-9 w-full items-center gap-2 rounded-full bg-background px-3 text-left text-xs text-muted-foreground"><Search className="h-4 w-4 shrink-0" /><span className="truncate">{draft || 'Search deals'}</span></button>
        <Sheet open={open} onOpenChange={setOpen}><SheetContent side="top" className="h-[100dvh] w-full p-4 pt-12" onOpenAutoFocus={(event) => { event.preventDefault(); inputRef.current?.focus(); }}>
          <SheetTitle className="sr-only">Search Deals24</SheetTitle><SheetDescription className="sr-only">Find products, compare recent deals, or browse a category.</SheetDescription>
          {input}{content}
        </SheetContent></Sheet>
      </> : <>{input}{open && <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl bg-popover text-popover-foreground shadow-xl">{content}</div>}</>}
    </div>
  );
}
