
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Loader2, BarChart3, Heart, Share2, Trash2, Edit, Tag, ExternalLink, Lock, PenSquare } from 'lucide-react';
import DealDetailDialog from '../deal/DealDetailDialog';
import { isAuthenticated } from '../../services/authService';
import { format } from 'date-fns';
import { extractFirstLink, extractSecondLink, truncateLink } from '../deal/utils/linkUtils';
import { handleTrackedLinkClick } from '../../services/api';
import CachedTelegramImage from '../images/CachedTelegramImage';
import DealCardActions from '../deal/DealCardActions';
import { useDealCardActions } from '../deal/hooks/useDealCardActions';
import { useToast } from '@/hooks/use-toast';
import PasswordDialog from '../deal/PasswordDialog';
import DeleteConfirmDialog from '../deal/DeleteConfirmDialog';
import EditDealDialog from '../deal/EditDealDialog';
import CategoryDialog from '../deal/CategoryDialog';
import { 
  hasEditPermission, 
  hasCategoryPermission, 
  grantEditPermission, 
  grantCategoryPermission, 
  verifyActionPassword 
} from '../../services/authService';

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
    
		const hasImage = deal.imageUrl || deal.telegramFileId;
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
  const { toast } = useToast();

  // Dialog states for admin actions
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditPasswordDialogOpen, setIsEditPasswordDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isCategoryPasswordDialogOpen, setIsCategoryPasswordDialogOpen] = useState(false);
  
  // Password states
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editError, setEditError] = useState('');
  const [categoryPassword, setCategoryPassword] = useState('');
  const [categoryError, setCategoryError] = useState('');

  // Use the deal card actions hook for proper functionality
  const {
    isSaved,
    isSharing,
    handleToggleWishlist,
    handleShare,
  } = useDealCardActions({
    id: formattedDeal.id,
    title,
    description,
    link: extractFirstLink(description) || '',
    imageUrl,
    telegramFileId,
    fullText: description,
    createdAt,
    category: formattedDeal.category,
  });

  const renderImage = () => {
    if (imageUrl) {
      return (
        <img 
          src={imageUrl} 
          alt={title}
          className="w-full h-32 object-contain rounded-lg mb-3"
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
          className="w-full h-32 object-contain rounded-lg mb-3"
        />
      );
    }
    return null;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'h:mm a, MMM d, yyyy');
    } catch (e) {
      return '';
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && formattedDeal.id) {
      setDeletePassword('');
      setDeleteError('');
      setIsPasswordDialogOpen(true);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit && formattedDeal.id) {
      if (hasEditPermission()) {
        setIsEditDialogOpen(true);
      } else {
        setEditPassword('');
        setEditError('');
        setIsEditPasswordDialogOpen(true);
      }
    }
  };

  const handleCategoryEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCategoryUpdate && formattedDeal.id) {
      if (hasCategoryPermission()) {
        setIsCategoryDialogOpen(true);
      } else {
        setCategoryPassword('');
        setCategoryError('');
        setIsCategoryPasswordDialogOpen(true);
      }
    }
  };

  const confirmDelete = () => {
    if (onDelete && formattedDeal.id) {
      onDelete(formattedDeal.id);
      setIsDeleteDialogOpen(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verifyActionPassword(deletePassword)) {
      setDeleteError('Incorrect password. Please try again.');
      return;
    }
    
    setIsPasswordDialogOpen(false);
    setIsDeleteDialogOpen(true);
  };

  const handleEditPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verifyActionPassword(editPassword)) {
      setEditError('Incorrect password. Please try again.');
      return;
    }
    
    grantEditPermission();
    setIsEditPasswordDialogOpen(false);
    setIsEditDialogOpen(true);
  };

  const handleCategoryPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verifyActionPassword(categoryPassword)) {
      setCategoryError('Incorrect password. Please try again.');
      return;
    }
    
    grantCategoryPermission();
    setIsCategoryPasswordDialogOpen(false);
    setIsCategoryDialogOpen(true);
  };

  const handleEditSuccess = (id: string, newText: string) => {
    if (onEdit) {
      onEdit(id, newText);
    }
  };

  const handleCategorySuccess = (id: string, category: string) => {
    if (onCategoryUpdate) {
      onCategoryUpdate(id, category);
    }
  };

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleToggleWishlist();
  };

  const shareHandler = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleShare();
  };

  const links = extractFirstLink(description) ? [extractFirstLink(description)] : [];
  const hasMultipleLinks = links.length > 1;
	const hasImage = deal.imageUrl || deal.telegramFileId;

  return (
    <>
      <div
        className="group animate-fade-up hover-scale cursor-pointer h-full"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDealClick(deal);
        }}>
        <div className="relative glass-effect rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] h-full flex flex-col border-gray-200 dark:border-gray-900 dark:bg-zinc-950">
				
          <DealCardActions
            isFavorite={isSaved}
            onToggleFavorite={toggleFavorite}
            onShare={shareHandler}
            onDelete={onDelete ? handleDelete : undefined}
            onEdit={onEdit ? handleEdit : undefined}
            onCategoryEdit={onCategoryUpdate ? handleCategoryEdit : undefined}
            showAdminActions={!!onDelete}
          />

				  <div className="space-y-3 flex-1 flex flex-col min-h-0">
            <div className="space-y-2 flex-shrink-0">
              {createdAt && (
                <div className="flex items-center">
                  <span className="time-badge py-1 text-[10px]">
                    {formatDate(createdAt)}
                  </span>
                </div>
              )}
              <h3 className="text-lg font-semibold text-high-contrast line-clamp-2 leading-tight pr-20">
                {title}
              </h3>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              {hasImage ?  (
                <div className="mb-3 flex-shrink-0">
                  {renderImage()}
                </div>
              ) : (
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm text-medium-contrast line-clamp-6 leading-relaxed">
                    {description}
                  </p>
                </div>
              )}
            </div>
          </div>

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

      {/* Admin Action Dialogs */}
      <PasswordDialog
        isOpen={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
        onSubmit={handlePasswordSubmit}
        password={deletePassword}
        setPassword={setDeletePassword}
        error={deleteError}
        setError={setDeleteError}
        title="Authentication Required"
        description="Please enter the admin password to proceed with deletion:"
        icon={<Lock className="h-5 w-5 text-red-500" />}
      />

      <PasswordDialog
        isOpen={isEditPasswordDialogOpen}
        onOpenChange={setIsEditPasswordDialogOpen}
        onSubmit={handleEditPasswordSubmit}
        password={editPassword}
        setPassword={setEditPassword}
        error={editError}
        setError={setEditError}
        title="Authentication Required"
        description="Please enter the admin password to edit deals:"
        icon={<PenSquare className="h-5 w-5 text-blue-500" />}
      />

      <PasswordDialog
        isOpen={isCategoryPasswordDialogOpen}
        onOpenChange={setIsCategoryPasswordDialogOpen}
        onSubmit={handleCategoryPasswordSubmit}
        password={categoryPassword}
        setPassword={setCategoryPassword}
        error={categoryError}
        setError={setCategoryError}
        title="Authentication Required"
        description="Please enter the admin password to change categories:"
        icon={<Tag className="h-5 w-5 text-purple-500" />}
      />

      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDelete}
      />

      <EditDealDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        id={formattedDeal.id || ''}
        initialText={description}
        onSuccess={handleEditSuccess}
      />

      <CategoryDialog
        isOpen={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        id={formattedDeal.id || ''}
        initialCategory={formattedDeal.category || ''}
        onSuccess={handleCategorySuccess}
      />
    </>
  );
};

export default TopPerformingDealsCarousel;
