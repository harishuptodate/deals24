import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { createDealAlert } from '@/services/api/alertsApi';

export default function AuthVerify() {
  const { completeSignIn } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const started = useRef(false);
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = searchParams.get('token');
    if (!token) {
      setState('error');
      return;
    }
    completeSignIn(token)
      .then(async () => {
        setState('success');
        try {
          const pendingAlert = localStorage.getItem('pending-deal-alert');
          if (pendingAlert) {
            const parsed = JSON.parse(pendingAlert) as { dealId?: string; targetPrice?: number | null };
            if (parsed.dealId) {
              await createDealAlert({ type: 'deal', dealId: parsed.dealId, targetPrice: parsed.targetPrice });
            }
          }
          const pendingKeywordAlert = localStorage.getItem('pending-keyword-alert');
          if (pendingKeywordAlert) {
            const parsed = JSON.parse(pendingKeywordAlert) as { keywords?: string[]; targetPrice?: number | null };
            if (parsed.keywords?.length) {
              await createDealAlert({ type: 'keyword', keywords: parsed.keywords, targetPrice: parsed.targetPrice });
            }
          }
        } catch {
          // Sign-in succeeded; the user can recreate a pending alert from the wishlist.
        } finally {
          localStorage.removeItem('pending-deal-alert');
          localStorage.removeItem('pending-keyword-alert');
        }
        window.setTimeout(() => navigate('/wishlist?login=success', { replace: true }), 900);
      })
      .catch(() => setState('error'));
  }, [completeSignIn, navigate, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-[#09090B]">
      <div className="w-full max-w-md rounded-3xl border bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-zinc-950">
        {state === 'loading' && <Loader2 className="mx-auto mb-4 h-9 w-9 animate-spin text-violet-600" />}
        {state === 'success' && <CheckCircle2 className="mx-auto mb-4 h-9 w-9 text-green-600" />}
        {state === 'error' && <XCircle className="mx-auto mb-4 h-9 w-9 text-red-600" />}
        <h1 className="text-xl font-semibold">
          {state === 'loading' ? 'Signing you in…' : state === 'success' ? 'You’re signed in' : 'Link unavailable'}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {state === 'error' ? 'This sign-in link is invalid, expired, or has already been used.' : 'Your alerts will now stay in sync across browsers.'}
        </p>
        {state === 'error' && <Button asChild className="mt-6 rounded-full"><Link to="/wishlist">Return to Deals24</Link></Button>}
      </div>
    </main>
  );
}
