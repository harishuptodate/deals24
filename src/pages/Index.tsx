
import React, { lazy, Suspense } from 'react';
import Navbar from '../components/Navbar';
import { Spotlight } from '@/components/ui/Spootlight';
import ErrorBoundary from '../components/ErrorBoundary';
import { Skeleton } from "@/components/ui/skeleton";

// Lazy-loaded components
const HeroSection = lazy(() => import('../components/HeroSection'));
const DealGrid = lazy(() => import('../components/DealGrid'));
const StayUpdated = lazy(() => import('../components/StayUpdated'));

// Loading fallbacks
const HeroSectionFallback = () => (
  <div className="w-full h-[500px] flex items-center justify-center">
    <div className="w-full max-w-6xl px-4 space-y-8">
      <Skeleton className="h-14 w-3/4 mx-auto" />
      <Skeleton className="h-6 w-2/3 mx-auto" />
      <Skeleton className="h-12 w-48 mx-auto rounded-full" />
    </div>
  </div>
);

const DealGridFallback = () => (
  <div className="py-10">
    <div className="container mx-auto px-4">
      <Skeleton className="h-8 w-64 mb-8" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-[290px]">
            <Skeleton className="h-full w-full rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const StayUpdatedFallback = () => (
  <div className="w-full py-16">
    <div className="container mx-auto px-4">
      <Skeleton className="h-8 w-64 mb-4 mx-auto" />
      <Skeleton className="h-6 w-1/2 mb-8 mx-auto" />
      <div className="max-w-md mx-auto">
        <Skeleton className="h-12 w-full rounded-full mb-4" />
        <Skeleton className="h-12 w-32 rounded-full mx-auto" />
      </div>
    </div>
  </div>
);

const Index = () => {
	return (
		<div className="min-h-screen bg-gradient-to-b from-apple-lightGray to-white dark:from-[#09090B] dark:to-[#09090B]">
			{/* Spotlight behind */}
			<div className="dark:block hidden">
				<Spotlight
					className="absolute left-1/4 top-0 -translate-x-1/2 scale-125 md:left-60 md:top-[-5rem] md:scale-100 max-w-full overflow-hidden md:max-w-none"
					fill="gray"
				/>
			</div>
			<ErrorBoundary>
				<Navbar />
			</ErrorBoundary>
			<main>
				<ErrorBoundary>
					<Suspense fallback={<HeroSectionFallback />}>
						<HeroSection />
					</Suspense>
				</ErrorBoundary>
				<ErrorBoundary>
					<Suspense fallback={<DealGridFallback />}>
						<DealGrid />
					</Suspense>
				</ErrorBoundary>
				<ErrorBoundary>
					<Suspense fallback={<StayUpdatedFallback />}>
						<StayUpdated />
					</Suspense>
				</ErrorBoundary>
			</main>
		</div>
	);
};

export default Index;
