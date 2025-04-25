
import React from 'react';
import { Button } from '@/components/ui/button';

const StayUpdated = () => {
  return (
    <section className="relative py-16 overflow-hidden">
      <div className="container mx-auto px-4 text-center relative z-10">
        <div className="glass-effect rounded-3xl p-12 shadow-lg">
          <h2 className="text-2xl font-semibold text-gradient mb-4">Stay Updated</h2>
          <p className="text-apple-gray mb-8">
            Join our Telegram channel to get instant notifications about the best deals.
          </p>
          <Button
            variant="default"
            size="lg"
            className="bg-gradient-to-r from-apple-darkGray to-black text-white rounded-full shadow-lg shadow-apple-darkGray/20 hover:shadow-xl hover:shadow-apple-darkGray/30 transition-all duration-300"
            asChild
          >
            <a href="https://t.me/deals24com" target="_blank" rel="noopener noreferrer">
              Join Telegram Channel
            </a>
          </Button>
        </div>
      </div>
      
      {/* Background decorative elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-full filter blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gradient-to-r from-pink-500/5 to-orange-500/5 rounded-full filter blur-3xl" />
      </div>
    </section>
  );
};

export default StayUpdated;
