
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Button } from '@/components/ui/button';
import { BigFooter } from '@/components/BigFooter';
import DealPageHeader from '../components/deal/DealPageHeader';
import DealPageContent from '../components/deal/DealPageContent';
import { useDealPage } from '../hooks/useDealPage';
import DealAlertDialog from '@/components/wishlist/DealAlertDialog';
import { createDealAlert } from '@/services/api/alertsApi';

const Deal = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const {
    deal,
    isLoading,
    isError,
    isSaved,
    isSharing,
    handleGoBack,
    handleShare,
    handleToggleWishlist,
  } = useDealPage(id);

  return (
    <div className="min-h-screen bg-white dark:bg-[#09090B]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-8 md:py-8 lg:px-12">
        {isLoading ? (
          <div role="status" aria-label="Loading deal" className="animate-pulse">
            <span className="sr-only">Loading deal…</span>
            <div className="mb-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800" />
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-14">
              <div className="aspect-square rounded-3xl bg-zinc-100 dark:bg-zinc-800" />
              <div className="space-y-6">
                <div className="h-8 w-3/4 rounded bg-zinc-100 dark:bg-zinc-800" />
                <div className="h-4 w-1/3 rounded bg-zinc-100 dark:bg-zinc-800" />
                <div className="h-12 w-60 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                <div className="h-64 rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
              </div>
            </div>
          </div>
        ) : isError ? (
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold text-red-500 mb-2">Error Loading Deal</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We couldn't find this deal. It may have been removed or the link might be incorrect.
            </p>
            <Button onClick={() => navigate('/deals')}>
              Browse All Deals
            </Button>
          </div>
        ) : deal ? (
          <>
            <div className="mb-6 border-b border-zinc-100 pb-5 dark:border-zinc-800 md:mb-10">
              <DealPageHeader
                onGoBack={handleGoBack}
                isSaved={isSaved}
                isSharing={isSharing}
                onToggleWishlist={handleToggleWishlist}
                onShare={handleShare}
                onCreateAlert={() => setIsAlertDialogOpen(true)}
              />
            </div>
            <DealPageContent deal={deal} id={id} />
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-300">Deal not found</p>
          </div>
        )}
      </main>
      <div className="mt-8">
        <BigFooter />
      </div>
      <DealAlertDialog
        deal={deal && id ? { id, title: deal.text?.split('\n')[0] || 'Deal' } : null}
        open={isAlertDialogOpen}
        onOpenChange={setIsAlertDialogOpen}
        onCreate={createDealAlert}
      />
    </div>
  );
};

export default Deal;
