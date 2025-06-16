import React from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { X } from 'lucide-react';

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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-md rounded-xl">

        {/* Close button top-right */}
        <DialogClose asChild>
          <button
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-white"
            aria-label="Close"
          >
          </button>
        </DialogClose>

        <DialogHeader>
          <DialogTitle>Remove from Wishlist?</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove this from your wishlist? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose asChild>
            <button className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
              Cancel
            </button>
          </DialogClose>
          <button
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className="px-4 py-2 rounded-md bg-red-500 hover:bg-red-600 text-white"
          >
            Remove
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RemoveDealConfirmDialog;
