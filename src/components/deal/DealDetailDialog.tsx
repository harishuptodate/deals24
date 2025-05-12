
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
import { ExternalLink, Share2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { createShareData, shareContent, copyToClipboard, truncateLink } from './utils/linkUtils';

interface DealDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  id?: string;
}

const DealDetailDialog = ({
  isOpen,
  onOpenChange,
  title,
  description,
  id,
}: DealDetailDialogProps) => {
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    setIsSharing(true);
    
    try {
      const shareData = createShareData(title, description);
      const shared = await shareContent(shareData);
      
      if (!shared) {
        // Fallback to copying the information to clipboard
        const shareText = `${title}\n\n${description}\n\nShared via DealsTracker`;
        const copied = await copyToClipboard(shareText);
        
        if (copied) {
          toast({
            title: "Copied to clipboard!",
            description: "You can now paste and share this deal with others.",
          });
        } else {
          toast({
            title: "Couldn't share",
            description: "Failed to copy deal information.",
            variant: "destructive",
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto max-w-[90vw] w-[90vw] sm:w-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
        </DialogHeader>

        <div className="mt-4 text-sm whitespace-pre-line">
          {makeLinksClickable(description)}
        </div>

        <DialogFooter className="mt-4 flex justify-end">
          <Button
            onClick={handleShare}
            disabled={isSharing}
            className="flex gap-2 items-center"
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
