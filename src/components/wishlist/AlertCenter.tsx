import { useState } from 'react';
import { AlertTriangle, BellRing, IndianRupee, Loader2, LogIn, Pencil, Search, Tag, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  onSetTargetPrice: (alert: DealAlert, targetPrice: number | null) => Promise<unknown>;
  onSetKeywords: (alert: DealAlert, keywords: string[]) => Promise<unknown>;
  onRemove: (alert: DealAlert) => Promise<unknown>;
};

const AlertCenter = ({ alerts, isLoading, onCreate, onSetActive, onSetTargetPrice, onSetKeywords, onRemove }: AlertCenterProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [keywords, setKeywords] = useState('');
  const [price, setPrice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [alertsToRemove, setAlertsToRemove] = useState<DealAlert[]>([]);
  const [editingAlert, setEditingAlert] = useState<DealAlert | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
  const [priceError, setPriceError] = useState('');
  const [editingKeywordsAlert, setEditingKeywordsAlert] = useState<DealAlert | null>(null);
  const [editKeywords, setEditKeywords] = useState('');
  const [isUpdatingKeywords, setIsUpdatingKeywords] = useState(false);
  const [keywordsError, setKeywordsError] = useState('');
  const dealAlerts = alerts.filter((alert) => alert.type === 'deal');
  const keywordAlerts = alerts.filter((alert) => alert.type === 'keyword');
  const activeCount = alerts.filter((alert) => alert.active).length;

  const saveKeywords = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingKeywordsAlert || isUpdatingKeywords) return;
    const phrases = editKeywords.split(',').map((phrase) => phrase.trim().replace(/\s+/g, ' '));
    if (phrases.length > 10 || phrases.some((phrase) => phrase.length < 2 || phrase.length > 80)) {
      setKeywordsError('Enter 1 to 10 keyword phrases, each 2 to 80 characters.');
      event.currentTarget.querySelector('input')?.focus();
      return;
    }
    setIsUpdatingKeywords(true);
    setKeywordsError('');
    try {
      await onSetKeywords(editingKeywordsAlert, [...new Set(phrases.map((phrase) => phrase.toLowerCase()))].sort());
      setEditingKeywordsAlert(null);
      toast({ title: 'Alert keywords updated' });
    } catch {
      setKeywordsError('Could not save the keywords. Please try again.');
    } finally {
      setIsUpdatingKeywords(false);
    }
  };

  const editTargetPrice = (alert: DealAlert) => {
    setEditPrice(alert.targetPrice == null ? '' : String(alert.targetPrice));
    setPriceError('');
    setEditingAlert(alert);
  };

  const saveTargetPrice = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingAlert || isUpdatingPrice) return;
    setIsUpdatingPrice(true);
    setPriceError('');
    try {
      await onSetTargetPrice(editingAlert, editPrice.trim() ? Number(editPrice) : null);
      setEditingAlert(null);
      toast({ title: 'Alert price updated' });
    } catch {
      setPriceError('Could not save the price. Please try again.');
    } finally {
      setIsUpdatingPrice(false);
    }
  };

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
      <div className="border-b border-gray-200 p-[1.15rem] dark:border-gray-800 sm:p-[1.725rem]">
        <div className="mb-[1.15rem] flex flex-wrap items-start justify-between gap-[0.8625rem]">
          <div className="flex min-w-0 items-center gap-[0.8625rem]">
            <div className="flex h-[2.5875rem] w-[2.5875rem] shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 dark:bg-zinc-900 dark:text-gray-300 sm:h-[2.875rem] sm:w-[2.875rem]">
              <BellRing className="h-[1.15rem] w-[1.15rem] sm:h-[1.4375rem] sm:w-[1.4375rem]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-[0.575rem]">
                <h2 className="text-[1.29375rem] font-semibold tracking-tight text-high-contrast">Alerts</h2>
                <span className="rounded-full bg-gray-100 px-[0.575rem] py-[0.14375rem] text-[0.790625rem] font-medium text-gray-600 dark:bg-zinc-900 dark:text-gray-300">{activeCount} active</span>
              </div>
              <p className="mt-[0.14375rem] max-w-md text-[0.790625rem] leading-[1.15rem] text-gray-600 dark:text-gray-400 sm:text-[0.8625rem]">{isLocalAlertPreview ? 'Local preview · no emails sent' : 'Track a product once; we’ll watch every new deal.'}</p>
            </div>
          </div>
          <div className="flex items-center gap-[0.43125rem]">
            {!user && !isLocalAlertPreview && (
              <Button type="button" variant="ghost" size="sm" className="h-auto min-h-[2.875rem] rounded-full py-2 px-[0.8625rem] text-[0.8625rem]" onClick={() => setIsAuthOpen(true)}>
                <LogIn className="mr-[0.43125rem] h-[1.00625rem] w-[1.00625rem]" /> Sign in to sync
              </Button>
            )}
            {alerts.length > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setAlertsToRemove(alerts)} className="h-auto min-h-[2.875rem] rounded-full py-2 border border-red-200 px-[0.71875rem] text-[0.8625rem] text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-red-900/70 dark:hover:bg-red-950/30 sm:px-[0.8625rem]">
                Clear alerts
              </Button>
            )}
          </div>
        </div>

        <form onSubmit={submit} className="grid min-w-0 grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] gap-[0.575rem] md:grid-cols-[minmax(0,1fr)_var(--alert-price-width)_var(--alert-action-width)]">
          <div className="relative col-span-2 min-w-0 md:col-span-1">
            <Search className="absolute left-3 top-1/2 h-[1.15rem] w-[1.15rem] -translate-y-1/2 text-gray-400" />
            <Input value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="Product or keyword" maxLength={80} className="h-[3.1625rem] min-w-0 rounded-xl border-gray-200 bg-gray-50 pl-[2.5875rem] text-[1.15rem] placeholder:text-[1.00625rem] focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-800 dark:bg-zinc-900" aria-label="Product or keyword" required />
          </div>
          <div className="relative min-w-0">
            <IndianRupee className="absolute left-3 top-1/2 h-[1.15rem] w-[1.15rem] -translate-y-1/2 text-gray-400" />
            <Input type="number" min="1" inputMode="numeric" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Max price" className="h-[3.1625rem] min-w-0 rounded-xl border-gray-200 bg-gray-50 pl-[2.5875rem] text-[1.15rem] placeholder:text-[1.00625rem] focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-800 dark:bg-zinc-900" aria-label="Optional target price" />
          </div>
          <Button type="submit" disabled={isSaving} className="h-auto min-h-[3.1625rem] min-w-0 whitespace-normal rounded-full py-2 bg-gradient-to-b from-apple-darkGray to-indigo-950 px-[0.575rem] text-[0.8625rem] text-white hover:shadow-lg hover:shadow-apple-darkGray/20 sm:px-[1.4375rem] sm:text-[1.00625rem] md:min-w-36 md:px-3">
            {isSaving ? <Loader2 className="mr-[0.575rem] h-[1.15rem] w-[1.15rem] animate-spin" /> : <BellRing className="mr-[0.575rem] h-[1.15rem] w-[1.15rem]" />}
            {isSaving ? 'Creating…' : user || isLocalAlertPreview ? 'Create alert' : 'Sign in & create'}
          </Button>
        </form>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_calc(var(--alert-price-width)+var(--alert-action-width)+3.5rem)] lg:divide-x lg:divide-gray-200 dark:lg:divide-gray-800">
        <div className="min-w-0 p-4 sm:p-6">
          <div className="mb-[0.9rem] flex items-center justify-between">
            <div>
              <h3 className="text-[1.05rem] font-semibold text-gray-950 dark:text-white">Deal alerts</h3>
              <p className="text-[0.9rem] text-gray-600 dark:text-gray-400">Notifications for one saved product</p>
            </div>
            <span className="text-[0.9rem] font-medium text-gray-600 dark:text-gray-400">{dealAlerts.length}</span>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-3">
              {[0, 1].map((index) => (
                <div key={`deal-alert-skeleton-${index}`} className="flex items-start gap-3 rounded-2xl border border-gray-200 p-3 dark:border-gray-900">
                  <EnhancedSkeleton variant="shimmer" className="h-28 w-20 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <EnhancedSkeleton variant="shimmer" shape="text" className="h-[1.05rem] w-full" />
                    <EnhancedSkeleton variant="shimmer" shape="text" className="h-[0.9rem] w-2/3" />
                    <EnhancedSkeleton variant="shimmer" className="h-11 w-full rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : dealAlerts.length === 0 ? (
            <div className="flex items-center gap-[0.9rem] rounded-xl border border-dashed border-gray-300 p-[0.9rem] text-[1.05rem] text-gray-600 dark:text-gray-400 dark:border-gray-800">
              <BellRing className="h-[1.2rem] w-[1.2rem] shrink-0 text-violet-500" /> Use the alert button on a saved deal.
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] items-start gap-3">
              {dealAlerts.map((alert) => {
                const dealId = alert.deal?.id || alert.dealId;
                const title = alert.deal?.title || alert.dealTitle || 'Deal alert';
                return (
                  <article key={alert._id} className="grid min-w-0 grid-cols-[80px_minmax(0,1fr)] items-start gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:border-gray-900 dark:bg-zinc-950">
                    {dealId ? (
                      <Link to={`/deal/${dealId}`} aria-label={`View deal: ${title}`} className="flex h-28 w-20 items-center justify-center overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                        <DealImage title={title} category={alert.deal?.category || undefined} imageUrl={alert.deal?.imageUrl || undefined} telegramFileId={alert.deal?.telegramFileId || undefined} className="h-full w-full rounded-xl object-contain" fallbackClassName="border-0" />
                      </Link>
                    ) : <div className="h-28 w-20 rounded-xl bg-gray-100 dark:bg-zinc-900" />}
                    <div className="min-w-0">
                      {dealId ? <Link to={`/deal/${dealId}`} className="line-clamp-3 rounded-sm [overflow-wrap:anywhere] text-sm font-semibold leading-5 text-high-contrast hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:text-gray-300">{title}</Link> : <p className="line-clamp-3 [overflow-wrap:anywhere] text-sm font-semibold leading-5 text-high-contrast">{title}</p>}
                      <div className="mt-1 flex items-center gap-1">
                        <p className="min-w-0 text-xs leading-5 text-gray-600 dark:text-gray-400">{alert.targetPrice ? `₹${alert.targetPrice.toLocaleString('en-IN')} or less` : 'Any price update'}</p>
                        <button type="button" onClick={() => editTargetPrice(alert)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-800" aria-label={`Edit alert price for ${title}`} title="Edit price"><Pencil aria-hidden="true" className="h-3.5 w-3.5" /></button>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <Switch checked={alert.active} onCheckedChange={(active) => void toggle(alert, active)} className="shrink-0 data-[state=checked]:bg-emerald-500 dark:data-[state=checked]:bg-emerald-500" aria-label={`${alert.active ? 'Pause' : 'Enable'} alert for ${title}`} />
                        <button type="button" onClick={() => setAlertsToRemove([alert])} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-400 dark:hover:bg-red-950/30 dark:hover:text-red-400" aria-label={`Remove alert for ${title}`}><Trash2 aria-hidden="true" className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="min-w-0 border-t border-gray-200 p-[1.15rem] dark:border-gray-800 sm:p-[1.725rem] lg:border-t-0">
          <div className="mb-[0.8625rem] flex items-center justify-between">
            <div>
              <h3 className="text-[1.00625rem] font-semibold text-gray-950 dark:text-white">Keyword alerts</h3>
              <p className="text-[0.8625rem] text-gray-600 dark:text-gray-400">Searches checked on every deal</p>
            </div>
            <span className="text-[0.8625rem] font-medium text-gray-600 dark:text-gray-400">{keywordAlerts.length}</span>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((index) => (
                <div key={`keyword-alert-skeleton-${index}`} className="flex items-center gap-[0.575rem] rounded-xl border border-gray-200 p-[0.71875rem] dark:border-gray-800">
                  <EnhancedSkeleton variant="shimmer" className="h-[2.3rem] w-[2.3rem] shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <EnhancedSkeleton variant="shimmer" shape="text" className="h-[1.00625rem] w-3/4" />
                    <EnhancedSkeleton variant="shimmer" shape="text" className="h-[0.8625rem] w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : keywordAlerts.length === 0 ? (
            <div className="flex items-center gap-[0.8625rem] rounded-xl border border-dashed border-gray-300 p-[0.8625rem] text-[1.00625rem] text-gray-600 dark:text-gray-400 dark:border-gray-800">
              <Tag className="h-[1.15rem] w-[1.15rem] shrink-0 text-violet-500" /> Create one with the compact form above.
            </div>
          ) : (
            <div className="space-y-2">
              {keywordAlerts.map((alert) => (
                <article key={alert._id} className="min-w-0 rounded-xl border border-gray-200 bg-gray-50/60 p-3 transition-colors hover:border-gray-300 dark:border-gray-800 dark:bg-white/[0.025] dark:hover:border-gray-700">
                  <div className="flex items-start gap-2">
                    <Tag aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
                    <p className="min-w-0 flex-1 [overflow-wrap:anywhere] text-sm font-semibold leading-5">{alert.keywords.join(', ')}</p>
                    <button type="button" onClick={() => { setEditKeywords(alert.keywords.join(', ')); setKeywordsError(''); setEditingKeywordsAlert(alert); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-800" aria-label={`Edit keywords for ${alert.keywords.join(', ')}`} title="Edit keywords"><Pencil aria-hidden="true" className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <div className="mr-auto flex min-w-0 items-center gap-1">
                      <p className="min-w-0 text-xs leading-5 text-gray-600 dark:text-gray-400">{alert.targetPrice ? `₹${alert.targetPrice.toLocaleString('en-IN')} or less` : 'Any price'}</p>
                      <button type="button" onClick={() => editTargetPrice(alert)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-800" aria-label={`Edit alert price for ${alert.keywords.join(', ')}`} title="Edit price"><Pencil aria-hidden="true" className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <Switch checked={alert.active} onCheckedChange={(active) => void toggle(alert, active)} className="shrink-0 data-[state=checked]:bg-emerald-500 dark:data-[state=checked]:bg-emerald-500" aria-label={`${alert.active ? 'Pause' : 'Enable'} alert for ${alert.keywords.join(', ')}`} />
                      <button type="button" onClick={() => setAlertsToRemove([alert])} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-400 dark:hover:bg-red-950/30 dark:hover:text-red-400" aria-label={`Remove alert for ${alert.keywords.join(', ')}`}><Trash2 aria-hidden="true" className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      <AuthDialog open={isAuthOpen} onOpenChange={setIsAuthOpen} />
      <Dialog open={Boolean(editingKeywordsAlert)} onOpenChange={(open) => !open && !isUpdatingKeywords && setEditingKeywordsAlert(null)}>
        <DialogContent className="w-[calc(100%-2rem)] rounded-2xl sm:max-w-md dark:border-gray-800 dark:bg-zinc-950">
          <DialogHeader>
            <DialogTitle id="edit-alert-keywords-title">Edit alert keywords</DialogTitle>
            <DialogDescription>Update the searches used for this alert.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveKeywords} aria-labelledby="edit-alert-keywords-title" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-alert-keywords">Keywords</Label>
              <Input id="edit-alert-keywords" name="keywords" value={editKeywords} onChange={(event) => { setEditKeywords(event.target.value); setKeywordsError(''); }} required disabled={isUpdatingKeywords} aria-invalid={Boolean(keywordsError)} aria-describedby="edit-alert-keywords-help edit-alert-keywords-error" className="h-12 text-base" />
              <p id="edit-alert-keywords-help" className="text-sm text-gray-600 dark:text-gray-400">Separate up to 10 phrases with commas. Each phrase must be 2 to 80 characters. A deal can match any phrase.</p>
              {keywordsError && <p id="edit-alert-keywords-error" role="alert" className="text-sm text-red-600 dark:text-red-400">{keywordsError}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" className="min-h-12" disabled={isUpdatingKeywords} onClick={() => setEditingKeywordsAlert(null)}>Cancel</Button>
              <Button type="submit" className="min-h-12" disabled={isUpdatingKeywords}>{isUpdatingKeywords ? 'Saving…' : 'Save keywords'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(editingAlert)} onOpenChange={(open) => !open && !isUpdatingPrice && setEditingAlert(null)}>
        <DialogContent className="w-[calc(100%-2rem)] rounded-2xl sm:max-w-md dark:border-gray-800 dark:bg-zinc-950">
          <DialogHeader>
            <DialogTitle id="edit-alert-price-title">Edit alert price</DialogTitle>
            <DialogDescription className="break-words">
              {editingAlert?.type === 'keyword' ? editingAlert.keywords.join(', ') : editingAlert?.deal?.title || editingAlert?.dealTitle || 'Deal alert'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveTargetPrice} aria-labelledby="edit-alert-price-title" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-alert-price">Target price (₹, optional)</Label>
              <Input id="edit-alert-price" name="targetPrice" type="number" min="1" max="100000000" step="1" inputMode="numeric" value={editPrice} onChange={(event) => { setEditPrice(event.target.value); setPriceError(''); }} disabled={isUpdatingPrice} aria-describedby="edit-alert-price-help" className="h-12 text-base" />
              <p id="edit-alert-price-help" className="text-sm text-gray-600 dark:text-gray-400">Notify at or below this price. Leave blank for any price.</p>
            </div>
            {priceError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{priceError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" className="min-h-12" disabled={isUpdatingPrice} onClick={() => setEditingAlert(null)}>Cancel</Button>
              <Button type="submit" className="min-h-12" disabled={isUpdatingPrice}>{isUpdatingPrice ? 'Saving…' : 'Save price'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
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
