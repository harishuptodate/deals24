
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface RemoveDealConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  dealTitle: string;
}

const RemoveDealConfirmDialog = ({
  isOpen,
  onOpenChange,
  onConfirm,
  dealTitle,
}: RemoveDealConfirmDialogProps) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[90vw] sm:max-w-md rounded-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Remove from Wishlist?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove "{dealTitle.substring(0, 50)}..." from your wishlist? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-500 hover:bg-red-600">
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RemoveDealConfirmDialog;
