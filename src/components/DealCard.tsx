
import React, { memo, useState } from 'react';
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
  imageUrl?: string;
  telegramFileId?: string;
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
  imageUrl,
  telegramFileId,
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

  // Dialog states (managed locally)
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditPasswordDialogOpen, setIsEditPasswordDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isCategoryPasswordDialogOpen, setIsCategoryPasswordDialogOpen] = useState(false);
  
  // Password states (managed locally)
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editError, setEditError] = useState('');
  const [categoryPassword, setCategoryPassword] = useState('');
  const [categoryError, setCategoryError] = useState('');

  const {
    isSaved,
    isSharing,
    handleToggleWishlist,
    handleShare,
  } = useDealCardActions({
    id,
    title: localTitle,
    description: localDescription,
    link,
    imageUrl,
    telegramFileId,
  });

  // Extract links for UI decision making
  const links = extractLinks(description);
  const hasMultipleLinks = links.length > 1;

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleToggleWishlist();
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
        className="group animate-fade-up hover-scale cursor-pointer h-[392px]"
        onClick={(e) => {
          if (e.ctrlKey || e.metaKey || e.button === 1) return;
          setIsOpen(true);
        }}>
        <div className="relative glass-effect rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] h-full flex flex-col border-gray-200 dark:border-gray-900 dark:bg-zinc-950">
          <DealCardActions
            isFavorite={isSaved}
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
            imageUrl={imageUrl}
            telegramFileId={telegramFileId}
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
        imageUrl={imageUrl}
        telegramFileId={telegramFileId}
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
