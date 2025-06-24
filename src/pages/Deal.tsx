
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Button } from '@/components/ui/button';
import { BigFooter } from '@/components/BigFooter';
import DealPageHeader from '../components/deal/DealPageHeader';
import DealPageContent from '../components/deal/DealPageContent';
import { useDealPage } from '../hooks/useDealPage';

const Deal = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
      <main className="container mx-auto max-w-4xl px-4 py-6 md:py-12">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
            <div className="flex justify-between items-start mb-6">
              <DealPageHeader
                onGoBack={handleGoBack}
                isSaved={isSaved}
                isSharing={isSharing}
                onToggleWishlist={handleToggleWishlist}
                onShare={handleShare}
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
    </div>
  );
};

export default Deal;
