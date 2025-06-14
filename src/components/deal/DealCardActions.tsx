
import React from 'react';
import { Heart, Share2, Trash2, PenSquare, Tag } from 'lucide-react';

interface DealCardActionsProps {
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onShare: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  onEdit?: (e: React.MouseEvent) => void;
  onCategoryEdit?: (e: React.MouseEvent) => void;
  showAdminActions?: boolean;
}

const DealCardActions = ({
  isFavorite,
  onToggleFavorite,
  onShare,
  onDelete,
  onEdit,
  onCategoryEdit,
  showAdminActions = false,
}: DealCardActionsProps) => {
  return (
    <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
      {showAdminActions && onDelete && (
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
        className="p-2 mt-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center"
        title="Share deal">
        <Share2 className="w-4 h-4 text-blue-500" />
      </button>
      <button
        onClick={onToggleFavorite}
        className="p-2 mt-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center"
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
        <Heart
          className={`w-4 h-4 transition-colors ${
            isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'
          }`}
        />
      </button>
    </div>
  );
};

export default DealCardActions;
