
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Loader2, BarChart3, Heart, Share2, Trash2, Edit, Tag, ExternalLink } from 'lucide-react';
import DealDetailDialog from '../deal/DealDetailDialog';
import { isAuthenticated } from '../../services/authService';
import { format } from 'date-fns';
import { extractFirstLink, extractSecondLink, truncateLink } from '../deal/utils/linkUtils';
import { handleTrackedLinkClick } from '../../services/api';
import CachedTelegramImage from '../images/CachedTelegramImage';

interface TopPerformingDealsCarouselProps {
  topDeals: any[];
  isLoading: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (id: string, newText: string) => void;
  onCategoryUpdate?: (id: string, category: string) => void;
}

const TopPerformingDealsCarousel = ({
  topDeals,
  isLoading,
  onDelete,
  onEdit,
  onCategoryUpdate
}: TopPerformingDealsCarouselProps) => {
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const formatDealForCard = (deal: any) => {
    // Extract title from the first line of text
    const title = deal.text?.split('\n')[0] || 'Deal';
    
    // Format the created date
    const formattedDate = deal.date || deal.createdAt 
      ? format(new Date(deal.date || deal.createdAt), 'MMM d, yyyy h:mm a')
      : '';

    return {
      title,
      description: deal.text || '',
      link: '', // Will be extracted from description by DealCard
      id: deal._id || deal.id,
      category: deal.category || '',
      createdAt: deal.date || deal.createdAt,
      clicks: deal.clicks || 0,
      imageUrl: deal.imageUrl,
      telegramFileId: deal.telegramFileId,
      // Add extra metadata for dialog display
      extraData: {
        formattedCreatedDate: formattedDate,
        clicks: deal.clicks || 0,
        category: deal.category || ''
      }
    };
  };

  const handleDealClick = (deal: any) => {
    setSelectedDeal(deal);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Top Performing Deals</CardTitle>
          <CardDescription>Most clicked deals in selected period</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col">
          <div className="flex justify-center items-center h-full flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!topDeals || topDeals.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Top Performing Deals</CardTitle>
          <CardDescription>Most clicked deals in selected period</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col">
          <div className="text-center py-8 flex-1 flex items-center justify-center">
            <div>
              <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500">No click data available</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Top Performing Deals</CardTitle>
          <CardDescription>Most clicked deals in selected period</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col px-2">
          <AutoCarousel 
            topDeals={topDeals}
            onDealClick={handleDealClick}
            onDelete={onDelete}
            onEdit={onEdit}
            onCategoryUpdate={onCategoryUpdate}
            formatDealForCard={formatDealForCard}
          />
        </CardContent>
      </Card>

      {/* Enhanced Deal Details Dialog with extra data */}
      {selectedDeal && (
        <DealDetailDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          title={selectedDeal.text?.split('\n')[0] || 'Deal Details'}
          description={selectedDeal.text || ''}
          id={selectedDeal._id || selectedDeal.id}
          imageUrl={selectedDeal.imageUrl}
          telegramFileId={selectedDeal.telegramFileId}
          extraData={{
            createdDate: selectedDeal.date || selectedDeal.createdAt,
            clicks: selectedDeal.clicks || 0,
            category: selectedDeal.category || ''
          }}
        />
      )}
    </>
  );
};

