import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowLeft, LogOut, ShieldCheck } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { AdminLoginDialog } from '@/components/AdminLoginDialog';
import AdminLogsPanel from '@/components/admin/AdminLogsPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { isAuthenticated, logout } from '@/services/authService';

export default function AdminLogs() {
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const authenticated = isAuthenticated();

  return (
    <div className="min-h-screen bg-stone-50 text-stone-950 dark:bg-[#09090B] dark:text-stone-100">
      <Navbar />
      <main className="container mx-auto max-w-screen-2xl px-4 py-6 sm:py-8">
        <header className="mb-6 flex flex-col gap-5 border-b border-stone-200 pb-6 dark:border-white/10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 transition-colors hover:text-stone-950 dark:text-stone-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Analytics
            </Link>

            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-950 text-white dark:bg-white dark:text-stone-950">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">System activity</h1>
                  {authenticated ? (
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200">
                      <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Admin access
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-400">
                  Monitor incoming deals and quickly investigate warnings, failures, and related requests.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {authenticated ? (
              <Button variant="outline" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            ) : (
              <Button onClick={() => setShowLoginDialog(true)}>Admin Login</Button>
            )}
          </div>
        </header>

        <AdminLogsPanel
          enabled={authenticated}
          onLogin={() => setShowLoginDialog(true)}
        />
      </main>

      {showLoginDialog ? (
        <AdminLoginDialog
          isOpen={showLoginDialog}
          onClose={() => setShowLoginDialog(false)}
          onSuccess={() => setShowLoginDialog(false)}
        />
      ) : null}
    </div>
  );
}
