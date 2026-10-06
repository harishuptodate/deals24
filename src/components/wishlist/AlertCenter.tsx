import { useState } from 'react';
import { BellRing, IndianRupee, LogIn, Search, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
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
import AuthDialog from '@/components/auth/AuthDialog';
import DealImage from '@/components/images/DealImage';

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

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const keyword = keywords.trim();
    if (!keyword) return;
    const targetPrice = price ? Number(price) : null;
    if (!user) {
      localStorage.setItem('pending-keyword-alert', JSON.stringify({ keywords: [keyword], targetPrice }));
      setIsAuthOpen(true);
      return;
    }

    setIsSaving(true);
    try {
      await onCreate({ type: 'keyword', keywords: [keyword], targetPrice });
      setKeywords('');
      setPrice('');
      toast({ title: 'Keyword alert created', description: `Notifications will be sent to ${user.email}.` });
    } catch {
      toast({ title: 'Could not create alert', description: 'Check the details and try again.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggle = async (alert: DealAlert, active: boolean) => {
    try {
      await onSetActive(alert, active);
    } catch {
      toast({ title: 'Could not update alert', variant: 'destructive' });
    }
  };

  const restore = async (removedAlerts: DealAlert[]) => {
    try {
      await Promise.all(removedAlerts.map((alert) => onCreate({
        type: alert.type,
        dealId: alert.dealId || undefined,
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
        description: 'You have 8 seconds to undo this action.',
        duration: 8000,
        action: (
          <ToastAction altText="Undo alert removal" onClick={() => void restore(removedAlerts)}>
            Undo
          </ToastAction>
        ),
      });
    } catch {
      toast({ title: 'Could not remove alerts', variant: 'destructive' });
    }
  };

  return (
    <section className="mb-8 space-y-5">
      <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-950 dark:bg-violet-950/15 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Track a product or keyword</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">We’ll check every new deal.</p>
            </div>
          </div>
          {user ? (
            <span className="max-w-64 truncate text-xs text-gray-500">Alerts to {user.email}</span>
          ) : (
            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setIsAuthOpen(true)}>
              <LogIn className="mr-1.5 h-4 w-4" /> Sign in to sync
            </Button>
          )}
        </div>

        <form onSubmit={submit} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
          <Input
            value={keywords}
            onChange={(event) => setKeywords(event.target.value)}
            placeholder="Product or keyword"
            maxLength={80}
            className="h-10 bg-white dark:bg-zinc-950"
            aria-label="Product or keyword"
            required
          />
          <div className="relative">
            <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              type="number"
              min="1"
              inputMode="numeric"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="Target price (optional)"
              className="h-10 bg-white pl-9 dark:bg-zinc-950"
              aria-label="Optional target price"
            />
          </div>
          <Button type="submit" disabled={isSaving} className="h-10 rounded-full px-5">
            <BellRing className="mr-2 h-4 w-4" />
            {isSaving ? 'Creating…' : user ? 'Create alert' : 'Sign in & create'}
          </Button>
        </form>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Deal alerts</h2>
            <p className="text-xs text-gray-500">Alerts tied to a specific deal</p>
          </div>
          <Badge variant="secondary" className="rounded-full">{dealAlerts.length}</Badge>
        </div>
        {isLoading ? (
          <div className="rounded-xl border py-8 text-center text-sm text-gray-500">Loading alerts…</div>
        ) : dealAlerts.length === 0 ? (
          <div className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-800">
            Use the bell on any deal to track it here.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dealAlerts.map((alert) => {
              const dealId = alert.deal?.id || alert.dealId;
              const title = alert.deal?.title || alert.dealTitle || 'Deal alert';
              return (
                <article key={alert._id} className="flex min-w-0 items-center gap-3 rounded-xl border bg-white p-3 dark:border-gray-800 dark:bg-zinc-950">
                  {dealId ? (
                    <Link to={`/deal/${dealId}`} className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                      <DealImage
                        title={title}
                        category={alert.deal?.category || undefined}
                        imageUrl={alert.deal?.imageUrl || undefined}
                        telegramFileId={alert.deal?.telegramFileId || undefined}
                        className="h-16 w-16 rounded-lg object-contain"
                      />
                    </Link>
                  ) : (
                    <div className="h-16 w-16 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-900" />
                  )}
                  <div className="min-w-0 flex-1">
                    {dealId ? (
                      <Link to={`/deal/${dealId}`} className="line-clamp-2 text-sm font-medium leading-5 hover:text-violet-600 hover:underline">
                        {title}
                      </Link>
                    ) : <p className="line-clamp-2 text-sm font-medium">{title}</p>}
                    <p className="mt-1 text-xs text-gray-500">
                      {alert.targetPrice ? `₹${alert.targetPrice.toLocaleString('en-IN')} or less` : 'Any price update'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-center gap-1">
                    <Switch checked={alert.active} onCheckedChange={(active) => void toggle(alert, active)} aria-label={`${alert.active ? 'Pause' : 'Enable'} alert`} />
                    <button type="button" onClick={() => setAlertsToRemove([alert])} className="flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" aria-label="Remove alert">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Keyword alerts</h2>
            <p className="text-xs text-gray-500">Searches checked against every new deal</p>
          </div>
          <Badge variant="secondary" className="rounded-full">{keywordAlerts.length}</Badge>
        </div>
        {!isLoading && keywordAlerts.length === 0 ? (
          <div className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-800">
            Your keyword alerts will appear here.
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {keywordAlerts.map((alert) => (
              <article key={alert._id} className="flex items-center gap-3 rounded-xl border bg-white p-3 dark:border-gray-800 dark:bg-zinc-950">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{alert.keywords.join(', ')}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {alert.targetPrice ? `₹${alert.targetPrice.toLocaleString('en-IN')} or less` : 'Any price'}
                  </p>
                </div>
                <Switch checked={alert.active} onCheckedChange={(active) => void toggle(alert, active)} aria-label={`${alert.active ? 'Pause' : 'Enable'} alert`} />
                <button type="button" onClick={() => setAlertsToRemove([alert])} className="flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" aria-label="Remove alert">
                  <Trash2 className="h-4 w-4" />
                </button>
              </article>
            ))}
          </div>
        )}
      </div>

      {alerts.length > 1 && (
        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={() => setAlertsToRemove(alerts)} className="rounded-full text-xs text-red-600 hover:text-red-700">
            Clear all alerts
          </Button>
        </div>
      )}

      <AuthDialog open={isAuthOpen} onOpenChange={setIsAuthOpen} />
      <AlertDialog open={alertsToRemove.length > 0} onOpenChange={(open) => !open && setAlertsToRemove([])}>
        <AlertDialogContent className="w-[calc(100%-2rem)] rounded-2xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{alertsToRemove.length === 1 ? 'Remove this alert?' : `Remove all ${alertsToRemove.length} alerts?`}</AlertDialogTitle>
            <AlertDialogDescription>Email notifications for {alertsToRemove.length === 1 ? 'this alert' : 'these alerts'} will stop.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep alerts</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmRemove()} className="bg-red-600 text-white hover:bg-red-700">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default AlertCenter;
