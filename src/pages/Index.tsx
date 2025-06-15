
import React from 'react';
import Navbar from '../components/Navbar';
import { Spotlight } from '@/components/ui/Spootlight';
import ErrorBoundary from '../components/ErrorBoundary';
import HeroSection from '../components/HeroSection';
import DealGrid from '../components/DealGrid';
import StayUpdated from '../components/StayUpdated';

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
					<HeroSection />
				</ErrorBoundary>
				<ErrorBoundary>
					<DealGrid />
				</ErrorBoundary>
				<ErrorBoundary>
					<StayUpdated />
				</ErrorBoundary>
			</main>
		</div>
	);
};

export default Index;
