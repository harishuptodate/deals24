
import React, { useState, useEffect } from 'react';
import { Heart, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trackMessageClick, getAmazonProductImage } from '../services/api';
import { useToast } from "@/components/ui/use-toast";

interface DealCardProps {
  title: string;
  description: string;
  link: string;
  id?: string;
  imageUrl?: string;
}

const DealCard = ({ title, description, link, id, imageUrl }: DealCardProps) => {
  const { toast } = useToast();
  const [isFavorite, setIsFavorite] = useState(() => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    return favorites.some((fav: any) => fav.title === title);
  });
  const [isOpen, setIsOpen] = useState(false);
  const [productImage, setProductImage] = useState<string | null>(imageUrl || null);
  const [isImageLoading, setIsImageLoading] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  // Fetch Amazon product image if the link is from Amazon and no image is provided
  useEffect(() => {
    const fetchAmazonImage = async () => {
      if (!imageUrl && link && link.includes('amazon') && !productImage && !imageError) {
        try {
          setIsImageLoading(true);
          console.log('Fetching Amazon product image for:', link);
          const fetchedImageUrl = await getAmazonProductImage(link);
          
          if (fetchedImageUrl) {
            console.log('Successfully fetched image:', fetchedImageUrl);
            setProductImage(fetchedImageUrl);
          } else {
            console.log('No image URL returned from Amazon API');
            setImageError(true);
          }
        } catch (error) {
          console.error('Failed to fetch Amazon product image:', error);
          setImageError(true);
          toast({
            title: "Image Error",
            description: "Could not load product image",
            variant: "destructive",
          });
        } finally {
          setIsImageLoading(false);
        }
      }
    };

    fetchAmazonImage();
  }, [imageUrl, link, productImage, imageError, toast]);

  const extractLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };
  
  const links = extractLinks(description);
  const hasMultipleLinks = links.length > 1;

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
        imageUrl: productImage,
        id,
        timestamp: new Date().toISOString() 
      }];
    }
    
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
    setIsFavorite(!isFavorite);
  };

  const recordClick = (clickedLink: string) => {
    // Record click to localStorage
    const clickData = JSON.parse(localStorage.getItem('clickData') || '[]');
    clickData.push({
      title,
      link: clickedLink,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('clickData', JSON.stringify(clickData));
    
    // Track click to backend if ID is available
    if (id) {
      console.log(`Tracking click for message ID: ${id}`);
      trackMessageClick(id).catch(err => 
        console.error('Failed to track click for message', id, err)
      );
    }
  };

  // Function to make links in text clickable
  const makeLinksClickable = (text: string) => {
    if (!text) return '';
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => recordClick(part)}
            className="text-blue-600 hover:underline break-all inline-flex items-center gap-1"
          >
            {truncateLink(part)}
            <ExternalLink size={12} />
          </a>
        );
      }
      return part;
    });
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
            
            {isImageLoading ? (
              <div className="w-full h-48 flex items-center justify-center bg-gray-100 rounded-lg">
                <div className="w-8 h-8 border-4 border-t-apple-darkGray rounded-full animate-spin"></div>
              </div>
            ) : productImage && !imageError ? (
              <div className="w-full h-48 overflow-hidden rounded-lg">
                <img 
                  src={productImage} 
                  alt={title} 
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  onError={(e) => {
                    console.error('Image failed to load:', productImage);
                    setImageError(true);
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            ) : null}

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
                Buy Now
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
            {makeLinksClickable(description)}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DealCard;
