import { useState } from 'react';
import { ArrowLeft, LogOut, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { AdminLoginDialog } from '@/components/AdminLoginDialog';
import BlacklistManager from '@/components/admin/BlacklistManager';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { isAuthenticated, logout } from '@/services/authService';

export default function AdminBlacklist() {
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const authenticated = isAuthenticated();

  return (
    <div className="min-h-screen bg-stone-50 text-stone-950 dark:bg-[#09090B] dark:text-stone-100">
      <Navbar />
      <main className="container mx-auto max-w-screen-xl px-4 py-6 sm:py-8">
        <header className="mb-6 flex flex-col gap-5 border-b border-stone-200 pb-6 dark:border-white/10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 transition-colors hover:text-stone-950 dark:text-stone-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Admin dashboard
            </Link>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Deal policy</h1>
                {authenticated && (
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200">
                    <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Admin access
                  </Badge>
                )}
              </div>
              <p className="mt-1.5 text-sm leading-6 text-stone-600 dark:text-stone-400">
                Manage default blacklist entries and precise brand-product rules.
              </p>
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

        {authenticated ? (
          <BlacklistManager />
        ) : (
          <section className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-stone-200 bg-white px-4 text-center dark:border-white/10 dark:bg-[#111113]">
            <ShieldCheck className="h-9 w-9 text-stone-300 dark:text-stone-600" />
            <h2 className="mt-4 text-lg font-semibold">Admin access required</h2>
            <p className="mt-1 max-w-md text-sm text-stone-500 dark:text-stone-400">
              Sign in before viewing or changing deal policy.
            </p>
            <Button className="mt-5" onClick={() => setShowLoginDialog(true)}>Admin Login</Button>
          </section>
        )}
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
