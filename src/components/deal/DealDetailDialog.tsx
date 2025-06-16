
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { handleTrackedLinkClick } from '../../services/api';
import { ExternalLink, MoveDiagonal, Share2, Calendar, MousePointer, Tag } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { createShareData, shareContent, copyToClipboard, truncateLink, extractFirstLink, extractSecondLink } from './utils/linkUtils';
import { useNavigate } from 'react-router-dom';
import CachedTelegramImage from '../images/CachedTelegramImage';
import { format } from 'date-fns';

interface DealDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  id?: string;
  imageUrl?: string;
  telegramFileId?: string;
  extraData?: {
    createdDate?: string;
    clicks?: number;
    category?: string;
  };
}

const DealDetailDialog = ({
  isOpen,
  onOpenChange,
  title,
  description,
  id,
  imageUrl,
  telegramFileId,
  extraData,
}: DealDetailDialogProps) => {
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  const navigate = useNavigate();

  const handleShare = async () => {
    setIsSharing(true);
    
    try {
      // Create share data with actual URL to this deal's page
      const shareUrl = id ? `${window.location.origin}/deal/${id}` : window.location.href;
      const shareText = `Check out this deal: ${title.substring(0, 60)}${title.length > 60 ? '...' : ''}`;
      
      const shareData = {
        title: title || 'Check out this deal!',
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

  const handleViewFullPage = () => {
    if (id) {
      onOpenChange(false); // Close the dialog
      navigate(`/deal/${id}`); // Navigate to the deal page
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

  const renderImage = () => {
    if (imageUrl) {
      return (
        <img 
          src={imageUrl} 
          alt={title}
          className="w-full h-48 object-contain rounded-lg"
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
          className="w-full h-48 rounded-lg"
        />
      );
    }
    return null;
  };

  const formatCreatedDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (error) {
      return dateString;
    }
  };

  const hasImage = imageUrl || telegramFileId;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto max-w-[90vw] w-[90vw] sm:w-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {hasImage && (
            <div className="mb-4">
              {renderImage()}
            </div>
          )}
          
          <div className="text-sm whitespace-pre-line text-center">
            {makeLinksClickable(description)}
          </div>

          {/* Extra data section */}
          {extraData && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Deal Information</h4>
              <div className="space-y-2 text-xs text-gray-600">
                {extraData.createdDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Created:</span>
                    <span>{formatCreatedDate(extraData.createdDate)}</span>
                  </div>
                )}
                {typeof extraData.clicks === 'number' && (
                  <div className="flex items-center gap-2">
                    <MousePointer className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Clicks:</span>
                    <span>{extraData.clicks}</span>
                  </div>
                )}
                {extraData.category && (
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Category:</span>
                    <span>{extraData.category}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2 sm:justify-between">
          {id && (
            <Button
              onClick={handleViewFullPage}
              className="flex gap-2 items-center hover:scale-105 active:scale-95 transition-transform duration-150 ease-in-out"
              variant="default"
            >
              <ExternalLink size={16} />
              Visit Full Page
            </Button>
          )}

          {extractFirstLink(description || '') && (
                  <div >
                    <a
                      href={extractSecondLink(description || '') || extractFirstLink(description || '') || '#'}
                      onClick={(e) => handleTrackedLinkClick(extractSecondLink(description || '') || (extractFirstLink(description || '')) || '', id, e.nativeEvent)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block w-full sm:w-auto text-center px-9 py-3 text-sm font-medium text-white bg-gradient-to-b from-apple-darkGray to-indigo-950 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-apple-darkGray/20 hover:scale-105"
                    >
                      Buy Now
                    </a>
                  </div>
                )}
          <Button
            onClick={handleShare}
            disabled={isSharing}
            className="flex gap-2 items-center hover:scale-105 active:scale-95 transition-transform duration-150 ease-in-out"
            variant="outline"
          >
            <Share2 size={16} />
            {isSharing ? "Sharing..." : "Share Deal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DealDetailDialog;
