  import React, { useState } from 'react';
  import { Heart, ExternalLink, Trash2 } from 'lucide-react';
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
  import { Button } from "@/components/ui/button";
  import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
  import { trackMessageClick } from '../services/api';
  import { useToast } from "@/components/ui/use-toast";
  import { format } from 'date-fns';
  import { isAuthenticated } from '../services/authService';

  interface DealCardProps {
    title: string;
    description: string;
    link: string;
    id?: string;
    createdAt?: string;
    onDelete?: (id: string) => void;
  }

  const DealCard = ({ title, description, link, id, createdAt, onDelete }: DealCardProps) => {
    const { toast } = useToast();
    const [isFavorite, setIsFavorite] = useState(() => {
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      return favorites.some((fav: any) => fav.title === title);
    });
    const [isOpen, setIsOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // Extract link from description if not provided
    const extractFirstLink = (text: string): string | null => {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const matches = text.match(urlRegex);
      return matches && matches.length > 0 ? matches[0] : null;
    };

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

    const toggleFavorite = (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent card click event
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      let newFavorites;
    
      if (isFavorite) {
        newFavorites = favorites.filter((fav: any) => fav.title !== title);
      } else {
        newFavorites = [...favorites, { 
          title, 
          description, 
          link,
          id,
          timestamp: new Date().toISOString() 
        }];
      }
    
      localStorage.setItem('favorites', JSON.stringify(newFavorites));
      setIsFavorite(!isFavorite);
    };

    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent card click event
      if (id && onDelete) {
        setIsDeleteDialogOpen(true);
      }
    };

    const confirmDelete = () => {
      if (id && onDelete) {
        onDelete(id);
        setIsDeleteDialogOpen(false);
      }
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
      } else {
        console.warn('Cannot track click: No message ID provided');
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
              key={`link-${index}-${part.substring(0, 10)}`}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                recordClick(part);
              }}
              className="text-blue-600 hover:underline break-all inline-flex items-center gap-1"
            >
              {truncateLink(part)}
              <ExternalLink size={12} />
            </a>
          );
        }
        return <span key={`text-${index}-${part.substring(0, 10)}`}>{part}</span>;
      });
    };

    // Format timestamp if available
    const formattedDate = createdAt ? format(new Date(createdAt), 'MMM d, h:mm a') : '';

    return (
      <>
        <div 
          className="group animate-fade-up hover-scale cursor-pointer h-[290px]" 
          onClick={() => setIsOpen(true)}
        >
          <div className="relative glass-effect rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] h-full flex flex-col">
            <div className="absolute top-4 right-4 flex gap-1 z-10">
              {onDelete && isAuthenticated() && (
                <button
                  onClick={handleDelete}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  title="Delete deal"
                >
                  <Trash2 className="w-5 h-5 text-red-500" />
                </button>
              )}
              <button
                onClick={toggleFavorite}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                title={isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart
                  className={`w-5 h-5 transition-colors ${
                    isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'
                  }`}
                />
              </button>
            </div>
          
            <div className="space-y-2 flex-1 flex flex-col">
              <div className="space-y-1">
                {formattedDate && (
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-gradient-to-r from-apple-lightGray to-white rounded-full text-apple-gray shadow-sm">
                    {formattedDate}
                  </span>
                )}
                <h3 className="text-lg font-semibold text-apple-darkGray line-clamp-2">{title}</h3>
              </div>
            
              <div className="mt-1">
                <p className="text-sm text-apple-gray line-clamp-5 flex-grow">
                  {description}
                </p>
              </div>

              <div className="mt-auto pt-2">
                {hasMultipleLinks ? (
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(true);
                    }}
                    className="w-full text-center px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-apple-darkGray to-black rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-apple-darkGray/20"
                  >
                    View Deal Details
                  </Button>
                ) : (
                  <a
                    href={link || extractFirstLink(description) || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      recordClick(link || extractFirstLink(description) || '');
                    }}
                    className="inline-block w-full text-center px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-apple-darkGray to-black rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-apple-darkGray/20"
                  >
                    Buy Now
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto max-w-[90vw] w-[90vw] sm:w-auto rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-xl">{title}</DialogTitle>
            </DialogHeader>
          
            <div className="mt-4 text-sm whitespace-pre-line">
              {makeLinksClickable(description)}
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="max-w-[90vw] sm:max-w-md rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this deal. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  };

  export default DealCard;
