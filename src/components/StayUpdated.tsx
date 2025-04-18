
import React from 'react';
import { Button } from '@/components/ui/button';

const StayUpdated = () => {
  return (
    <section className="relative py-16 overflow-hidden dark:bg-[#0a0a0a]">
      <div className="container mx-auto px-4 text-center relative z-10">
        <div className="rounded-3xl p-12 shadow-lg">
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
          <div className=" w-full flex mt-4 items-center justify-center p-2  ">
				<h1 className="text-center text-5xl md:text-6xl lg:text-[5rem] font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-700 to-neutral-900 !text-transparent dark:!text-transparent">
					Deals24
				</h1>
			</div>
        </div>
      </div>
    </section>
  );
};

export default StayUpdated;