// Separate component for auto-sliding carousel
const AutoCarousel = ({ 
  topDeals, 
  onDealClick, 
  onDelete, 
  onEdit, 
  onCategoryUpdate, 
  formatDealForCard 
}: any) => {
  const [api, setApi] = useState<any>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  // Auto-slide functionality
  useEffect(() => {
    if (!api) return;

    const autoSlide = setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0); // Loop back to first slide
      }
    }, 4000); // Change slide every 4 seconds

    return () => clearInterval(autoSlide);
  }, [api]);

  return (
    <Carousel 
      className="w-full flex-1" 
      opts={{ align: "start", loop: true }}
      setApi={setApi}
    >
      <div className="relative">
        <CarouselContent className="-ml-2 md:-ml-4">
          {topDeals.map((deal: any, index: number) => {
            const formattedDeal = formatDealForCard(deal);
            return (
              <CarouselItem key={deal._id || deal.id || index} className="pl-2 md:pl-4 basis-full">
                <div className="h-[320px] w-full">
                  <CustomDealCard
                    deal={deal}
                    formattedDeal={formattedDeal}
                    onDealClick={onDealClick}
                    onDelete={isAuthenticated() ? onDelete : undefined}
                    onEdit={isAuthenticated() ? onEdit : undefined}
                    onCategoryUpdate={isAuthenticated() ? onCategoryUpdate : undefined}
                  />
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        
        {/* Navigation buttons */}
        <CarouselPrevious className="left-2 bg-white/90 hover:bg-white border-gray-200 shadow-lg" />
        <CarouselNext className="right-2 bg-white/90 hover:bg-white border-gray-200 shadow-lg" />
      </div>
      
      {/* Enhanced indicator showing current position */}
      <div className="flex justify-center mt-4 gap-2">
        {Array.from({ length: count }, (_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index + 1 === current 
                ? 'bg-blue-500 w-6' 
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
            onClick={() => api?.scrollTo(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </Carousel>
  );
};

// Custom deal card component that mimics DealCard but without its dialog behavior
const CustomDealCard = ({
  deal,
  formattedDeal,
  onDealClick,
  onDelete,
  onEdit,
  onCategoryUpdate,
}: any) => {
  const { title, description, imageUrl, telegramFileId, createdAt } = formattedDeal;

  const renderImage = () => {
    if (imageUrl) {
      return (
        <img 
          src={imageUrl} 
          alt={title}
          className="w-full h-32 object-cover rounded-lg mb-3"
          onError={(e) => {
            console.error('Failed to load image:', imageUrl);
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    } else if (telegramFileId) {
      return (
        <CachedTelegramImage
          telegramFileId={telegramFileId}
          alt={title}
          className="w-full h-32 object-cover rounded-lg mb-3"
        />
      );
    }
    return null;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d');
    } catch (e) {
      return '';
    }
  };

  const links = extractFirstLink(description) ? [extractFirstLink(description)] : [];
  const hasMultipleLinks = links.length > 1;

  return (
    <div
      className="group animate-fade-up hover-scale cursor-pointer h-full"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDealClick(deal);
      }}>
      <div className="relative glass-effect rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] h-full flex flex-col border-gray-200 dark:border-gray-900 dark:bg-zinc-950">
        
        {/* Action buttons */}
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Handle favorite action if needed
            }}
            className="p-2 rounded-full bg-white/80 hover:bg-white shadow-sm transition-colors"
          >
            <Heart className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Handle share action if needed
            }}
            className="p-2 rounded-full bg-white/80 hover:bg-white shadow-sm transition-colors"
          >
            <Share2 className="h-4 w-4 text-gray-600" />
          </button>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(formattedDeal.id);
              }}
              className="p-2 rounded-full bg-white/80 hover:bg-white shadow-sm transition-colors"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(formattedDeal.id, description);
              }}
              className="p-2 rounded-full bg-white/80 hover:bg-white shadow-sm transition-colors"
            >
              <Edit className="h-4 w-4 text-blue-500" />
            </button>
          )}
          {onCategoryUpdate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCategoryUpdate(formattedDeal.id, formattedDeal.category);
              }}
              className="p-2 rounded-full bg-white/80 hover:bg-white shadow-sm transition-colors"
            >
              <Tag className="h-4 w-4 text-purple-500" />
            </button>
          )}
        </div>

        {/* Image */}
        {renderImage()}

        {/* Content */}
        <div className="flex-1 flex flex-col">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2 text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3 flex-1">
            {description.replace(/https?:\/\/[^\s]+/g, '').trim()}
          </p>

          {createdAt && (
            <div className="text-xs text-gray-500 mb-3">
              {formatDate(createdAt)}
            </div>
          )}

          {/* Buy Now Button */}
          {extractFirstLink(description) && (
            <div className="mt-auto">
              <a
                href={extractSecondLink(description) || extractFirstLink(description) || '#'}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTrackedLinkClick(
                    extractSecondLink(description) || extractFirstLink(description) || '', 
                    formattedDeal.id, 
                    e.nativeEvent
                  );
                }}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block w-full text-center px-4 py-3 text-sm font-medium text-white bg-gradient-to-b from-apple-darkGray to-indigo-950 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-apple-darkGray/20 hover:scale-105"
              >
                Buy Now
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopPerformingDealsCarousel;
