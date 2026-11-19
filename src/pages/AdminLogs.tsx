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
    <div className="admin-logs-page min-h-screen bg-[var(--log-bg)] font-inter text-[var(--log-ink)] [&>header]:[container-type:inline-size]">
      <a href="#logs-content" className="logs-skip-link fixed left-4 top-2 z-[60] -translate-y-[calc(100%+1rem)] rounded-full bg-blue-600 px-4 py-3 text-white shadow-sm focus:translate-y-0">Skip to logs</a>
      <Navbar />
      <main className="logs-main mx-auto max-w-7xl px-3 pt-3 pb-[max(2rem,env(safe-area-inset-bottom))] min-[360px]:px-4 sm:px-8 md:pt-6 lg:px-12">
        <header className="logs-page-header mb-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Button asChild variant="ghost" className="deal-button h-auto rounded-full px-3 text-zinc-600 dark:text-zinc-400">
              <Link to="/admin" className="logs-back">
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Analytics
              </Link>
            </Button>
            {authenticated ? (
              <Button variant="dealSecondary" size="sm" className="logs-button h-auto rounded-full px-3" onClick={logout} aria-label="Sign out">
                <LogOut aria-hidden="true" className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            ) : (
              <Button variant="dealPrimary" onClick={() => setShowLoginDialog(true)}>Admin Login</Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="logs-page-icon hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 sm:flex">
              <Activity aria-hidden="true" className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 id="logs-content" tabIndex={-1} className="logs-page-title scroll-mt-24 text-[1.275rem] font-semibold leading-tight tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-[1.59375rem] xl:text-[1.9125rem]">System logs</h1>
                {authenticated ? (
                  <Badge variant="outline" className="logs-access hidden border-zinc-200 bg-zinc-50 font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 sm:inline-flex">
                    <ShieldCheck aria-hidden="true" className="mr-1 h-3.5 w-3.5" /> Admin access
                  </Badge>
                ) : null}
              </div>
              <p className="logs-muted mt-1 hidden text-sm leading-6 text-zinc-600 dark:text-zinc-400 sm:block">
                A clear view of incoming deals, requests, and system activity.
              </p>
            </div>
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
