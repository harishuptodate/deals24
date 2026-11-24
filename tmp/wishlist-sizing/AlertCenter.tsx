import { useState } from 'react';
import { AlertTriangle, BellRing, IndianRupee, Loader2, LogIn, Search, Tag, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { CreateDealAlertInput, DealAlert } from '@/services/api/alertsApi';
import { useAuth } from '@/contexts/AuthContext';
import { isLocalAlertPreview } from '@/services/localAlertPreview';
import AuthDialog from '@/components/auth/AuthDialog';
import DealImage from '@/components/images/DealImage';
import { EnhancedSkeleton } from '@/components/ui/enhanced-skeleton';

type AlertCenterProps = {
  alerts: DealAlert[];
  isLoading: boolean;
  onCreate: (input: CreateDealAlertInput) => Promise<unknown>;
  onSetActive: (alert: DealAlert, active: boolean) => Promise<unknown>;
  onRemove: (alert: DealAlert) => Promise<unknown>;
};

const AlertCenter = ({ alerts, isLoading, onCreate, onSetActive, onRemove }: AlertCenterProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [keywords, setKeywords] = useState('');
  const [price, setPrice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [alertsToRemove, setAlertsToRemove] = useState<DealAlert[]>([]);
  const dealAlerts = alerts.filter((alert) => alert.type === 'deal');
  const keywordAlerts = alerts.filter((alert) => alert.type === 'keyword');
  const activeCount = alerts.filter((alert) => alert.active).length;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const keyword = keywords.trim();
    if (!keyword) return;
    const targetPrice = price ? Number(price) : null;
    if (!user && !isLocalAlertPreview) {
      localStorage.setItem('pending-keyword-alert', JSON.stringify({ keywords: [keyword], targetPrice }));
      setIsAuthOpen(true);
      return;
    }
    setIsSaving(true);
    try {
      await onCreate({ type: 'keyword', keywords: [keyword], targetPrice });
      setKeywords('');
      setPrice('');
      toast({ title: 'Keyword alert created', description: isLocalAlertPreview ? 'Saved in this browser. No emails will be sent.' : `Notifications will be sent to ${user.email}.` });
    } catch {
      toast({ title: 'Could not create alert', description: 'Check the details and try again.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggle = async (alert: DealAlert, active: boolean) => {
    try {
      await onSetActive(alert, active);
      toast({ title: active ? 'Alert resumed' : 'Alert paused' });
    } catch {
      toast({ title: 'Could not update alert', variant: 'destructive' });
    }
  };

  const restore = async (removedAlerts: DealAlert[]) => {
    try {
      await Promise.all(removedAlerts.map((alert) => onCreate({
        type: alert.type,
        dealId: alert.dealId || undefined,
        ...(isLocalAlertPreview ? { dealTitle: alert.dealTitle || undefined, previewDeal: alert.deal } : {}),
        keywords: alert.keywords,
        targetPrice: alert.targetPrice || null,
      })));
      toast({ title: removedAlerts.length === 1 ? 'Alert restored' : 'Alerts restored' });
    } catch {
      toast({ title: 'Could not restore alert', variant: 'destructive' });
    }
  };

  const confirmRemove = async () => {
    const removedAlerts = alertsToRemove;
    setAlertsToRemove([]);
    try {
      await Promise.all(removedAlerts.map((alert) => onRemove(alert)));
      toast({
        title: removedAlerts.length === 1 ? 'Alert removed' : `${removedAlerts.length} alerts removed`,
        description: 'Undo is available for 8 seconds.',
        duration: 8000,
        action: (
          <ToastAction altText="Undo alert removal" onClick={() => void restore(removedAlerts)}>Undo</ToastAction>
        ),
      });
    } catch {
      toast({ title: 'Could not remove alerts', variant: 'destructive' });
    }
  };

  return (
    <section className="[--alert-price-width:190px] [--alert-action-width:180px] mb-8 min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:border-gray-900 dark:bg-zinc-950 md:mb-10">
      <div className="border-b border-gray-200 p-4 dark:border-gray-800 sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 dark:bg-zinc-900 dark:text-gray-300 sm:h-10 sm:w-10">
              <BellRing className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-high-contrast">Alerts</h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-zinc-900 dark:text-gray-300">{activeCount} active</span>
              </div>
              <p className="mt-0.5 max-w-md text-[11px] leading-4 text-gray-600 dark:text-gray-400 sm:text-xs">{isLocalAlertPreview ? 'Local preview · no emails sent' : 'Track a product once; we’ll watch every new deal.'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {!user && !isLocalAlertPreview && (
              <Button type="button" variant="ghost" size="sm" className="h-10 rounded-full px-3 text-xs" onClick={() => setIsAuthOpen(true)}>
                <LogIn className="mr-1.5 h-3.5 w-3.5" /> Sign in to sync
              </Button>
            )}
            {alerts.length > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setAlertsToRemove(alerts)} className="h-10 rounded-full border border-red-200 px-2.5 text-xs text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-red-900/70 dark:hover:bg-red-950/30 sm:px-3">
                Clear alerts
              </Button>
            )}
          </div>
        </div>

        <form onSubmit={submit} className="grid min-w-0 grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] gap-2 md:grid-cols-[minmax(0,1fr)_var(--alert-price-width)_var(--alert-action-width)]">
          <div className="relative col-span-2 min-w-0 md:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="Product or keyword" maxLength={80} className="h-11 min-w-0 rounded-xl border-gray-200 bg-gray-50 pl-9 text-base placeholder:text-sm focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-800 dark:bg-zinc-900" aria-label="Product or keyword" required />
          </div>
          <div className="relative min-w-0">
            <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input type="number" min="1" inputMode="numeric" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Max price" className="h-11 min-w-0 rounded-xl border-gray-200 bg-gray-50 pl-9 text-base placeholder:text-sm focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-800 dark:bg-zinc-900" aria-label="Optional target price" />
          </div>
          <Button type="submit" disabled={isSaving} className="h-11 min-w-0 rounded-full bg-gradient-to-b from-apple-darkGray to-indigo-950 px-2 text-xs text-white hover:shadow-lg hover:shadow-apple-darkGray/20 sm:px-5 sm:text-sm md:min-w-36">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellRing className="mr-2 h-4 w-4" />}
            {isSaving ? 'Creating…' : user || isLocalAlertPreview ? 'Create alert' : 'Sign in & create'}
          </Button>
        </form>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_calc(var(--alert-price-width)+var(--alert-action-width)+3.5rem)] lg:divide-x lg:divide-gray-200 dark:lg:divide-gray-800">
        <div className="min-w-0 p-4 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-950 dark:text-white">Deal alerts</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Notifications for one saved product</p>
            </div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{dealAlerts.length}</span>
          </div>
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[0, 1].map((index) => (
                <div key={`deal-alert-skeleton-${index}`} className="flex items-center gap-2.5 rounded-xl border border-gray-200 p-2.5 dark:border-gray-800">
                  <EnhancedSkeleton variant="shimmer" className="h-24 w-24 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <EnhancedSkeleton variant="shimmer" shape="text" className="h-3.5 w-full" />
                    <EnhancedSkeleton variant="shimmer" shape="text" className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : dealAlerts.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-gray-300 p-3 text-sm text-gray-600 dark:text-gray-400 dark:border-gray-800">
              <BellRing className="h-4 w-4 shrink-0 text-violet-500" /> Use the alert button on a saved deal.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {dealAlerts.map((alert) => {
                const dealId = alert.deal?.id || alert.dealId;
                const title = alert.deal?.title || alert.dealTitle || 'Deal alert';
                return (
                  <article key={alert._id} className="grid min-w-0 grid-cols-[96px_minmax(0,1fr)] items-center gap-x-2.5 gap-y-1 rounded-xl border border-gray-200 bg-gray-50/60 p-2.5 transition-colors hover:border-gray-300 dark:border-gray-800 dark:bg-white/[0.025] dark:hover:border-gray-700">
                    {dealId ? (
                      <Link to={`/deal/${dealId}`} className="row-span-2 flex h-24 w-24 shrink-0 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                        <DealImage title={title} category={alert.deal?.category || undefined} imageUrl={alert.deal?.imageUrl || undefined} telegramFileId={alert.deal?.telegramFileId || undefined} className="h-auto w-auto max-h-24 max-w-full rounded-xl object-contain [&_img]:h-auto [&_img]:w-auto [&_img]:max-h-24 [&_img]:max-w-full [&_img]:rounded-xl" fallbackClassName="h-24 w-24 border-0" />
                      </Link>
                    ) : <div className="row-span-2 h-24 w-24 shrink-0 rounded-xl bg-gray-100 dark:bg-zinc-900" />}
                    <div className="min-w-0 flex-1">
                      {dealId ? <Link to={`/deal/${dealId}`} className="block [overflow-wrap:anywhere] text-xs font-semibold leading-4 hover:text-violet-600">{title}</Link> : <p className="[overflow-wrap:anywhere] text-xs font-semibold leading-4">{title}</p>}
                      <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-400">{alert.targetPrice ? `₹${alert.targetPrice.toLocaleString('en-IN')} or less` : 'Any price update'}</p>
                    </div>
                    <div className="col-start-2 flex items-center justify-end gap-2">
                      <Switch checked={alert.active} onCheckedChange={(active) => void toggle(alert, active)} className="shrink-0 scale-90 data-[state=checked]:bg-emerald-500 dark:data-[state=checked]:bg-emerald-500" aria-label={`${alert.active ? 'Pause' : 'Enable'} alert`} />
                      <button type="button" onClick={() => setAlertsToRemove([alert])} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-400 dark:hover:bg-red-950/30 dark:hover:text-red-400" aria-label="Remove alert"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="min-w-0 border-t border-gray-200 p-4 dark:border-gray-800 sm:p-6 lg:border-t-0">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-950 dark:text-white">Keyword alerts</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Searches checked on every deal</p>
            </div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{keywordAlerts.length}</span>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((index) => (
                <div key={`keyword-alert-skeleton-${index}`} className="flex items-center gap-2 rounded-xl border border-gray-200 p-2.5 dark:border-gray-800">
                  <EnhancedSkeleton variant="shimmer" className="h-8 w-8 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <EnhancedSkeleton variant="shimmer" shape="text" className="h-3.5 w-3/4" />
                    <EnhancedSkeleton variant="shimmer" shape="text" className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : keywordAlerts.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-gray-300 p-3 text-sm text-gray-600 dark:text-gray-400 dark:border-gray-800">
              <Tag className="h-4 w-4 shrink-0 text-violet-500" /> Create one with the compact form above.
            </div>
          ) : (
            <div className="space-y-2">
              {keywordAlerts.map((alert) => (
                <article key={alert._id} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/60 p-2.5 transition-colors hover:border-gray-300 dark:border-gray-800 dark:bg-white/[0.025] dark:hover:border-gray-700">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-zinc-900 dark:text-gray-300"><Tag className="h-3.5 w-3.5" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{alert.keywords.join(', ')}</p>
                    <p className="mt-0.5 text-[11px] text-gray-600 dark:text-gray-400">{alert.targetPrice ? `₹${alert.targetPrice.toLocaleString('en-IN')} or less` : 'Any price'}</p>
                  </div>
                  <Switch checked={alert.active} onCheckedChange={(active) => void toggle(alert, active)} className="shrink-0 scale-90 data-[state=checked]:bg-emerald-500 dark:data-[state=checked]:bg-emerald-500" aria-label={`${alert.active ? 'Pause' : 'Enable'} alert`} />
                  <button type="button" onClick={() => setAlertsToRemove([alert])} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-400 dark:hover:bg-red-950/30 dark:hover:text-red-400" aria-label="Remove alert"><Trash2 className="h-3.5 w-3.5" /></button>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      <AuthDialog open={isAuthOpen} onOpenChange={setIsAuthOpen} />
      <AlertDialog open={alertsToRemove.length > 0} onOpenChange={(open) => !open && setAlertsToRemove([])}>
        <AlertDialogContent
          className="w-[calc(100%-2rem)] rounded-3xl sm:max-w-md">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/40"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
          <AlertDialogHeader className="text-center sm:text-center">
            <AlertDialogTitle>{alertsToRemove.length === 1 ? 'Remove this alert?' : `Remove ${alertsToRemove.length} alerts?`}</AlertDialogTitle>
            <AlertDialogDescription className="leading-6">Email notifications will stop. You can restore {alertsToRemove.length === 1 ? 'it' : 'them'} from the confirmation message for 8 seconds.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:space-x-0">
            <AlertDialogCancel className="mt-0 h-11 rounded-full">Keep alerts</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmRemove()} className="h-11 rounded-full bg-red-600 text-white hover:bg-red-700">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default AlertCenter;
