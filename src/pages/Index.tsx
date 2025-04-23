import React from 'react';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import DealGrid from '../components/DealGrid';
import StayUpdated from '../components/StayUpdated';
import { Spotlight } from '@/components/ui/Spootlight';

const Index = () => {
	return (
		<div className="min-h-screen bg-gradient-to-b from-apple-lightGray to-white dark:from-[#09090B] dark:to-[#09090B]">
			{/* Spotlight behind */}
			<Spotlight
				className="absolute left-1/4 top-0 -translate-x-1/2 scale-125 md:left-60 md:top-[-5rem] md:scale-100 max-w-full overflow-hidden md:max-w-none"
				fill="gray"
			/>
			<Navbar />
			<main>
				<HeroSection />
				<DealGrid />
				<StayUpdated />
			</main>
		</div>
	);
};

export default Index;
