
import React from 'react';
import { Button } from '@/components/ui/button';

const HeroSection = () => {
  return (
    <section className="relative py-20 overflow-hidden bg-gradient-to-b from-apple-lightGray to-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-up">
          <span className="inline-block px-4 py-2 text-sm font-medium glass-effect rounded-full text-apple-darkGray shadow-sm">
            Welcome to Deals24
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-gradient tracking-tight leading-tight">
            Your one-stop destination for the latest deals, discounts, and offers across electronics, fashion, and more.
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button
              variant="default"
              size="lg"
              className="bg-gradient-to-r from-apple-darkGray to-black text-white rounded-full shadow-lg shadow-apple-darkGray/20 hover:shadow-xl hover:shadow-apple-darkGray/30 transition-all duration-300"
              asChild
            >
              <a href="https://t.me/deals24com" target="_blank" rel="noopener noreferrer">
                Join Our Telegram
              </a>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="rounded-full glass-effect hover:bg-white/50 transition-all duration-300"
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
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full filter blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-gradient-to-r from-pink-500/10 to-orange-500/10 rounded-full filter blur-3xl" />
      </div>
    </section>
  );
};

export default HeroSection;
