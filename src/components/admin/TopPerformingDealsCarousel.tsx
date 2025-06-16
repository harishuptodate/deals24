
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Loader2, BarChart3 } from 'lucide-react';
import DealCard from '../DealCard';
import DealDetailDialog from '../deal/DealDetailDialog';
import { isAuthenticated } from '../../services/authService';
import { format } from 'date-fns';


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

  const handleDealClick = (deal: any, event?: React.MouseEvent) => {
    // Prevent event propagation to stop the default DealCard click behavior
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
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
                  <div 
                    onClick={(e) => onDealClick(deal, e)} 
                    className="cursor-pointer h-full"
                  >
                    <DealCard
                      {...formattedDeal}
                      onDelete={isAuthenticated() ? onDelete : undefined}
                      onEdit={isAuthenticated() ? onEdit : undefined}
                      onCategoryUpdate={isAuthenticated() ? onCategoryUpdate : undefined}
                      isAdmin={isAuthenticated()}
                      // Disable the default click behavior by not passing onClick
                      onClick={undefined}
                    />
                  </div>
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

export default TopPerformingDealsCarousel;
