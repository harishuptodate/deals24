import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Database, Radio, ShieldCheck } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { AdminLoginDialog } from '@/components/AdminLoginDialog';
import AdminLogsPanel from '@/components/admin/AdminLogsPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isAuthenticated, logout } from '@/services/authService';

const capabilityCards = [
  {
    icon: Radio,
    title: 'Live tail',
    description: 'SSE stream for current backend flow with stable refresh behavior.',
  },
  {
    icon: Database,
    title: 'Recent + history',
    description: 'Redis-backed recent feed layered with persisted Mongo history.',
  },
  {
    icon: ShieldCheck,
    title: 'Admin protected',
    description: 'Dedicated backend token auth for log access instead of UI-only hiding.',
  },
];

export default function AdminLogs() {
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  const handleLoginSuccess = () => {
    setShowLoginDialog(false);
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-950 dark:bg-[#09090B] dark:text-stone-100">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-stone-200/80 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#111113] dark:shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.14),transparent_30%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_32%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-sm text-stone-700 transition-colors hover:bg-stone-100 dark:border-white/10 dark:bg-white/5 dark:text-stone-300 dark:hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Analytics
              </Link>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-600 dark:text-amber-300">
                  Admin Observability
                </p>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Backend flow logs without console hunting
                </h1>
                <p className="max-w-xl text-sm leading-6 text-stone-600 dark:text-stone-400">
                  Use this page to inspect live Telegram ingestion, Gemini caption flow,
                  Amazon image outcomes, and backend warnings or errors in one place.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isAuthenticated() ? (
                <Button
                  variant="outline"
                  onClick={logout}
                  className="border-stone-300 bg-white/80 text-stone-900 hover:bg-stone-100 dark:border-white/10 dark:bg-white/5 dark:text-stone-100 dark:hover:bg-white/10"
                >
                  Logout
                </Button>
              ) : (
                <Button
                  onClick={() => setShowLoginDialog(true)}
                  className="bg-stone-950 text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-950 dark:hover:bg-white"
                >
                  Admin Login
                </Button>
              )}
            </div>
          </div>

          <div className="relative mt-6 grid gap-4 md:grid-cols-3">
            {capabilityCards.map(({ icon: Icon, title, description }) => (
              <Card
                key={title}
                className="animate-none border-stone-200/80 bg-stone-50/85 shadow-none transition-none hover:scale-100 hover:shadow-none active:scale-100 dark:border-white/10 dark:bg-white/[0.04]"
              >
                <CardHeader className="pb-3">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-900 text-white dark:bg-white dark:text-stone-950">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardDescription className="text-sm text-stone-600 dark:text-stone-400">
                    {description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <AdminLogsPanel enabled={isAuthenticated()} />
        </section>
      </main>

      {showLoginDialog ? (
        <AdminLoginDialog
          isOpen={showLoginDialog}
          onClose={() => setShowLoginDialog(false)}
          onSuccess={handleLoginSuccess}
        />
      ) : null}
    </div>
  );
}
