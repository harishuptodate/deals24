import React, { useState, useEffect, memo } from 'react';
import { Heart, ExternalLink, Trash2, PenSquare, Tag, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  deleteProduct,
  handleTrackedLinkClick 
} from '../services/api';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { 
  hasEditPermission, 
  hasCategoryPermission, 
  grantEditPermission, 
  grantCategoryPermission, 
  verifyActionPassword 
} from '../services/authService';
import { extractFirstLink, extractLinks, shareContent, copyToClipboard, extractSecondLink } from './deal/utils/linkUtils';
import PasswordDialog from './deal/PasswordDialog';
import DeleteConfirmDialog from './deal/DeleteConfirmDialog';
import EditDealDialog from './deal/EditDealDialog';
import CategoryDialog from './deal/CategoryDialog';
import DealDetailDialog from './deal/DealDetailDialog';
import { useNavigate } from 'react-router-dom';

interface DealCardProps {
  title: string;
  description: string;
  link: string;
  id?: string;
  category?: string;
  createdAt?: string;
  onDelete?: (id: string) => void;
  onEdit?: (id: string, newText: string) => void;
  onCategoryUpdate?: (id: string, category: string) => void;
  isAdmin?: boolean;
}

// Use memo to prevent unnecessary re-renders
const DealCard = memo(({
  title,
  description,
  link,
  id,
  category,
  createdAt,
  onDelete,
  onEdit,
  onCategoryUpdate,
  isAdmin = false,
}: DealCardProps) => {
  const { toast } = useToast();
  const [isFavorite, setIsFavorite] = useState(() => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    return favorites.some((fav: any) => fav.title === title);
  });
  
  // Detail view state
  const [isOpen, setIsOpen] = useState(false);
  
  // Delete dialog states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  
  // Edit dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditPasswordDialogOpen, setIsEditPasswordDialogOpen] = useState(false);
  const [editPassword, setEditPassword] = useState('');
  const [editError, setEditError] = useState('');
  
  // Category dialog states
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isCategoryPasswordDialogOpen, setIsCategoryPasswordDialogOpen] = useState(false);
  const [categoryPassword, setCategoryPassword] = useState('');
  const [categoryError, setCategoryError] = useState('');
  
  // Local state for UI updates without refetching
  const [localTitle, setLocalTitle] = useState(title);
  const [localDescription, setLocalDescription] = useState(description);
  const [localCategory, setLocalCategory] = useState(category || '');

  const navigate = useNavigate();

  // Extract links for UI decision making
  const links = extractLinks(description);
  const hasMultipleLinks = links.length > 1;

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    let newFavorites;

    if (isFavorite) {
      newFavorites = favorites.filter((fav: any) => fav.title !== title);
    } else {
      newFavorites = [
        ...favorites,
        {
          title,
          description,
          link,
          id,
          timestamp: new Date().toISOString(),
        },
      ];
    }

    localStorage.setItem('favorites', JSON.stringify(newFavorites));
    setIsFavorite(!isFavorite);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id) return;
    
    try {
      // Create share URL to this deal's dedicated page
      const shareUrl = `${window.location.origin}/deal/${id}`;
      const shareText = `Check out this deal: ${localTitle.substring(0, 60)}${localTitle.length > 60 ? '...' : ''}`;
      
      const shareData = {
        title: localTitle || 'Check out this deal!',
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
        // else {
        //   toast({
        //     title: "Couldn't share",
        //     description: "Failed to copy deal link.",
        //     variant: "destructive",
        //   });
        // }
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

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (id && onDelete) {
      setDeletePassword('');
      setDeleteError('');
      setIsPasswordDialogOpen(true);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (id) {
      if (hasEditPermission()) {
        setIsEditDialogOpen(true);
      } else {
        setEditPassword('');
        setEditError('');
        setIsEditPasswordDialogOpen(true);
      }
    }
  };

  const handleOpenCategoryDialog = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasCategoryPermission()) {
      setIsCategoryDialogOpen(true);
    } else {
      setCategoryPassword('');
      setCategoryError('');
      setIsCategoryPasswordDialogOpen(true);
    }
  };

  const confirmDelete = () => {
    if (id && onDelete) {
      onDelete(id);
      setIsDeleteDialogOpen(false);
      setIsOpen(false);
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
    setLocalDescription(newText);
    setLocalTitle(newText.split('\n')[0] || 'New Deal');

    if (onEdit) {
      onEdit(id, newText);
    }
  };

  const handleCategorySuccess = (id: string, category: string) => {
    setLocalCategory(category);

    if (onCategoryUpdate) {
      onCategoryUpdate(id, category);
    }
  };

  const formattedDate = createdAt
    ? format(new Date(createdAt), 'MMM d, h:mm a')
    : '';

  const displayTitle = localTitle || title;
  const displayDescription = localDescription || description;
  const displayCategory = localCategory || category;

  // Keep this function but it won't be used for the main click action
  const viewDealPage = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey || e.button === 1) return;
    e.preventDefault();
    e.stopPropagation();
    
    if (id) {
      navigate(`/deal/${id}`);
    }
  };

  return (
    <>
      <div
        className="group animate-fade-up hover-scale cursor-pointer h-[290px]"
        onClick={(e) => {
          if (e.ctrlKey || e.metaKey || e.button === 1) return;
          // Always open the dialog when clicking a deal card
          setIsOpen(true);
        }}>
        <div className="relative glass-effect rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] h-full flex flex-col border-gray-200 dark:border-gray-900  dark:bg-zinc-950 ">
          <div className="absolute top-4 right-4 flex  z-10">
            {onDelete &&  (
              <>
                <button
                  onClick={handleOpenCategoryDialog}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Change category">
                  <Tag className="w-5 h-5 text-purple-500" />
                </button>
                <button
                  onClick={handleEdit}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800  transition-colors"
                  title="Edit deal">
                  <PenSquare className="w-5 h-5 text-blue-500" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Delete deal">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </button>
              </>
            )}
            <button
              onClick={handleShare}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Share deal">
              <Share2 className="w-5 h-5 text-blue-500" />
            </button>
            <button
              onClick={toggleFavorite}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
              <Heart
                className={`w-5 h-5 transition-colors ${
                  isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'
                }`}
              />
            </button>
          </div>

          <div className="space-y-2 flex-1 flex flex-col">
            <div className="space-y-1">
              {formattedDate && (
                <span className="inline-block px-2 py-1 text-xs font-medium bg-gradient-to-r dark:to-gray-500 rounded-full text-apple-gray shadow-md">
                  {formattedDate}
                </span>
              )}
              <h3 className="text-lg font-semibold text-apple-darkGray line-clamp-2">
                {displayTitle}
              </h3>
            </div>

            <div className="mt-1">
              <p className="text-sm text-apple-gray line-clamp-5 flex-grow">
                {displayDescription}
              </p>
            </div>

            <div className="mt-auto pt-2">
              {hasMultipleLinks ? (
                // <Button
                //   onClick={(e) => {
                //     e.stopPropagation();
                //     setIsOpen(true);
                //   }}
                //   className="w-full text-center px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-apple-darkGray to-black rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-apple-darkGray/20">
                //   View Deal Details
                // </Button>
                <a
                  href={ extractSecondLink(description) || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    handleTrackedLinkClick(
                      extractSecondLink(description) || '',
                      id,
                      e.nativeEvent,
                    );

                    if (e.ctrlKey || e.metaKey || e.button === 1) return;

                    e.preventDefault();
                    e.stopPropagation();

                    setTimeout(() => {
                      window.open(
                        extractSecondLink(description) || '',
                        '_blank',
                      );
                    }, 100);
                  }}
                  className="inline-block w-full text-center px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-apple-darkGray to-black rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-apple-darkGray/20">
                  Buy Now
                </a>


              ) : (
                <a
                  href={link || extractFirstLink(description) || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    handleTrackedLinkClick(
                      link || extractFirstLink(description) || '',
                      id,
                      e.nativeEvent,
                    );

                    if (e.ctrlKey || e.metaKey || e.button === 1) return;

                    e.preventDefault();
                    e.stopPropagation();

                    setTimeout(() => {
                      window.open(
                        link || extractFirstLink(description) || '',
                        '_blank',
                      );
                    }, 100);
                  }}
                  className="inline-block w-full text-center px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-apple-darkGray to-black rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-apple-darkGray/20">
                  Buy Now
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Dialog */}
      <DealDetailDialog 
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title={displayTitle}
        description={displayDescription}
        id={id}
      />

      {/* Password Dialog for Delete Protection */}
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
        icon={<Tag className="h-5 w-5 text-red-500" />}
      />

      {/* Password Dialog for Edit Protection */}
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

      {/* Password Dialog for Category Protection */}
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

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDelete}
      />

      {/* Edit Dialog */}
      <EditDealDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        id={id || ''}
        initialText={description}
        onSuccess={handleEditSuccess}
      />

      {/* Category Dialog */}
      <CategoryDialog
        isOpen={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        id={id || ''}
        initialCategory={category || ''}
        onSuccess={handleCategorySuccess}
      />
    </>
  );
});
  
export default DealCard;
