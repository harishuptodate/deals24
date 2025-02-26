
import React from 'react';
import DealCard from './DealCard';

const SAMPLE_DEALS = [
  {
    title: "boAt Aavante Bar 3200D Pro Soundbar",
    offerPrice: "₹4,950",
    regularPrice: "₹12,999",
    description: "Apply ₹2000 coupon • 3549 Off With ICICI CC",
    link: "https://amzn.to/4h1HHEZ",
  },
  // Add more sample deals here
];

const DealGrid = () => {
  return (
    <section className="py-16 bg-gradient-to-b from-apple-lightGray to-white">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SAMPLE_DEALS.map((deal, index) => (
            <DealCard
              key={index}
              {...deal}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default DealGrid;
