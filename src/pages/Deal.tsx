
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getDealById } from '../services/api';
import Navbar from '../components/Navbar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, Share2, BookmarkPlus, BookmarkMinus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { extractFirstLink, extractLinks, truncateLink, shareContent, copyToClipboard, extractSecondLink } from '../components/deal/utils/linkUtils';
import { BigFooter } from '@/components/BigFooter';
import { handleTrackedLinkClick } from '../services/api';

const Deal = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  const { data: deal, isLoading, isError } = useQuery({
    queryKey: ['deal', id],
    queryFn: () => getDealById(id || ''),
    enabled: !!id,
  });

  useEffect(() => {
    if (deal) {
      // Check if this deal is already in favorites
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      const isAlreadySaved = favorites.some((item: any) => 
        item.id === id || 
        (item.title === deal.text.split('\n')[0])
      );
      setIsSaved(isAlreadySaved);
    }
  }, [deal, id]);

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleShare = async () => {
    if (!deal) return;
    
    setIsSharing(true);
    
    try {
      const title = deal.text.split('\n')[0] || 'Check out this deal!';
      const shareUrl = `${window.location.origin}/deal/${id}`;
      const shareText = `Check out this deal: ${title.substring(0, 60)}${title.length > 60 ? '...' : ''}`;
      
      // Create share data with actual URL to this page
      const shareData = {
        title: title,
        text: shareText,
        url: shareUrl
      };
      
      const shared = await shareContent(shareData);
      
      if (!shared) {
        // Fallback to copying the URL to clipboard
        const textToCopy = `${shareText}\n${shareUrl}`;
        const copied = await copyToClipboard(textToCopy);
        
        if (copied) {
          toast({
            title: "Copied to clipboard!",
            description: "Deal link copied. You can now paste and share it with others.",
          });
        } 
      }
    } catch (error) {
      console.error('Error during share:', error);
      toast({
        title: "Sharing failed",
        description: "Something went wrong while trying to share this deal.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleToggleWishlist = () => {
    if (!deal) return;

    // Get current favorites from localStorage
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const title = deal.text.split('\n')[0];

    if (isSaved) {
      // Remove from favorites
      const updatedFavorites = favorites.filter((item: any) => 
        item.id !== id && 
        item.title !== title
      );
      localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
      setIsSaved(false);
      toast({
        title: "Removed from wishlist",
        description: "This deal has been removed from your wishlist.",
      });
    } else {
      // Add to favorites
      const newFavorite = {
        id: id,
        title: title,
        description: deal.text,
        link: extractFirstLink(deal.text) || window.location.href,
        timestamp: new Date().toISOString(),
        category: deal.category
      };
      
      favorites.push(newFavorite);
      localStorage.setItem('favorites', JSON.stringify(favorites));
      setIsSaved(true);
      toast({
        title: "Added to wishlist",
        description: "This deal has been added to your wishlist.",
      });
    }
  };

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
              handleTrackedLinkClick(part, id, e.nativeEvent);

              if (e.ctrlKey || e.metaKey || e.button === 1) return;

              e.preventDefault();
              e.stopPropagation();

              setTimeout(() => {
                window.open(part, '_blank');
              }, 100);
            }}
            className="text-blue-600 hover:underline break-all inline-flex items-center gap-1">
            {truncateLink(part)}
            <ExternalLink size={12} />
          </a>
        );
      }
      return <span key={`text-${index}-${part.substring(0, 10)}`}>{part}</span>;
    });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#09090B]">
      <Navbar />
      <main className="container mx-auto px-4 py-6 md:py-12">
        <Button 
          variant="outline" 
          onClick={handleGoBack} 
          className="mb-6 flex items-center gap-2">
          <ArrowLeft size={16} />
          Back
        </Button>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ) : isError ? (
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold text-red-500 mb-2">Error Loading Deal</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We couldn't find this deal. It may have been removed or the link might be incorrect.
            </p>
            <Button onClick={() => navigate('/deals')}>
              Browse All Deals
            </Button>
          </div>
        ) : deal ? (
          <div className="glass-effect rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-200 dark:border-gray-900 dark:bg-zinc-950">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                  {deal.text.split('\n')[0]}
                </h1>
                {deal.category && (
                  <span className="inline-block px-3 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">
                    {deal.category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleToggleWishlist}
                  className="flex gap-2 items-center"
                  variant="outline"
                >
                  {isSaved ? (
                    <>
                      <BookmarkMinus size={16} />
                      Remove from Wishlist
                    </>
                  ) : (
                    <>
                      <BookmarkPlus size={16} />
                      Add to Wishlist
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleShare}
                  disabled={isSharing}
                  className="flex gap-2 items-center"
                  variant="outline"
                >
                  <Share2 size={16} />
                  {isSharing ? "Sharing..." : "Share Deal"}
                </Button>
              </div>
            </div>
            
            <div className="whitespace-pre-line text-gray-700 dark:text-gray-300 mt-6">
              {makeLinksClickable(deal.text)}
            </div>

            {extractSecondLink(deal.text) && (
              <div className="mt-8">
                <a
                  href={extractSecondLink(deal.text) || '#'}
                  onClick={(e) => handleTrackedLinkClick(extractSecondLink(deal.text) || '', id, e.nativeEvent)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block w-full sm:w-auto text-center px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-apple-darkGray to-black rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-apple-darkGray/20"
                >
                  Buy Now
                </a>
              </div>
            )}
            
            <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
              Deal added: {new Date(deal.date || deal.createdAt).toLocaleDateString()}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-300">Deal not found</p>
          </div>
        )}
      </main>
      <div className="mt-8">
        <BigFooter />
      </div>
    </div>
  );
};

export default Deal;
