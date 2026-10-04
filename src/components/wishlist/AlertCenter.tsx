import { useState } from 'react';
import { BellRing, IndianRupee, Mail, Search, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import PriceAlertFields from './PriceAlertFields';

type AlertCenterProps = {
  alerts: DealAlert[];
  isLoading: boolean;
  onCreate: (input: CreateDealAlertInput) => Promise<unknown>;
  onSetActive: (alert: DealAlert, active: boolean) => Promise<unknown>;
  onRemove: (alert: DealAlert) => Promise<unknown>;
};

const AlertCenter = ({ alerts, isLoading, onCreate, onSetActive, onRemove }: AlertCenterProps) => {
  const { toast } = useToast();
  const [email, setEmail] = useState(() => localStorage.getItem('deal-alert-email') || '');
  const [keywords, setKeywords] = useState('');
  const [priceEnabled, setPriceEnabled] = useState(false);
  const [price, setPrice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [alertsToRemove, setAlertsToRemove] = useState<DealAlert[]>([]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const keyword = keywords.trim();
    if (!keyword) return;
    setIsSaving(true);
    try {
      await onCreate({
        type: 'keyword',
        email: email.trim(),
        keywords: [keyword],
        targetPrice: priceEnabled ? Number(price) : null,
      });
      setKeywords('');
      setPrice('');
      setPriceEnabled(false);
      toast({ title: 'Keyword alert created', description: 'New deals will be checked against your search.' });
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
        email: alert.email,
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
    <section className="mb-8 overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/80 via-white to-blue-50/70 shadow-sm dark:border-violet-950 dark:from-violet-950/25 dark:via-zinc-950 dark:to-blue-950/20">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,.95fr)]">
        <div className="p-4 sm:p-6 lg:p-7">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold sm:text-xl">Track a deal by keyword</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Enter one product or keyword. We’ll check every new deal.
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="alert-keywords">Product or keyword</Label>
              <Input
                id="alert-keywords"
                value={keywords}
                onChange={(event) => setKeywords(event.target.value)}
                placeholder="MacBook Air M5 or Samsung 1.5 ton AC"
                maxLength={80}
                className="h-11 bg-white dark:bg-zinc-950"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keyword-alert-email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  id="keyword-alert-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="h-11 bg-white pl-9 dark:bg-zinc-950"
                  required
                />
              </div>
            </div>
            <PriceAlertFields enabled={priceEnabled} onEnabledChange={setPriceEnabled} price={price} onPriceChange={setPrice} />
            <Button type="submit" disabled={isSaving} className="h-11 w-full rounded-full sm:w-auto sm:px-7">
              <BellRing className="mr-2 h-4 w-4" />
              {isSaving ? 'Creating…' : 'Create keyword alert'}
            </Button>
          </form>
        </div>

        <div className="border-t border-violet-100 bg-white/60 p-4 dark:border-violet-950 dark:bg-black/10 sm:p-6 lg:border-l lg:border-t-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Your email alerts</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{alerts.length} configured</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="rounded-full">{alerts.filter((alert) => alert.active).length} active</Badge>
              {alerts.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAlertsToRemove(alerts)}
                  className="h-8 rounded-full px-3 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                >
                  Clear all
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="py-10 text-center text-sm text-gray-500">Loading alerts…</div>
          ) : alerts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center dark:border-gray-700">
              <BellRing className="mx-auto mb-3 h-7 w-7 text-gray-400" />
              <p className="text-sm font-medium">No alerts yet</p>
              <p className="mt-1 text-xs text-gray-500">Create a keyword alert or use the bell on a saved deal.</p>
            </div>
          ) : (
            <div className="max-h-[390px] space-y-2 overflow-y-auto pr-1">
              {alerts.map((alert) => (
                <div key={alert._id} className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-zinc-950">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="rounded-full text-[10px] uppercase">{alert.type}</Badge>
                        {alert.targetPrice && (
                          <span className="inline-flex items-center text-xs font-medium text-green-700 dark:text-green-400">
                            <IndianRupee className="h-3 w-3" />{alert.targetPrice.toLocaleString('en-IN')} or less
                          </span>
                        )}
                      </div>
                      <p className="mt-2 truncate text-sm font-medium">
                        {alert.type === 'deal' ? alert.dealTitle : alert.keywords.join(', ')}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">{alert.email}</p>
                    </div>
                    <Switch
                      checked={alert.active}
                      onCheckedChange={(active) => void toggle(alert, active)}
                      aria-label={`${alert.active ? 'Pause' : 'Enable'} alert`}
                    />
                    <button
                      type="button"
                      onClick={() => setAlertsToRemove([alert])}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                      aria-label="Remove alert"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <AlertDialog open={alertsToRemove.length > 0} onOpenChange={(open) => !open && setAlertsToRemove([])}>
        <AlertDialogContent className="w-[calc(100%-2rem)] rounded-2xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {alertsToRemove.length === 1 ? 'Remove this alert?' : `Remove all ${alertsToRemove.length} alerts?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Email notifications for {alertsToRemove.length === 1 ? 'this deal or search' : 'all saved deals and searches'} will stop. You can undo for 8 seconds after removal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep alerts</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmRemove()}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {alertsToRemove.length === 1 ? 'Remove alert' : 'Remove all alerts'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default AlertCenter;
