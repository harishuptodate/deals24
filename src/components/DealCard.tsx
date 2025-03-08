
import React, { useState } from 'react';
import { Heart, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DealCardProps {
  title: string;
  offerPrice: string;
  regularPrice: string;
  description: string;
  link: string;
}

const DealCard = ({ title, offerPrice, regularPrice, description, link }: DealCardProps) => {
  const [isFavorite, setIsFavorite] = useState(() => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    return favorites.some((fav: any) => fav.title === title);
  });
  const [isOpen, setIsOpen] = useState(false);

  // Extract all links from the description
  const extractLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };
  
  const links = extractLinks(description);
  const hasMultipleLinks = links.length > 1;

  // Truncate link for display
  const truncateLink = (url: string) => {
    try {
      const { hostname } = new URL(url);
      return hostname;
    } catch {
      return url;
    }
  };

  const toggleFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    let newFavorites;
    
    if (isFavorite) {
      newFavorites = favorites.filter((fav: any) => fav.title !== title);
    } else {
      newFavorites = [...favorites, { 
        title, 
        description, 
        link,
        timestamp: new Date().toISOString() 
      }];
    }
    
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
    setIsFavorite(!isFavorite);
  };

  const recordClick = (clickedLink: string) => {
    // Get existing click data or initialize new array
    const clickData = JSON.parse(localStorage.getItem('clickData') || '[]');
    
    // Add new click record
    clickData.push({
      title,
      link: clickedLink,
      timestamp: new Date().toISOString()
    });
    
    // Save back to localStorage
    localStorage.setItem('clickData', JSON.stringify(clickData));
  };

  return (
    <>
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
              <h3 className="text-xl font-semibold text-apple-darkGray line-clamp-2">{title}</h3>
            </div>
            
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gradient">
                {offerPrice}
              </p>
              <p className="text-sm text-apple-gray line-through">
                {regularPrice}
              </p>
            </div>

            <div className="h-20 overflow-hidden">
              <p className="text-sm text-apple-gray line-clamp-4">
                {description}
              </p>
            </div>

            {hasMultipleLinks ? (
              <Button 
                onClick={() => setIsOpen(true)}
                className="inline-block w-full text-center px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-apple-darkGray to-black rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-apple-darkGray/20"
              >
                View Deal Details
              </Button>
            ) : (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => recordClick(link)}
                className="inline-block w-full text-center px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-apple-darkGray to-black rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-apple-darkGray/20"
              >
                Shop Now
              </a>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{title}</DialogTitle>
          </DialogHeader>
          
          <div className="mt-4 text-sm whitespace-pre-line">
            {description}
          </div>
          
          <div className="mt-6 space-y-3">
            <h4 className="font-medium">Available Links:</h4>
            {links.map((link, index) => (
              <a
                key={index}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => recordClick(link)}
                className="flex items-center gap-2 p-3 text-sm rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <ExternalLink size={16} />
                <span className="truncate flex-1">{truncateLink(link)}</span>
              </a>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DealCard;
