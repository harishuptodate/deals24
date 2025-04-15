
import React from 'react';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import DealGrid from '../components/DealGrid';
import CategorySection from '../components/CategorySection';
import StayUpdated from '../components/StayUpdated';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-apple-lightGray to-white dark:from-[#1A1A1A] dark:to-[#111111]">
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
