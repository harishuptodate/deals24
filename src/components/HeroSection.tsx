
import React from 'react';

const HeroSection = () => {
  return (
    <section className="relative py-20 overflow-hidden bg-apple-lightGray">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-up">
          <span className="inline-block px-4 py-2 text-sm font-medium bg-white rounded-full text-apple-darkGray">
            Latest Deals
          </span>
          <h1 className="text-5xl md:text-6xl font-bold text-apple-darkGray tracking-tight">
            Exclusive Deals,
            <br />
            Handpicked for You
          </h1>
          <p className="text-xl text-apple-gray max-w-2xl mx-auto">
            Discover amazing products at unbeatable prices. Updated daily with the best deals across electronics, gadgets, and more.
          </p>
        </div>
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent to-white/20" />
    </section>
  );
};

export default HeroSection;
