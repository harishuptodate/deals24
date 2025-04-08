
import React, { useState, useEffect } from 'react';
import { Heart, ExternalLink, Trash2, PenSquare, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { handleTrackedLinkClick, updateMessageText, updateMessageCategory, getAllCategories } from '../services/api';
import { useToast } from "@/components/ui/use-toast";
import { format } from 'date-fns';
import { isAuthenticated } from '../services/authService';

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

const DealCard = ({ 
  title, 
  description, 
  link, 
  id, 
  category, 
  createdAt, 
  onDelete, 
  onEdit, 
  onCategoryUpdate, 
  isAdmin = false 
}: DealCardProps) => {
  const { toast } = useToast();
  const [isFavorite, setIsFavorite] = useState(() => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    return favorites.some((fav: any) => fav.title === title);
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editedText, setEditedText] = useState(description);
  const [selectedCategory, setSelectedCategory] = useState(category || '');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  useEffect(() => {
    if (isCategoryDialogOpen) {
      fetchCategories();
    }
  }, [isCategoryDialogOpen]);

  const fetchCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const categories = await getAllCategories();
      setAvailableCategories(categories);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive"
      });
    } finally {
      setIsLoadingCategories(false);
    }
  };

  // Extract link from description if not provided
  const extractFirstLink = (text: string): string | null => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    return matches && matches.length > 0 ? matches[0] : null;
  };

  const extractLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };
  
  const links = extractLinks(description);
  const hasMultipleLinks = links.length > 1;

  const truncateLink = (url: string) => {
    try {
      const { hostname } = new URL(url);
      return hostname;
    } catch {
      return url;
    }
  };

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click event
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    let newFavorites;
  
    if (isFavorite) {
      newFavorites = favorites.filter((fav: any) => fav.title !== title);
    } else {
      newFavorites = [...favorites, { 
        title, 
        description, 
        link,
        id,
        timestamp: new Date().toISOString() 
      }];
    }
  
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
    setIsFavorite(!isFavorite);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click event
    if (id && onDelete) {
      setIsDeleteDialogOpen(true);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click event
    if (id) {
      setEditedText(description);
      setIsEditDialogOpen(true);
    }
  };

  const handleOpenCategoryDialog = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click event
    setIsCategoryDialogOpen(true);
  };

  const confirmDelete = () => {
    if (id && onDelete) {
      onDelete(id);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!id) return;
    
    setIsSubmitting(true);
    
    try {
      const success = await updateMessageText(id, editedText);
      if (success) {
        toast({
          title: "Success",
          description: "Deal was updated successfully",
        });
        setIsEditDialogOpen(false);
        if (onEdit) {
          onEdit(id, editedText);
        } else {
          // Refresh the page to see changes if no onEdit handler
          window.location.reload();
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to update deal",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while updating the deal",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!id) return;
    
    setIsSubmitting(true);
    
    try {
      const success = await updateMessageCategory(id, selectedCategory);
      if (success) {
        toast({
          title: "Success",
          description: "Category was updated successfully",
        });
        setIsCategoryDialogOpen(false);
        if (onCategoryUpdate) {
          onCategoryUpdate(id, selectedCategory);
        } else {
          // Refresh the page to see changes if no onCategoryUpdate handler
          window.location.reload();
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to update category",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while updating the category",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to make links in text clickable
  const makeLinksClickable = (text: string) => {
    if (!text) return '';
  
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
  
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={`link-${index}-${part.substring(0, 10)}`}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleTrackedLinkClick(part, id);
            }}
            className="text-blue-600 hover:underline break-all inline-flex items-center gap-1"
          >
            {truncateLink(part)}
            <ExternalLink size={12} />
          </a>
        );
      }
      return <span key={`text-${index}-${part.substring(0, 10)}`}>{part}</span>;
    });
  };

  // Format timestamp if available
  const formattedDate = createdAt ? format(new Date(createdAt), 'MMM d, h:mm a') : '';

  return (
    <>
      <div 
        className="group animate-fade-up hover-scale cursor-pointer h-[290px]" 
        onClick={() => setIsOpen(true)}
      >
        <div className="relative glass-effect rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] h-full flex flex-col">
          <div className="absolute top-4 right-4 flex gap-1 z-10">
            {onDelete && isAuthenticated() && (
              <>
                <button
                  onClick={handleOpenCategoryDialog}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  title="Change category"
                >
                  <Tag className="w-5 h-5 text-purple-500" />
                </button>
                <button
                  onClick={handleEdit}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  title="Edit deal"
                >
                  <PenSquare className="w-5 h-5 text-blue-500" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  title="Delete deal"
                >
                  <Trash2 className="w-5 h-5 text-red-500" />
                </button>
              </>
            )}
            <button
              onClick={toggleFavorite}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
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
                <span className="inline-block px-2 py-1 text-xs font-medium bg-gradient-to-r from-apple-lightGray to-white rounded-full text-apple-gray shadow-sm">
                  {formattedDate}
                </span>
              )}
              <h3 className="text-lg font-semibold text-apple-darkGray line-clamp-2">{title}</h3>
            </div>
          
            <div className="mt-1">
              <p className="text-sm text-apple-gray line-clamp-5 flex-grow">
                {description}
              </p>
            </div>

            <div className="mt-auto pt-2">
              {hasMultipleLinks ? (
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(true);
                  }}
                  className="w-full text-center px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-apple-darkGray to-black rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-apple-darkGray/20"
                >
                  View Deal Details
                </Button>
              ) : (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleTrackedLinkClick(link || extractFirstLink(description) || '', id);
                  }}
                  className="inline-block w-full text-center px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-apple-darkGray to-black rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-apple-darkGray/20"
                >
                  Buy Now
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto max-w-[90vw] w-[90vw] sm:w-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">{title}</DialogTitle>
          </DialogHeader>
        
          <div className="mt-4 text-sm whitespace-pre-line">
            {makeLinksClickable(description)}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this deal. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto max-w-[90vw] w-[90vw] sm:w-auto rounded-xl">
          <DialogHeader>
            <DialogTitle>Edit Deal</DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            <Textarea 
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              placeholder="Deal description"
              className="min-h-[200px]"
            />
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={isSubmitting || !editedText.trim()}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto max-w-[90vw] w-[90vw] sm:w-auto rounded-xl">
          <DialogHeader>
            <DialogTitle>Change Category</DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            <Select 
              value={selectedCategory}
              onValueChange={setSelectedCategory}
              disabled={isLoadingCategories}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingCategories ? (
                  <SelectItem value="loading" disabled>
                    Loading categories...
                  </SelectItem>
                ) : (
                  availableCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCategoryDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveCategory}
              disabled={isSubmitting || !selectedCategory.trim()}
            >
              {isSubmitting ? 'Saving...' : 'Save Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DealCard;
