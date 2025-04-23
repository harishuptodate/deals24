import React from 'react';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import DealGrid from '../components/DealGrid';
import StayUpdated from '../components/StayUpdated';
import { Spotlight } from '@/components/ui/Spootlight';

const Index = () => {
	return (
		<div className="relative overflow-hidden min-h-screen bg-gradient-to-b from-apple-lightGray to-white dark:from-[#09090B] dark:to-[#09090B]">
			<Spotlight
				className="left-1/2 top-24 -translate-x-1/2 scale-125 md:left-60 md:top-[-5rem] md:scale-100"
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
