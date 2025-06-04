
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { shareContent, copyToClipboard } from '../utils/linkUtils';

export const useDealCardActions = (id?: string, title?: string) => {
  const { toast } = useToast();
  
  // Dialog states
  const [isOpen, setIsOpen] = useState(false);
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

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id) return;
    
    try {
      const shareUrl = `${window.location.origin}/deal/${id}`;
      const shareText = `Check out this deal: ${title?.substring(0, 60)}${title && title.length > 60 ? '...' : ''}`;
      
      const shareData = {
        title: title || 'Check out this deal!',
        text: shareText,
        url: shareUrl
      };
      
      const shared = await shareContent(shareData);
      
      if (!shared) {
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
    }
  };

  return {
    // Dialog states
    isOpen,
    setIsOpen,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isPasswordDialogOpen,
    setIsPasswordDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    isEditPasswordDialogOpen,
    setIsEditPasswordDialogOpen,
    isCategoryDialogOpen,
    setIsCategoryDialogOpen,
    isCategoryPasswordDialogOpen,
    setIsCategoryPasswordDialogOpen,
    
    // Password states
    deletePassword,
    setDeletePassword,
    deleteError,
    setDeleteError,
    editPassword,
    setEditPassword,
    editError,
    setEditError,
    categoryPassword,
    setCategoryPassword,
    categoryError,
    setCategoryError,
    
    // Actions
    handleShare,
  };
};
