import { useEffect, useState } from 'react';
import { BellRing, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import type { CreateDealAlertInput } from '@/services/api/alertsApi';
import { useAuth } from '@/contexts/AuthContext';
import PriceAlertFields from './PriceAlertFields';

export type AlertableDeal = { id?: string; title: string };

type DealAlertDialogProps = {
  deal: AlertableDeal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: CreateDealAlertInput) => Promise<unknown>;
};

const DealAlertDialog = ({ deal, open, onOpenChange, onCreate }: DealAlertDialogProps) => {
  const { toast } = useToast();
  const { user, sendMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [priceEnabled, setPriceEnabled] = useState(false);
  const [price, setPrice] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) setEmail(localStorage.getItem('deal-alert-email') || '');
  }, [open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!deal?.id) return;
    setIsSaving(true);
    try {
      const targetPrice = priceEnabled ? Number(price) : null;
      if (user) {
        await onCreate({ type: 'deal', dealId: deal.id, targetPrice });
        toast({ title: 'Deal alert enabled', description: `Notifications will be sent to ${user.email}.` });
      } else {
        localStorage.setItem('pending-deal-alert', JSON.stringify({ dealId: deal.id, targetPrice }));
        localStorage.setItem('deal-alert-email', email.trim());
        await sendMagicLink(email.trim());
        toast({ title: 'Check your email', description: 'Your alert will be created after you sign in.' });
      }
      onOpenChange(false);
      setPriceEnabled(false);
      setPrice('');
    } catch {
      toast({
        title: user ? 'Could not enable alert' : 'Could not send sign-in link',
        description: 'Check the details and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] rounded-2xl sm:max-w-md dark:border-gray-800 dark:bg-zinc-950">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950/60">
            <BellRing className="h-5 w-5 text-violet-600 dark:text-violet-300" />
          </div>
          <DialogTitle>{user ? 'Notify me about this deal' : 'Sign in to create this alert'}</DialogTitle>
          <DialogDescription className="line-clamp-2">
            {user ? deal?.title : 'We’ll send a secure sign-in link, then create this alert automatically.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {!user && (
            <div className="space-y-2">
              <Label htmlFor="deal-alert-email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  id="deal-alert-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="h-11 pl-9"
                  required
                />
              </div>
            </div>
          )}
          <PriceAlertFields
            enabled={priceEnabled}
            onEnabledChange={setPriceEnabled}
            price={price}
            onPriceChange={setPrice}
          />
          <Button type="submit" disabled={isSaving || !deal?.id} className="h-11 w-full rounded-full">
            <BellRing className="mr-2 h-4 w-4" />
            {isSaving ? 'Please wait…' : user ? 'Turn on email alerts' : 'Email sign-in link'}
          </Button>
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            {user ? `Signed in as ${user.email}` : 'Your alerts will sync anywhere you sign in.'}
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DealAlertDialog;
