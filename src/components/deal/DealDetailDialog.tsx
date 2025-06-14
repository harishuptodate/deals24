
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
import { ExternalLink, MoveDiagonal, Share2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { createShareData, shareContent, copyToClipboard, truncateLink } from './utils/linkUtils';
import { useNavigate } from 'react-router-dom';
import CachedTelegramImage from '../images/CachedTelegramImage';

interface DealDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  id?: string;
  imageUrl?: string;
  telegramFileId?: string;
}

const DealDetailDialog = ({
  isOpen,
  onOpenChange,
  title,
  description,
  id,
  imageUrl,
  telegramFileId,
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
          
          <div className="text-sm whitespace-pre-line">
            {makeLinksClickable(description)}
          </div>
        </div>

        <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2 sm:justify-end">
          {id && (
            <Button
              onClick={handleViewFullPage}
              className="flex gap-2 items-center active:scale-95 transition-transform duration-150 ease-in-out"
              variant="default"
            >
              <ExternalLink size={16} />
              Visit Full Page
            </Button>
          )}
          <Button
            onClick={handleShare}
            disabled={isSharing}
            className="flex gap-2 items-center active:scale-95 transition-transform duration-150 ease-in-out"
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
