
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Loader2, BarChart3 } from 'lucide-react';
import DealCard from '../DealCard';
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
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Top Performing Deals</CardTitle>
        <CardDescription>Most clicked deals in selected period</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col px-2">
        <Carousel className="w-full flex-1" opts={{ align: "start", loop: true }}>
          <div className="relative">
            <CarouselContent className="-ml-2 md:-ml-4">
              {topDeals.map((deal, index) => {
                const formattedDeal = formatDealForCard(deal);
                return (
                  <CarouselItem key={deal._id || deal.id || index} className="pl-2 md:pl-4 basis-full">
                    <div className="h-[420px] w-full">
                      <DealCard
                        {...formattedDeal}
                        onDelete={isAuthenticated() ? onDelete : undefined}
                        onEdit={isAuthenticated() ? onEdit : undefined}
                        onCategoryUpdate={isAuthenticated() ? onCategoryUpdate : undefined}
                        isAdmin={isAuthenticated()}
                      />
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            
            {/* Navigation buttons - positioned to not interfere with deal card actions */}
            <CarouselPrevious className="left-2 bg-white/90 hover:bg-white border-gray-200 shadow-lg" />
            <CarouselNext className="right-2 bg-white/90 hover:bg-white border-gray-200 shadow-lg" />
          </div>
        </Carousel>
        
        {/* Indicator showing current position */}
        <div className="flex justify-center mt-4 gap-2">
          {topDeals.map((_, index) => (
            <div
              key={index}
              className="w-2 h-2 rounded-full bg-gray-300 animate-pulse"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TopPerformingDealsCarousel;
