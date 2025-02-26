
import React, { useState } from 'react';
import { Heart } from 'lucide-react';

interface DealCardProps {
  title: string;
  offerPrice: string;
  regularPrice: string;
  description: string;
  link: string;
}

const DealCard = ({ title, offerPrice, regularPrice, description, link }: DealCardProps) => {
  const [isFavorite, setIsFavorite] = useState(() => {
    const favorites = JSON.parse(sessionStorage.getItem('favorites') || '[]');
    return favorites.includes(title);
  });

  const toggleFavorite = () => {
    const favorites = JSON.parse(sessionStorage.getItem('favorites') || '[]');
    let newFavorites;
    
    if (isFavorite) {
      newFavorites = favorites.filter((fav: string) => fav !== title);
    } else {
      newFavorites = [...favorites, title];
    }
    
    sessionStorage.setItem('favorites', JSON.stringify(newFavorites));
    setIsFavorite(!isFavorite);
  };

  return (
    <div className="group animate-fade-up hover-scale">
      <div className="relative glass-effect rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
        <button
          onClick={toggleFavorite}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <Heart
            className={`w-5 h-5 transition-colors ${
              isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'
            }`}
          />
        </button>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="inline-block px-3 py-1 text-xs font-medium bg-gradient-to-r from-apple-lightGray to-white rounded-full text-apple-darkGray shadow-sm">
              Hot Deal
            </span>
            <h3 className="text-xl font-semibold text-apple-darkGray">{title}</h3>
          </div>
          
          <div className="space-y-1">
            <p className="text-2xl font-bold text-gradient">
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
            className="inline-block w-full text-center px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-apple-darkGray to-black rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-apple-darkGray/20"
          >
            Shop Now
          </a>
        </div>
      </div>
    </div>
  );
};

export default DealCard;
