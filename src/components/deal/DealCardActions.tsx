
import React from 'react';
import { Bell, Heart, Share2, Trash2, PenSquare, Tag } from 'lucide-react';
import { isAuthenticated } from '@/services/authService';

interface DealCardActionsProps {
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onShare: (e: React.MouseEvent) => void;
  onCreateAlert?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  onEdit?: (e: React.MouseEvent) => void;
  onCategoryEdit?: (e: React.MouseEvent) => void;
  showAdminActions?: boolean;
}

const DealCardActions = ({
  isFavorite,
  onToggleFavorite,
  onShare,
  onCreateAlert,
  onDelete,
  onEdit,
  onCategoryEdit,
  showAdminActions = false,
}: DealCardActionsProps) => {
  return (
    <div className="absolute top-3 right-3 flex items-center z-10">
      {isAuthenticated() && showAdminActions && onDelete && (
        <>
          <button
            onClick={onCategoryEdit}
            className="p-2 mt-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center"
            title="Change category">
            <Tag className="w-4 h-4 text-purple-500" />
          </button>
          <button
            onClick={onEdit}
            className="p-2 mt-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center"
            title="Edit deal">
            <PenSquare className="w-4 h-4 text-blue-500" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 mt-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center"
            title="Delete deal">
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </>
      )}
      <button
        onClick={onShare}
        className="mt-2 flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
        title="Share deal">
        <Share2 className="w-4 h-4 text-blue-500" />
      </button>
      <button
        onClick={onToggleFavorite}
        className="mt-2 flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
        <Heart
          className={`w-4 h-4 transition-colors ${
            isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'
          }`}
        />
      </button>
      {onCreateAlert && (
        <button
          onClick={onCreateAlert}
          className="mt-2 flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-violet-100 dark:hover:bg-violet-950/50"
          title="Create deal alert">
          <Bell className="h-4 w-4 text-violet-500" />
        </button>
      )}
    </div>
  );
};

export default DealCardActions;
