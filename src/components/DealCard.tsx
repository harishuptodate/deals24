
import React from 'react';

interface DealCardProps {
  title: string;
  offerPrice: string;
  regularPrice: string;
  description: string;
  link: string;
}

const DealCard = ({ title, offerPrice, regularPrice, description, link }: DealCardProps) => {
  return (
    <div className="group animate-fade-up backdrop-blur-sm bg-white/80 rounded-2xl p-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <div className="space-y-4">
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 text-xs font-medium bg-apple-lightGray rounded-full text-apple-darkGray">
            Hot Deal
          </span>
          <h3 className="text-xl font-semibold text-apple-darkGray">{title}</h3>
        </div>
        
        <div className="space-y-1">
          <p className="text-2xl font-bold text-apple-darkGray">
            {offerPrice}
          </p>
          <p className="text-sm text-apple-gray line-through">
            {regularPrice}
          </p>
        </div>

        <p className="text-sm text-apple-gray">
          {description}
        </p>

        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block w-full text-center px-6 py-3 text-sm font-medium text-white bg-apple-darkGray rounded-full transition-colors duration-200 hover:bg-black"
        >
          Shop Now
        </a>
      </div>
    </div>
  );
};

export default DealCard;
