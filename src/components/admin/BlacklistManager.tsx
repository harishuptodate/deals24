import axios from 'axios';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  Plus,
  Shield,
  ShieldX,
  Trash2,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  addBlacklistEntry,
  getBlacklistPolicy,
  removeBlacklistEntry,
  removeBlacklistRule,
  saveBlacklistRule,
  type BlacklistEntry,
  type BlacklistEntryType,
  type BlacklistRule,
  type BlacklistRuleAction,
} from '@/services/api';

type PolicyListProps = {
  type: BlacklistEntryType;
  title: string;
  placeholder: string;
  entries: BlacklistEntry[];
  busyKey: string | null;
  onAdd: (type: BlacklistEntryType, value: string) => Promise<void>;
  onRemove: (entry: BlacklistEntry) => Promise<void>;
};

function PolicyList({
  type,
  title,
  placeholder,
  entries,
  busyKey,
  onAdd,
  onRemove,
}: PolicyListProps) {
  const [value, setValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!value.trim()) return;

    setIsAdding(true);
    try {
      await onAdd(type, value);
      setValue('');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{title}</p>
        <span className="text-xs tabular-nums text-stone-400">{entries.length}</span>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={100}
          placeholder={placeholder}
          aria-label={`Add ${type}`}
          className="h-9 border-stone-200 bg-white shadow-none dark:border-white/10 dark:bg-white/[0.035]"
        />
        <Button
          type="submit"
          size="icon"
          className="h-9 w-9 shrink-0"
          disabled={isAdding || !value.trim()}
          aria-label={`Add ${type}`}
        >
          {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </form>

      <div className="mt-3 max-h-60 min-h-28 space-y-1 overflow-y-auto pr-1">
        {entries.length === 0 ? (
          <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-stone-200 px-4 text-center text-xs leading-5 text-stone-400 dark:border-white/10">
            No {type === 'brand' ? 'brands' : 'product keywords'} yet
          </div>
        ) : entries.map((entry) => (
          <div
            key={entry._id}
            className="group flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm transition-colors hover:bg-stone-100 dark:hover:bg-white/[0.05]"
          >
            <span className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full',
              type === 'brand' ? 'bg-sky-500' : 'bg-amber-500',
            )} />
            <span className="min-w-0 flex-1 truncate">{entry.value}</span>
            <button
              type="button"
              onClick={() => onRemove(entry)}
              disabled={busyKey === `entry:${entry._id}`}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-stone-400 opacity-60 transition hover:bg-white hover:text-rose-600 group-hover:opacity-100 disabled:pointer-events-none dark:hover:bg-white/10"
              aria-label={`Remove ${entry.value}`}
            >
              {busyKey === `entry:${entry._id}`
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <X className="h-3.5 w-3.5" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BlacklistManager() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [rules, setRules] = useState<BlacklistRule[]>([]);
  const [brand, setBrand] = useState('');
  const [product, setProduct] = useState('');
  const [action, setAction] = useState<BlacklistRuleAction>('allow');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const brands = useMemo(
    () => entries.filter((entry) => entry.type === 'brand'),
    [entries],
  );
  const products = useMemo(
    () => entries.filter((entry) => entry.type === 'product'),
    [entries],
  );
  const allowedRules = rules.filter((rule) => rule.action === 'allow').length;
  const blockedRules = rules.length - allowedRules;

  useEffect(() => {
    getBlacklistPolicy()
      .then((policy) => {
        setEntries(policy.entries);
        setRules(policy.rules);
      })
      .catch(() => toast({
        title: 'Could not load deal policy',
        description: 'Refresh the page and try again.',
        variant: 'destructive',
      }))
      .finally(() => setIsLoading(false));
  }, [toast]);

  const getApiError = (error: unknown, fallback: string) => (
    axios.isAxiosError(error) ? error.response?.data?.error || fallback : fallback
  );

  const handleAddEntry = async (type: BlacklistEntryType, value: string) => {
    try {
      const entry = await addBlacklistEntry(type, value.trim());
      setEntries((current) => [...current, entry]);
    } catch (error) {
      toast({
        title: 'Could not add entry',
        description: getApiError(error, 'Please try again.'),
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleRemoveEntry = async (entry: BlacklistEntry) => {
    setBusyKey(`entry:${entry._id}`);
    try {
      await removeBlacklistEntry(entry._id);
      setEntries((current) => current.filter((item) => item._id !== entry._id));
    } catch (error) {
      toast({
        title: 'Could not remove entry',
        description: getApiError(error, 'Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleSaveRule = async (event: FormEvent) => {
    event.preventDefault();
    if (!brand.trim() || !product.trim()) return;

    setIsSavingRule(true);
    try {
      const savedRule = await saveBlacklistRule(brand.trim(), product.trim(), action);
      setRules((current) => [
        ...current.filter((rule) => (
          rule.normalizedBrand !== savedRule.normalizedBrand
          || rule.normalizedProduct !== savedRule.normalizedProduct
        )),
        savedRule,
      ]);
      setBrand('');
      setProduct('');
      toast({
        title: action === 'allow' ? 'Allow exception saved' : 'Block rule saved',
        description: `${savedRule.brand} · ${savedRule.product}`,
      });
    } catch (error) {
      toast({
        title: 'Could not save rule',
        description: getApiError(error, 'Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleRemoveRule = async (rule: BlacklistRule) => {
    setBusyKey(`rule:${rule._id}`);
    try {
      await removeBlacklistRule(rule._id);
      setRules((current) => current.filter((item) => item._id !== rule._id));
    } catch (error) {
      toast({
        title: 'Could not remove rule',
        description: getApiError(error, 'Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-[#111113]">
      <header className="flex flex-col gap-5 border-b border-stone-200 px-5 py-5 dark:border-white/10 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-950 text-white dark:bg-stone-100 dark:text-stone-950">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-stone-950 dark:text-white">Deal policy</h2>
            <p className="mt-1 max-w-xl text-sm leading-5 text-stone-500 dark:text-stone-400">
              Set the default filter, then add precise brand–product exceptions when needed.
            </p>
          </div>
        </div>

        <div className="flex divide-x divide-stone-200 rounded-xl border border-stone-200 bg-stone-50 dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.03]">
          {[
            { label: 'Defaults', value: brands.length + products.length },
            { label: 'Allowed', value: allowedRules },
            { label: 'Blocked', value: blockedRules },
          ].map((stat) => (
            <div key={stat.label} className="min-w-20 px-3 py-2 text-center">
              <p className="text-sm font-semibold tabular-nums">{stat.value}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </header>

      {isLoading ? (
        <div className="flex h-72 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]">
          <div className="border-b border-stone-200 p-5 dark:border-white/10 sm:p-6 lg:border-b-0 lg:border-r">
            <div className="mb-5">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-900 text-[10px] font-semibold text-white dark:bg-stone-100 dark:text-stone-900">1</span>
                <h3 className="text-sm font-semibold">Default filter</h3>
              </div>
              <p className="mt-2 text-xs leading-5 text-stone-500 dark:text-stone-400">
                A message is blocked only when it matches one item from each list.
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs font-medium">
                <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">Brand</Badge>
                <Plus className="h-3 w-3 text-stone-400" />
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">Product</Badge>
                <span className="text-stone-400">→</span>
                <Badge variant="destructive">Block</Badge>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <PolicyList
                type="brand"
                title="Brands"
                placeholder="e.g. Boat"
                entries={brands}
                busyKey={busyKey}
                onAdd={handleAddEntry}
                onRemove={handleRemoveEntry}
              />
              <PolicyList
                type="product"
                title="Product keywords"
                placeholder="e.g. TWS"
                entries={products}
                busyKey={busyKey}
                onAdd={handleAddEntry}
                onRemove={handleRemoveEntry}
              />
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-900 text-[10px] font-semibold text-white dark:bg-stone-100 dark:text-stone-900">2</span>
              <div>
                <h3 className="text-sm font-semibold">Pair overrides</h3>
                <p className="mt-1 text-xs leading-5 text-stone-500 dark:text-stone-400">
                  Allow takes priority over the default filter. Block catches a specific pair anywhere.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveRule} className="mt-5 grid gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-white/10 dark:bg-white/[0.025] sm:grid-cols-[1fr_1fr_120px_auto]">
              <div>
                <label htmlFor="policy-brand" className="sr-only">Brand</label>
                <Input
                  id="policy-brand"
                  value={brand}
                  onChange={(event) => setBrand(event.target.value)}
                  list="policy-brand-options"
                  maxLength={100}
                  placeholder="Brand"
                  className="h-9 bg-white shadow-none dark:bg-[#111113]"
                />
                <datalist id="policy-brand-options">
                  {brands.map((entry) => <option key={entry._id} value={entry.value} />)}
                </datalist>
              </div>
              <div>
                <label htmlFor="policy-product" className="sr-only">Product</label>
                <Input
                  id="policy-product"
                  value={product}
                  onChange={(event) => setProduct(event.target.value)}
                  list="policy-product-options"
                  maxLength={100}
                  placeholder="Product keyword"
                  className="h-9 bg-white shadow-none dark:bg-[#111113]"
                />
                <datalist id="policy-product-options">
                  {products.map((entry) => <option key={entry._id} value={entry.value} />)}
                </datalist>
              </div>
              <Select value={action} onValueChange={(value) => setAction(value as BlacklistRuleAction)}>
                <SelectTrigger className="h-9 bg-white shadow-none dark:bg-[#111113]" aria-label="Rule action">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allow">Allow</SelectItem>
                  <SelectItem value="block">Block</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" className="h-9" disabled={isSavingRule || !brand.trim() || !product.trim()}>
                {isSavingRule ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save rule'}
              </Button>
            </form>

            <div className="mt-5 overflow-hidden rounded-xl border border-stone-200 dark:border-white/10">
              {rules.length === 0 ? (
                <div className="flex min-h-48 items-center justify-center px-6 text-center">
                  <div>
                    <CheckCircle2 className="mx-auto h-6 w-6 text-stone-300 dark:text-stone-600" />
                    <p className="mt-3 text-sm font-medium">No overrides</p>
                    <p className="mt-1 text-xs text-stone-400">The default filter handles every deal.</p>
                  </div>
                </div>
              ) : (
                <div className="max-h-[332px] divide-y divide-stone-200 overflow-y-auto dark:divide-white/10">
                  {[...rules]
                    .sort((left, right) => left.brand.localeCompare(right.brand))
                    .map((rule) => {
                      const isAllow = rule.action === 'allow';
                      const RuleIcon = isAllow ? CheckCircle2 : ShieldX;
                      return (
                        <div key={rule._id} className="group flex items-center gap-3 px-3 py-3 sm:px-4">
                          <div className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                            isAllow
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300',
                          )}>
                            <RuleIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2 text-sm">
                              <span className="truncate font-medium">{rule.brand}</span>
                              <span className="shrink-0 text-stone-300 dark:text-stone-600">×</span>
                              <span className="truncate text-stone-600 dark:text-stone-300">{rule.product}</span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-stone-400">
                              {isAllow ? 'Always accept this combination' : 'Always reject this combination'}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              'hidden sm:inline-flex',
                              isAllow
                                ? 'border-emerald-200 text-emerald-700 dark:border-emerald-500/20 dark:text-emerald-300'
                                : 'border-rose-200 text-rose-700 dark:border-rose-500/20 dark:text-rose-300',
                            )}
                          >
                            {isAllow ? 'Allow' : 'Block'}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-stone-400 opacity-60 hover:text-rose-600 group-hover:opacity-100"
                            disabled={busyKey === `rule:${rule._id}`}
                            onClick={() => handleRemoveRule(rule)}
                            aria-label={`Remove ${rule.brand} ${rule.product} rule`}
                          >
                            {busyKey === `rule:${rule._id}`
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
