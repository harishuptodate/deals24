
import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { Heart, Trash2, Calendar, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from '@/components/ui/use-toast';

interface FavoriteItem {
  title: string;
  description: string;
  link: string;
  timestamp: string;
}

const Wishlist = () => {
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<FavoriteItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const storedFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    setFavorites(storedFavorites);
  }, []);

  const removeFavorite = (title: string) => {
    const updatedFavorites = favorites.filter(item => item.title !== title);
    localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
    setFavorites(updatedFavorites);
    
    toast({
      title: "Removed from wishlist",
      description: "The item has been removed from your saved deals",
    });
  };

  const clearAllFavorites = () => {
    localStorage.setItem('favorites', JSON.stringify([]));
    setFavorites([]);
    
    toast({
      title: "Wishlist cleared",
      description: "All items have been removed from your wishlist",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const viewDetails = (item: FavoriteItem) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  // Extract all links from the description
  const extractLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  // Truncate link for display
  const truncateLink = (url: string) => {
    try {
      const { hostname } = new URL(url);
      return hostname;
    } catch {
      return url;
    }
  };

  const recordClick = (title: string, clickedLink: string) => {
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
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gradient">My Wishlist</h1>
            <p className="text-apple-gray mt-1">Your saved deals</p>
          </div>
          
          {favorites.length > 0 && (
            <Button 
              variant="outline" 
              onClick={clearAllFavorites}
              className="flex items-center gap-2"
            >
              <Trash2 size={16} />
              Clear All
            </Button>
          )}
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-xl">
            <Heart className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-apple-darkGray mb-2">Your wishlist is empty</h3>
            <p className="text-apple-gray mb-6">Start saving your favorite deals by clicking the heart icon</p>
            <Button asChild>
              <a href="/deals">Browse Deals</a>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((item) => (
              <div key={item.title} className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-apple-darkGray line-clamp-2">{item.title}</h3>
                  <button
                    onClick={() => removeFavorite(item.title)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Trash2 size={16} className="text-gray-400 hover:text-red-500" />
                  </button>
                </div>
                
                <p className="text-sm text-apple-gray mb-4 line-clamp-3">
                  {item.description}
                </p>
                
                <div className="flex justify-between items-center mt-4">
                  <div className="flex items-center text-xs text-apple-gray">
                    <Calendar size={14} className="mr-1" />
                    <span>Saved on {formatDate(item.timestamp)}</span>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => viewDetails(item)}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedItem.title}</DialogTitle>
                <DialogDescription>
                  Saved on {formatDate(selectedItem.timestamp)}
                </DialogDescription>
              </DialogHeader>
              
              <div className="mt-4 text-sm whitespace-pre-line">
                {selectedItem.description}
              </div>
              
              <div className="mt-6 space-y-3">
                <h4 className="font-medium">Available Links:</h4>
                {extractLinks(selectedItem.description).map((link, index) => (
                  <a
                    key={index}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => recordClick(selectedItem.title, link)}
                    className="flex items-center gap-2 p-3 text-sm rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <Heart size={16} className="text-red-500 fill-red-500" />
                    <span className="truncate flex-1">{truncateLink(link)}</span>
                  </a>
                ))}
              </div>

              <div className="mt-4 flex justify-end">
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={() => removeFavorite(selectedItem.title)}
                >
                  <Trash2 size={16} />
                  Remove from Wishlist
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Wishlist;
