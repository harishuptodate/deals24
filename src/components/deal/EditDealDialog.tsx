
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { updateMessageText } from '../../services/api';
import { useToast } from '@/components/ui/use-toast';

interface EditDealDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  id: string;
  initialText: string;
  onSuccess: (id: string, newText: string) => void;
}

const EditDealDialog = ({
  isOpen,
  onOpenChange,
  id,
  initialText,
  onSuccess,
}: EditDealDialogProps) => {
  const { toast } = useToast();
  const [editedText, setEditedText] = useState(initialText);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setIsSubmitting(true);

    try {
      const success = await updateMessageText(id, editedText);
      if (success) {
        toast({
          title: 'Success',
          description: 'Deal was updated successfully',
        });
        onOpenChange(false);
        onSuccess(id, editedText);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update deal',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while updating the deal',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto max-w-[90vw] w-[90vw] sm:w-auto rounded-xl">
        <DialogHeader>
          <DialogTitle>Edit Deal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSaveEdit}>
          <div className="mt-4">
            <Textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              placeholder="Deal description"
              className="min-h-[200px]"
            />
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !editedText.trim()}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditDealDialog;
