
import React from 'react';
import { Button } from '@/components/ui/button';

const StayUpdated = () => {
  return (
    <section className="py-16 bg-apple-lightGray">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-2xl font-semibold text-apple-darkGray mb-4">Stay Updated</h2>
        <p className="text-apple-gray mb-8">
          Join our Telegram channel to get instant notifications about the best deals.
        </p>
        <Button
          variant="default"
          size="lg"
          className="bg-apple-darkGray hover:bg-black text-white rounded-full"
          asChild
        >
          <a href="https://t.me/deals24com" target="_blank" rel="noopener noreferrer">
            Join Telegram Channel
          </a>
        </Button>
      </div>
    </section>
  );
};

export default StayUpdated;
