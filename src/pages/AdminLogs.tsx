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
      <main className="container mx-auto max-w-screen-2xl px-2 py-3 sm:px-4 sm:py-6">
        <header className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
          <div className="min-w-0 space-y-2">
            <Link
              to="/admin"
              className="inline-flex min-h-6 items-center gap-1.5 text-xs font-medium text-stone-600 transition-colors hover:text-stone-950 dark:text-stone-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Analytics
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-950 text-white dark:bg-white dark:text-stone-950 sm:flex">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">System logs</h1>
                  {authenticated ? (
                    <Badge variant="outline" className="hidden border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200 sm:inline-flex">
                      <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Admin access
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 hidden text-sm text-stone-600 dark:text-stone-400 sm:block">
                  Follow every deal. Open an entry to read the full log.
                </p>
              </div>
            </div>
          </div>

          <div className="shrink-0">
            {authenticated ? (
              <Button variant="outline" size="sm" className="px-2.5" onClick={logout} aria-label="Sign out">
                <LogOut aria-hidden="true" className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
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
