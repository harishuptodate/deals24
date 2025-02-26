
import React from 'react';
import { Button } from '@/components/ui/button';

const HeroSection = () => {
  return (
    <section className="relative py-20 overflow-hidden bg-apple-lightGray">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-up">
          <span className="inline-block px-4 py-2 text-sm font-medium bg-white rounded-full text-apple-darkGray">
            Welcome to Deals24
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-apple-darkGray tracking-tight leading-tight">
            Your one-stop destination for the latest deals, discounts, and offers across electronics, fashion, and more.
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button
              variant="default"
              size="lg"
              className="bg-apple-darkGray hover:bg-black text-white rounded-full"
              asChild
            >
              <a href="https://t.me/deals24com" target="_blank" rel="noopener noreferrer">
                Join Our Telegram
              </a>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="rounded-full"
              asChild
            >
              <a href="/categories">Browse Categories</a>
            </Button>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent to-white/20" />
    </section>
  );
};

export default HeroSection;
