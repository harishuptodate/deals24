
import React from 'react';
import { Button } from '@/components/ui/button';

const HeroSection = () => {
  return (
    <section className="relative py-12 md:py-20 overflow-hidden bg-gradient-to-b from-apple-lightGray to-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6 md:space-y-8 animate-fade-up">
          <span className="inline-block px-4 py-2 text-sm font-medium glass-effect rounded-full text-apple-darkGray shadow-sm">
            Welcome to Deals24
          </span>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gradient tracking-tight leading-tight">
            <span className="block text-2xl md:text-3xl lg:text-4xl mb-2">Your one-stop destination for</span>
            deals, discounts, and offers
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button
              variant="default"
              size="lg"
              className="bg-gradient-to-r from-apple-darkGray to-black text-white rounded-full shadow-lg shadow-apple-darkGray/20 hover:shadow-xl hover:shadow-apple-darkGray/30 transition-all duration-300 text-sm md:text-base px-4 py-2 h-auto"
              asChild
            >
              <a href="https://t.me/deals24com" target="_blank" rel="noopener noreferrer">
                Join Our Telegram
              </a>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="rounded-full glass-effect hover:bg-white/50 transition-all duration-300 text-sm md:text-base px-4 py-2 h-auto"
              asChild
            >
              <a href="/categories">Browse Categories</a>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/20" />
        <div className="absolute top-0 left-1/4 w-48 md:w-64 h-48 md:h-64 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full filter blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-48 md:w-64 h-48 md:h-64 bg-gradient-to-r from-pink-500/10 to-orange-500/10 rounded-full filter blur-3xl" />
      </div>
    </section>
  );
};

export default HeroSection;
