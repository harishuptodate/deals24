import { useEffect, useState } from 'react';
import { CheckCircle2, LogIn, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';

type AuthDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const { sendMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setSent(false);
      setError('');
    }
  }, [open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSending(true);
    setError('');
    try {
      await sendMagicLink(email.trim());
      setSent(true);
    } catch {
      setError('We could not send the sign-in link. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] rounded-2xl sm:max-w-md dark:border-gray-800 dark:bg-zinc-950">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950/60">
            {sent ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <LogIn className="h-5 w-5 text-violet-600" />}
          </div>
          <DialogTitle>{sent ? 'Check your email' : 'Sign in to Deals24'}</DialogTitle>
          <DialogDescription>
            {sent
              ? `We sent a secure, one-time sign-in link to ${email.trim()}.`
              : 'Use your email to sync alerts across browsers. No password required.'}
          </DialogDescription>
        </DialogHeader>
        {!sent && (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account-email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  id="account-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="h-11 pl-9"
                  required
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <Button type="submit" disabled={isSending} className="h-11 w-full rounded-full">
              {isSending ? 'Sending…' : 'Email me a sign-in link'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
