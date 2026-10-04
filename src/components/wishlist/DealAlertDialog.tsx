import { useEffect, useState } from 'react';
import { BellRing, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import type { CreateDealAlertInput } from '@/services/api/alertsApi';
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
      await onCreate({
        type: 'deal',
        dealId: deal.id,
        email: email.trim(),
        targetPrice: priceEnabled ? Number(price) : null,
      });
      toast({ title: 'Deal alert enabled', description: 'We’ll email you when this deal matches your settings.' });
      onOpenChange(false);
      setPriceEnabled(false);
      setPrice('');
    } catch (error) {
      toast({
        title: 'Could not enable alert',
        description: 'Check your email and price, then try again.',
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
          <DialogTitle>Notify me about this deal</DialogTitle>
          <DialogDescription className="line-clamp-2">{deal?.title}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
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
          <PriceAlertFields
            enabled={priceEnabled}
            onEnabledChange={setPriceEnabled}
            price={price}
            onPriceChange={setPrice}
          />
          <Button type="submit" disabled={isSaving || !deal?.id} className="h-11 w-full rounded-full">
            <BellRing className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving alert…' : 'Turn on email alerts'}
          </Button>
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            You can pause or remove this alert anytime from your wishlist.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DealAlertDialog;
