
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Trash, Edit, Tag } from 'lucide-react';
import { handleTrackedLinkClick } from '../services/api';
import { format } from 'date-fns';
import DeleteConfirmDialog from './DeleteConfirmDialog';

interface DealCardProps {
  title: string;
  description: string;
  link: string;
  id: string;
  category?: string;
  createdAt?: string | Date;
  onDelete?: (id: string) => void;
  onEdit?: (id: string, newText: string) => void;
}

const DealCard = ({
  title,
  description,
  link,
  id,
  category,
  createdAt,
  onDelete,
  onEdit,
}: DealCardProps) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedText, setEditedText] = useState(description);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Extract first line as title and rest as description
  const firstLineBreak = description.indexOf('\n');
  const displayTitle = firstLineBreak > -1 ? description.substring(0, firstLineBreak) : title;
  const displayDescription = firstLineBreak > -1 ? description.substring(firstLineBreak + 1) : '';

  // Function to extract and format links
  const extractAndFormatLinks = (text: string) => {
    return text.split(/\s+/).map((word, index) => {
      if (word.match(/^(https?:\/\/[^\s]+)/)) {
        return (
          <a
            key={index}
            href={word}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              // Prevent default but still allow middle-click, etc
              if (!e.ctrlKey && !e.metaKey && e.button !== 1) {
                e.preventDefault();
              }
              handleTrackedLinkClick(word, id);
            }}
            className="text-blue-600 hover:underline"
          >
            {formatLinkDisplay(word)} <ExternalLink className="inline h-3 w-3" />
          </a>
        );
      }
      return <span key={index}>{word} </span>;
    });
  };

  // Function to format how links are displayed
  const formatLinkDisplay = (url: string) => {
    try {
      const { hostname } = new URL(url);
      return hostname;
    } catch {
      return url;
    }
  };

  // Format dates for display
  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (e) {
      return '';
    }
  };

  // Handle save in edit mode
  const handleSave = () => {
    if (onEdit) {
      onEdit(id, editedText);
    }
    setIsEditMode(false);
  };

  // Handle deletion
  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (onDelete) {
      onDelete(id);
    }
  };

  return (
    <>
      <Card className="h-full flex flex-col overflow-hidden hover:shadow-md transition-all duration-300">
        <CardContent className="p-4 flex flex-col h-full">
          {isEditMode ? (
            <div className="flex flex-col h-full">
              <textarea
                className="w-full h-full min-h-[200px] p-2 border rounded-md mb-4 text-sm"
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
              />
              <div className="flex gap-2 mt-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setEditedText(description);
                    setIsEditMode(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={handleSave}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-2">
                <h3 className="font-semibold text-md line-clamp-2">{displayTitle}</h3>
                <div className="text-sm text-apple-gray mt-2 space-y-2 flex-grow">
                  {extractAndFormatLinks(displayDescription)}
                </div>
              </div>

              <div className="flex flex-col mt-auto pt-4">
                {/* Date and category display */}
                <div className="flex items-center justify-between text-xs text-apple-gray mb-3">
                  {createdAt && <span>{formatDate(createdAt)}</span>}
                  {category && (
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {category}
                    </span>
                  )}
                </div>

                {/* Actions */}
                {(onDelete || onEdit) && (
                  <div className="flex gap-2 mt-2">
                    {onEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setIsEditMode(true)}
                      >
                        <Edit className="mr-1 h-4 w-4" />
                        Edit
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={handleDelete}
                      >
                        <Trash className="mr-1 h-4 w-4" />
                        Delete
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmDialog 
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Deal"
        description="This deal will be permanently removed. This action cannot be undone."
      />
    </>
  );
};

export default DealCard;
