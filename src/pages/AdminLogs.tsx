import { cn } from '@/lib/utils';
import { adminLogButtonClassName } from '@/components/admin/adminLogStyles';
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
    <div className="admin-logs-page bg-[var(--log-bg)] font-inter text-[var(--log-ink)] [&>header]:[container-type:inline-size] min-h-screen">
      <a href="#logs-content" className="logs-skip-link fixed left-4 top-2 z-[60] -translate-y-[calc(100%+1rem)] rounded-lg bg-[var(--log-primary-fill)] px-4 py-3 text-white focus:translate-y-0">Skip to logs</a>
      <Navbar />
      <main className="logs-main px-3 pt-2 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-4 sm:pb-8 mx-auto max-w-screen-2xl">
        <header className="logs-page-header mb-4 flex items-center justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <Link
              to="/admin"
              className="logs-back min-h-11 text-[var(--log-muted)] hover:text-[var(--log-primary)] inline-flex items-center gap-1.5 text-xs font-medium"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Analytics
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="logs-page-icon bg-[var(--log-primary-fill)] text-white hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:flex">
                <Activity aria-hidden="true" className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 id="logs-content" tabIndex={-1} className="logs-page-title scroll-mt-24 text-[clamp(1.375rem,1.125rem+1vw,1.875rem)] leading-[1.2] text-[var(--log-ink)] font-semibold tracking-tight">System logs</h1>
                  {authenticated ? (
                    <Badge variant="outline" className="logs-access border-[var(--log-border)] bg-[var(--log-raised)] font-medium text-[var(--log-muted)] hidden sm:inline-flex">
                      <ShieldCheck aria-hidden="true" className="mr-1 h-3.5 w-3.5" /> Admin access
                    </Badge>
                  ) : null}
                </div>
                <p className="logs-muted text-[var(--log-muted)] mt-1 hidden text-sm sm:block">
                  A clear view of incoming deals, requests, and system activity.
                </p>
              </div>
            </div>
          </div>

          <div className="shrink-0">
            {authenticated ? (
              <Button variant="outline" size="sm" className={cn(adminLogButtonClassName, "logs-button px-2.5")} onClick={logout} aria-label="Sign out">
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
