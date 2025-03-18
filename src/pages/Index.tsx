
import React from 'react';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import DealGrid from '../components/DealGrid';
import CategorySection from '../components/CategorySection';
import StayUpdated from '../components/StayUpdated';

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <HeroSection />
        <DealGrid />
        {/* <CategorySection /> */}
        <StayUpdated />
      </main>
    </div>
  );
};

export default Index;
