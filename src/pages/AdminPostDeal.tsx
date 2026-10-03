import axios from 'axios';
import { FormEvent, useState } from 'react';
import { ArrowLeft, ExternalLink, Loader2, LogOut, Send, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { AdminLoginDialog } from '@/components/AdminLoginDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { isAuthenticated, logout } from '@/services/authService';
import { postAdminDeal } from '@/services/api';

export default function AdminPostDeal() {
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [postedDealId, setPostedDealId] = useState<string | null>(null);
  const authenticated = isAuthenticated();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!message.trim() || !authenticated) return;

    setIsSubmitting(true);
    setPostedDealId(null);
    try {
      const deal = await postAdminDeal(message.trim());
      setPostedDealId(deal._id || deal.id);
      setMessage('');
      toast({
        title: 'Deal processed',
        description: 'The message completed the same parsing and matching flow as an incoming deal.',
      });
    } catch (error) {
      const description = axios.isAxiosError(error)
        ? error.response?.data?.error || 'The deal could not be processed.'
        : 'The deal could not be processed.';
      toast({ title: 'Could not post deal', description, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-stone-950 dark:bg-[#09090B] dark:text-stone-100">
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 py-6 md:py-12">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-950 dark:text-stone-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Admin dashboard
            </Link>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-950 text-white dark:bg-white dark:text-stone-950">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Post a deal</h1>
                  {authenticated && (
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200">
                      <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Admin access
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                  Paste the raw deal message exactly as you would send it to the Telegram channel.
                </p>
              </div>
            </div>
          </div>

          {authenticated ? (
            <Button variant="outline" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          ) : (
            <Button onClick={() => setShowLoginDialog(true)}>Admin Login</Button>
          )}
        </header>

        <section className="glass-effect rounded-xl border border-gray-200 p-4 shadow-md dark:border-gray-900 dark:bg-zinc-950 sm:p-6">
          {authenticated ? (
            <form onSubmit={handleSubmit}>
              <label htmlFor="deal-message" className="mb-2 block text-sm font-semibold">
                Deal message
              </label>
              <Textarea
                id="deal-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={'Product name @ ₹999\nOffer details\nhttps://example.com/product'}
                maxLength={10_000}
                className="min-h-[280px] resize-y font-mono text-sm sm:min-h-[340px]"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-stone-400">
                <span>The normal filters, parser, matching, and price-history flow will run.</span>
                <span>{message.length.toLocaleString('en-IN')} / 10,000</span>
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {postedDealId ? (
                  <Link
                    to={`/deal/${postedDealId}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
                  >
                    View processed deal <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                ) : <span />}
                <Button type="submit" disabled={isSubmitting || !message.trim()} className="sm:min-w-32">
                  {isSubmitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing</>
                  ) : (
                    <><Send className="mr-2 h-4 w-4" /> Post deal</>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center px-4 text-center">
              <ShieldCheck className="h-9 w-9 text-stone-300 dark:text-stone-600" />
              <h2 className="mt-4 text-lg font-semibold">Admin access required</h2>
              <p className="mt-1 max-w-md text-sm text-stone-500 dark:text-stone-400">
                Sign in before submitting a deal to the ingestion pipeline.
              </p>
              <Button className="mt-5" onClick={() => setShowLoginDialog(true)}>Admin Login</Button>
            </div>
          )}
        </section>
      </main>

      {showLoginDialog && (
        <AdminLoginDialog
          isOpen={showLoginDialog}
          onClose={() => setShowLoginDialog(false)}
          onSuccess={() => setShowLoginDialog(false)}
        />
      )}
    </div>
  );
}
