
import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractLinks } from './deal/utils/linkUtils';
import { 
  hasEditPermission, 
  hasCategoryPermission, 
  grantEditPermission, 
  grantCategoryPermission, 
  verifyActionPassword 
} from '../services/authService';
import PasswordDialog from './deal/PasswordDialog';
import DeleteConfirmDialog from './deal/DeleteConfirmDialog';
import EditDealDialog from './deal/EditDealDialog';
import CategoryDialog from './deal/CategoryDialog';
import DealDetailDialog from './deal/DealDetailDialog';
import DealCardActions from './deal/DealCardActions';
import DealCardContent from './deal/DealCardContent';
import DealCardButton from './deal/DealCardButton';
import { useDealCardState } from './deal/hooks/useDealCardState';
import { useDealCardActions } from './deal/hooks/useDealCardActions';
import { Tag, PenSquare } from 'lucide-react';

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
  const navigate = useNavigate();
  
  const {
    isFavorite,
    setIsFavorite,
    localTitle,
    setLocalTitle,
    localDescription,
    setLocalDescription,
    localCategory,
    setLocalCategory,
  } = useDealCardState(title);

  const {
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
    handleShare,
  } = useDealCardActions(id, localTitle);

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

  const displayTitle = localTitle || title;
  const displayDescription = localDescription || description;
  const displayCategory = localCategory || category;

  return (
    <>
      <div
        className="group animate-fade-up hover-scale cursor-pointer h-[290px]"
        onClick={(e) => {
          if (e.ctrlKey || e.metaKey || e.button === 1) return;
          setIsOpen(true);
        }}>
        <div className="relative glass-effect rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] h-full flex flex-col border-gray-200 dark:border-gray-900 dark:bg-zinc-950">
          <DealCardActions
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
            onShare={handleShare}
            onDelete={onDelete ? handleDelete : undefined}
            onEdit={onDelete ? handleEdit : undefined}
            onCategoryEdit={onDelete ? handleOpenCategoryDialog : undefined}
            showAdminActions={!!onDelete}
          />

          <DealCardContent
            title={displayTitle}
            description={displayDescription}
            createdAt={createdAt}
          />

          <DealCardButton
            description={description}
            link={link}
            id={id}
            hasMultipleLinks={hasMultipleLinks}
          />
        </div>
      </div>

      {/* Dialogs */}
      <DealDetailDialog 
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title={displayTitle}
        description={displayDescription}
        id={id}
      />

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
        id={id || ''}
        initialText={description}
        onSuccess={handleEditSuccess}
      />

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
