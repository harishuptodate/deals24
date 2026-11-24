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
    <section aria-labelledby="wishlist-alerts-heading" className="[--alert-price-width:192px] [--alert-action-width:176px] mb-10 min-w-0 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:mb-12">
      <div className="border-b border-zinc-200 p-4 dark:border-zinc-800 sm:p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <BellRing aria-hidden="true" strokeWidth={1.5} className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="wishlist-alerts-heading" className="text-xl font-medium tracking-normal text-high-contrast">Alerts</h2>
                <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">{activeCount} active</span>
              </div>
              <p className="mt-1 max-w-md text-sm leading-6 text-zinc-600 dark:text-zinc-400">{isLocalAlertPreview ? 'Local preview · no emails sent' : 'Watch for new deals by product, keyword, or price'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!user && !isLocalAlertPreview && (
              <Button type="button" variant="ghost" size="sm" className="h-11 rounded-lg py-2 px-3 text-sm" onClick={() => setIsAuthOpen(true)}>
                <LogIn strokeWidth={1.5} className="h-4 w-4" /> Sign in to sync
              </Button>
            )}
            {alerts.length > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setAlertsToRemove(alerts)} className="h-11 rounded-lg py-2 border border-zinc-200 px-3 text-sm text-zinc-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-red-950/30 sm:px-3">
                Clear alerts
              </Button>
            )}
          </div>
        </div>

        <form onSubmit={submit} className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 md:grid-cols-[minmax(0,1fr)_var(--alert-price-width)_var(--alert-action-width)]">
          <div className="relative col-span-2 min-w-0 md:col-span-1">
            <Search strokeWidth={1.5} className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="Product or keyword" maxLength={80} className="h-12 min-w-0 rounded-lg border-zinc-200 bg-white pl-10 text-base placeholder:text-sm focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-900" aria-label="Product or keyword" required />
          </div>
          <div className="relative min-w-0">
            <IndianRupee strokeWidth={1.5} className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input type="number" min="1" inputMode="numeric" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Max price" className="h-12 min-w-0 rounded-lg border-zinc-200 bg-white pl-10 text-base placeholder:text-sm focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-900" aria-label="Optional target price" />
          </div>
          <Button type="submit" disabled={isSaving} className="min-h-12 min-w-0 whitespace-normal rounded-lg bg-blue-700 px-3 py-2 text-sm text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500">
            {isSaving ? <Loader2 aria-hidden="true" strokeWidth={1.5} className="h-4 w-4 animate-spin" /> : <BellRing aria-hidden="true" strokeWidth={1.5} className="h-4 w-4" />}
            {isSaving ? 'Creating…' : user || isLocalAlertPreview ? 'Create alert' : 'Sign in & create'}
          </Button>
        </form>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,87fr)_minmax(0,38fr)] lg:divide-x lg:divide-zinc-200 dark:lg:divide-zinc-800">
        <div className="min-w-0 p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium tracking-normal text-zinc-950 dark:text-white">Deal alerts</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Notifications for one saved product</p>
            </div>
            <span className="text-sm tabular-nums text-zinc-500 dark:text-zinc-400">{dealAlerts.length}</span>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-3">
              {[0, 1].map((index) => (
                <div key={`deal-alert-skeleton-${index}`} className="flex items-start gap-3 rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
                  <EnhancedSkeleton variant="shimmer" className="h-[7.7rem] w-[5.5rem] shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <EnhancedSkeleton variant="shimmer" shape="text" className="h-4 w-full" />
                    <EnhancedSkeleton variant="shimmer" shape="text" className="h-4 w-2/3" />
                    <EnhancedSkeleton variant="shimmer" className="h-11 w-full rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : dealAlerts.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-600 dark:text-zinc-400 dark:border-zinc-800">
              <BellRing strokeWidth={1.5} className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" /> Set an alert from any saved deal
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] items-start gap-3">
              {dealAlerts.map((alert) => {
                const dealId = alert.deal?.id || alert.dealId;
                const title = alert.deal?.title || alert.dealTitle || 'Deal alert';
                return (
                  <article key={alert._id} className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
                    {dealId ? (
                      <Link to={`/deal/${dealId}`} aria-label={`View deal: ${title}`} className="flex h-[7.7rem] w-[5.5rem] items-center justify-center overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                        <DealImage title={title} category={alert.deal?.category || undefined} imageUrl={alert.deal?.imageUrl || undefined} telegramFileId={alert.deal?.telegramFileId || undefined} className="h-full w-full rounded-xl object-contain" fallbackClassName="border-0" />
                      </Link>
                    ) : <div className="h-[7.7rem] w-[5.5rem] rounded-xl bg-zinc-100 dark:bg-zinc-900" />}
                    <div className="min-w-0">
                      {dealId ? <Link to={`/deal/${dealId}`} className="line-clamp-3 rounded-sm [overflow-wrap:anywhere] text-sm font-medium leading-5 text-high-contrast hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:text-zinc-300">{title}</Link> : <p className="line-clamp-3 [overflow-wrap:anywhere] text-sm font-medium leading-5 text-high-contrast">{title}</p>}
                      <div className="mt-1 flex items-center gap-1">
                        <p className="min-w-0 text-xs leading-5 tabular-nums text-zinc-600 dark:text-zinc-400">{alert.targetPrice ? `₹${alert.targetPrice.toLocaleString('en-IN')} or less` : 'Any price update'}</p>
                        <button type="button" onClick={() => editTargetPrice(alert)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-zinc-400 dark:hover:bg-zinc-800" aria-label={`Edit alert price for ${title}`} title="Edit price"><Pencil strokeWidth={1.5} aria-hidden="true" className="h-4 w-4" /></button>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <Switch checked={alert.active} onCheckedChange={(active) => void toggle(alert, active)} className="shrink-0 data-[state=checked]:bg-blue-700 dark:data-[state=checked]:bg-blue-600" aria-label={`${alert.active ? 'Pause' : 'Enable'} alert for ${title}`} />
                        <button type="button" onClick={() => setAlertsToRemove([alert])} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-400" aria-label={`Remove alert for ${title}`}><Trash2 strokeWidth={1.5} aria-hidden="true" className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="min-w-0 border-t border-zinc-200 p-4 dark:border-zinc-800 sm:p-6 lg:border-t-0">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium tracking-normal text-zinc-950 dark:text-white">Keyword alerts</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Searches checked on every deal</p>
            </div>
            <span className="text-sm tabular-nums text-zinc-500 dark:text-zinc-400">{keywordAlerts.length}</span>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((index) => (
                <div key={`keyword-alert-skeleton-${index}`} className="flex items-center gap-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                  <EnhancedSkeleton variant="shimmer" className="h-10 w-10 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <EnhancedSkeleton variant="shimmer" shape="text" className="h-4 w-3/4" />
                    <EnhancedSkeleton variant="shimmer" shape="text" className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : keywordAlerts.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-600 dark:text-zinc-400 dark:border-zinc-800">
              <Tag strokeWidth={1.5} className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" /> Add a product or keyword above
            </div>
          ) : (
            <div className="space-y-2">
              {keywordAlerts.map((alert) => (
                <article key={alert._id} className="min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 p-3 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700">
                  <div className="flex items-start gap-2">
                    <Tag strokeWidth={1.5} aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
                    <p className="min-w-0 flex-1 [overflow-wrap:anywhere] text-sm font-medium leading-5">{alert.keywords.join(', ')}</p>
                    <button type="button" onClick={() => { setEditKeywords(alert.keywords.join(', ')); setKeywordsError(''); setEditingKeywordsAlert(alert); }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-zinc-400 dark:hover:bg-zinc-800" aria-label={`Edit keywords for ${alert.keywords.join(', ')}`} title="Edit keywords"><Pencil strokeWidth={1.5} aria-hidden="true" className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <div className="mr-auto flex min-w-0 items-center gap-1">
                      <p className="min-w-0 text-xs leading-5 tabular-nums text-zinc-600 dark:text-zinc-400">{alert.targetPrice ? `₹${alert.targetPrice.toLocaleString('en-IN')} or less` : 'Any price'}</p>
                      <button type="button" onClick={() => editTargetPrice(alert)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-zinc-400 dark:hover:bg-zinc-800" aria-label={`Edit alert price for ${alert.keywords.join(', ')}`} title="Edit price"><Pencil strokeWidth={1.5} aria-hidden="true" className="h-4 w-4" /></button>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <Switch checked={alert.active} onCheckedChange={(active) => void toggle(alert, active)} className="shrink-0 data-[state=checked]:bg-blue-700 dark:data-[state=checked]:bg-blue-600" aria-label={`${alert.active ? 'Pause' : 'Enable'} alert for ${alert.keywords.join(', ')}`} />
                      <button type="button" onClick={() => setAlertsToRemove([alert])} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-400" aria-label={`Remove alert for ${alert.keywords.join(', ')}`}><Trash2 strokeWidth={1.5} aria-hidden="true" className="h-4 w-4" /></button>
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
        <DialogContent className="w-[calc(100%-2rem)] rounded-2xl sm:max-w-md dark:border-zinc-800 dark:bg-zinc-950">
          <DialogHeader>
            <DialogTitle id="edit-alert-keywords-title">Edit alert keywords</DialogTitle>
            <DialogDescription>Update the searches used for this alert.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveKeywords} aria-labelledby="edit-alert-keywords-title" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-alert-keywords">Keywords</Label>
              <Input id="edit-alert-keywords" name="keywords" value={editKeywords} onChange={(event) => { setEditKeywords(event.target.value); setKeywordsError(''); }} required disabled={isUpdatingKeywords} aria-invalid={Boolean(keywordsError)} aria-describedby="edit-alert-keywords-help edit-alert-keywords-error" className="h-12 text-base" />
              <p id="edit-alert-keywords-help" className="text-sm text-zinc-600 dark:text-zinc-400">Separate up to 10 phrases with commas. Each phrase must be 2 to 80 characters. A deal can match any phrase.</p>
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
        <DialogContent className="w-[calc(100%-2rem)] rounded-2xl sm:max-w-md dark:border-zinc-800 dark:bg-zinc-950">
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
              <p id="edit-alert-price-help" className="text-sm text-zinc-600 dark:text-zinc-400">Notify at or below this price. Leave blank for any price.</p>
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
          className="w-[calc(100%-2rem)] rounded-2xl sm:max-w-md">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/40"><AlertTriangle strokeWidth={1.5} className="h-5 w-5 text-red-600" /></div>
          <AlertDialogHeader className="text-center sm:text-center">
            <AlertDialogTitle>{alertsToRemove.length === 1 ? 'Remove this alert?' : `Remove ${alertsToRemove.length} alerts?`}</AlertDialogTitle>
            <AlertDialogDescription className="leading-6">Email notifications will stop. You can restore {alertsToRemove.length === 1 ? 'it' : 'them'} from the confirmation message for 8 seconds.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:space-x-0">
            <AlertDialogCancel className="mt-0 h-11 rounded-lg">Keep alerts</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmRemove()} className="h-11 rounded-lg bg-red-600 text-white hover:bg-red-700">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default AlertCenter;
