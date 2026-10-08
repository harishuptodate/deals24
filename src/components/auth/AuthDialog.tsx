import { useEffect, useState } from 'react';
import { CheckCircle2, LogIn, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import EmailDomainSuggestions from './EmailDomainSuggestions';

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
      <DialogContent className="w-[calc(100%-3rem)] max-w-[21rem] gap-3 rounded-xl p-[18px] sm:max-w-[21rem] [&>button]:right-3 [&>button]:top-3 dark:border-gray-800 dark:bg-zinc-950">
        <DialogHeader>
          <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950/60">
            {sent ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <LogIn className="h-4 w-4 text-violet-600" />}
          </div>
          <DialogTitle className="text-base">{sent ? 'Check your email' : 'Sign in to Deals24'}</DialogTitle>
          <DialogDescription className="text-xs leading-5">
            {sent
              ? `We sent a secure, one-time sign-in link to ${email.trim()}.`
              : 'Use your email to sync alerts across browsers. No password required.'}
          </DialogDescription>
        </DialogHeader>
        {!sent && (
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="account-email" className="text-xs">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                <Input
                  id="account-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="h-9 pl-8 text-sm"
                  required
                />
              </div>
              <EmailDomainSuggestions value={email} onChange={setEmail} />
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
            <Button type="submit" disabled={isSending} className="h-9 w-full rounded-full text-sm">
              {isSending ? 'Sending…' : 'Email me a sign-in link'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
